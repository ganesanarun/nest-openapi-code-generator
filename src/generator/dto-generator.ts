import { OpenAPISpec } from '../types/openapi';
import { TemplateLoader } from '../utils/template-loader';

interface DtoProperty {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  decorators: string[];
}

interface DtoSchema {
  name: string;
  properties: DtoProperty[];
}

export class DtoGenerator {
  private templateLoader: TemplateLoader;

  constructor(templateDir?: string) {
    this.templateLoader = new TemplateLoader(templateDir);
  }

  async generateDto(dtoName: string, schema: any, spec: OpenAPISpec): Promise<string> {
    const template = await this.templateLoader.loadTemplate('dto');

    const dtoSchema = this.processSchema(dtoName, schema, spec);

    // Collect enums from this schema
    const enums = this.collectEnumsForTemplate(schema);

    return template({
      schemas: [dtoSchema],
      enums: enums
    });
  }

  async generateAllDtos(schemas: { [key: string]: any }, spec: OpenAPISpec): Promise<string> {
    const template = await this.templateLoader.loadTemplate('dto');

    const dtoSchemas: DtoSchema[] = [];
    const allEnums: Array<{ name: string, values: Array<{ key: string, value: string }> }> = [];
    const enumNames = new Set<string>();

    // First pass: collect all enums and generate DTOs
    for (const [schemaName, schema] of Object.entries(schemas)) {
      const dtoName = `${schemaName}Dto`;
      const dtoSchema = this.processSchema(dtoName, schema, spec);
      dtoSchemas.push(dtoSchema);

      // Collect enums from this schema
      const schemaEnums = this.collectEnumsForTemplate(schema);
      schemaEnums.forEach(enumDef => {
        if (!enumNames.has(enumDef.name)) {
          enumNames.add(enumDef.name);
          allEnums.push(enumDef);
        }
      });
    }

    return template({
      schemas: dtoSchemas,
      enums: allEnums
    });
  }

  private processSchema(dtoName: string, schema: any, spec: OpenAPISpec): DtoSchema {
    const properties: DtoProperty[] = [];
    const required = schema.required || [];

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const property = this.processProperty(
          propName,
          propSchema as any,
          required.includes(propName),
          spec
        );
        properties.push(property);
      }
    }

    return {
      name: dtoName,
      properties
    };
  }

  private processProperty(name: string, schema: any, isRequired: boolean, spec: OpenAPISpec): DtoProperty {
    const decorators: string[] = [];
    let type = this.getTypeScriptType(schema);

    // Add validation decorators
    if (!isRequired) {
      decorators.push('@IsOptional()');
    }

    // Type-specific decorators
    if (schema.type === 'string') {
      decorators.push('@IsString()');

      if (schema.format === 'email') {
        decorators.push('@IsEmail()');
      }

      if (schema.enum) {
        const enumName = this.getEnumName(name, schema.enum);
        decorators.push(`@IsEnum(${enumName})`);
      }

      if (schema.minLength !== undefined) {
        decorators.push(`@MinLength(${schema.minLength})`);
      }

      if (schema.maxLength !== undefined) {
        decorators.push(`@MaxLength(${schema.maxLength})`);
      }

      if (schema.pattern) {
        decorators.push(`@Matches(/${schema.pattern}/)`);
      }
    } else if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.type === 'integer') {
        decorators.push('@IsInt()');
      } else {
        decorators.push('@IsNumber()');
      }

      if (schema.minimum !== undefined) {
        decorators.push(`@Min(${schema.minimum})`);
      }

      if (schema.maximum !== undefined) {
        decorators.push(`@Max(${schema.maximum})`);
      }
    } else if (schema.type === 'boolean') {
      decorators.push('@IsBoolean()');
    } else if (schema.type === 'array') {
      decorators.push('@IsArray()');

      if (schema.items) {
        const itemType = this.getTypeScriptType(schema.items);
        if (schema.items.$ref || (schema.items.type === 'object' && schema.items.properties)) {
          decorators.push('@ValidateNested({ each: true })');
          const typeReference = schema.items.$ref ? itemType : 'Object';
          decorators.push(`@Type(() => ${typeReference})`);
        }
      }
    } else if (schema.$ref) {
      decorators.push('@ValidateNested()');
      decorators.push(`@Type(() => ${type})`);
    } else if (schema.type === 'object' && schema.properties) {
      decorators.push('@ValidateNested()');
      decorators.push(`@Type(() => Object)`);
    }

    // Add ApiProperty decorator
    const apiPropertyOptions: string[] = [];

    if (schema.description) {
      apiPropertyOptions.push(`description: '${schema.description.replace(/'/g, "\\'")}'`);
    }

    if (schema.example !== undefined) {
      const exampleValue = typeof schema.example === 'string'
        ? `"${schema.example.replace(/"/g, '\\"')}"`
        : JSON.stringify(schema.example);
      apiPropertyOptions.push(`example: ${exampleValue}`);
    }

    if (!isRequired) {
      apiPropertyOptions.push('required: false');
    }

    if (schema.enum) {
      const enumArray = schema.enum.map((value: string) => `'${value}'`).join(', ');
      apiPropertyOptions.push(`enum: [${enumArray}]`);
    }

    if (schema.type === 'array') {
      apiPropertyOptions.push('isArray: true');
      if (schema.items) {
        const itemType = this.getTypeScriptType(schema.items);
        const apiPropertyType = this.getApiPropertyType(itemType);
        apiPropertyOptions.push(`type: () => ${apiPropertyType}`);
      }
    }

    const apiPropertyContent = apiPropertyOptions.length > 0
      ? `{ ${apiPropertyOptions.join(', ')} }`
      : '';

    decorators.push(`@ApiProperty(${apiPropertyContent})`);

    return {
      name: isRequired ? name : `${name}?`,
      type: type,
      required: isRequired,
      description: schema.description,
      decorators
    };
  }

  private getTypeScriptType(schema: any): string {
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return `${refName}Dto`;
    }

    switch (schema.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        if (schema.items) {
          const itemType = this.getTypeScriptType(schema.items);
          return `${itemType}[]`;
        }
        return 'any[]';
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  }



  private getEnumName(propertyName: string, enumValues: string[]): string {
    // Create enum name based on property name
    const baseName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
    return `${baseName}Enum`;
  }

  private getApiPropertyType(tsType: string): string {
    // Convert TypeScript types to their constructor equivalents for @ApiProperty
    if (tsType.endsWith('[]')) {
      const baseType = tsType.slice(0, -2);
      return this.getApiPropertyType(baseType);
    }

    switch (tsType) {
      case 'string':
        return 'String';
      case 'number':
        return 'Number';
      case 'boolean':
        return 'Boolean';
      case 'object':
        return 'Object';
      case 'any':
        return 'Object';
      default:
        // For DTO types like UserDto, keep as is
        return tsType;
    }
  }

  private collectEnumsForTemplate(schema: any): Array<{ name: string, values: Array<{ key: string, value: string }> }> {
    const enums: Array<{ name: string, values: Array<{ key: string, value: string }> }> = [];
    const enumNames = new Set<string>();

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const prop = propSchema as any;
        if (prop.enum && prop.type === 'string') {
          const enumName = this.getEnumName(propName, prop.enum);

          if (!enumNames.has(enumName)) {
            enumNames.add(enumName);
            const enumValues = prop.enum.map((value: string) => ({
              key: value.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
              value: value
            }));

            enums.push({
              name: enumName,
              values: enumValues
            });
          }
        }

        // Recursively check nested objects
        if (prop.type === 'object' && prop.properties) {
          const nestedEnums = this.collectEnumsForTemplate(prop);
          nestedEnums.forEach(nestedEnum => {
            if (!enumNames.has(nestedEnum.name)) {
              enumNames.add(nestedEnum.name);
              enums.push(nestedEnum);
            }
          });
        }

        if (prop.type === 'array' && prop.items) {
          const arrayEnums = this.collectEnumsForTemplate({ properties: { item: prop.items } });
          arrayEnums.forEach(arrayEnum => {
            if (!enumNames.has(arrayEnum.name)) {
              enumNames.add(arrayEnum.name);
              enums.push(arrayEnum);
            }
          });
        }
      }
    }

    return enums;
  }
}