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
  imports: string[];
}

export class DtoGenerator {
  private templateLoader: TemplateLoader;

  constructor(templateDir?: string) {
    this.templateLoader = new TemplateLoader(templateDir);
  }

  async generateDto(dtoName: string, schema: any, spec: OpenAPISpec): Promise<string> {
    const template = await this.templateLoader.loadTemplate('dto');

    // Get the original schema with $ref intact if available
    const originalSpec = (spec as any)._originalSpec;
    const originalSchema = originalSpec ? this.findOriginalSchema(dtoName, originalSpec) : schema;

    const mainDtoSchema = this.processSchema(dtoName, originalSchema || schema, spec);

    // Collect all referenced DTOs and order them properly
    const allDtos = this.collectAndOrderAllDtos(mainDtoSchema, spec);

    // Collect enums from all schemas
    const allEnums = new Set<{ name: string, values: Array<{ key: string, value: string }> }>();
    const enumNames = new Set<string>();

    // Collect enums from the main schema
    const mainEnums = this.collectEnumsForTemplate(schema, spec);
    mainEnums.forEach(enumDef => {
      if (!enumNames.has(enumDef.name)) {
        enumNames.add(enumDef.name);
        allEnums.add(enumDef);
      }
    });

    // Collect enums from referenced schemas
    for (const dto of allDtos) {
      if (dto.name !== dtoName) { // Skip main DTO as we already processed it
        const refSchemaName = dto.name.replace(/Dto$/, '');
        const refSchema = spec.components?.schemas?.[refSchemaName];
        if (refSchema) {
          const refEnums = this.collectEnumsForTemplate(refSchema, spec);
          refEnums.forEach(enumDef => {
            if (!enumNames.has(enumDef.name)) {
              enumNames.add(enumDef.name);
              allEnums.add(enumDef);
            }
          });
        }
      }
    }

    return template({
      schemas: allDtos,
      enums: Array.from(allEnums)
    });
  }

  async generateAllDtos(schemas: { [key: string]: any }, spec: OpenAPISpec): Promise<string> {
    const template = await this.templateLoader.loadTemplate('dto');

    const allDtos = new Map<string, DtoSchema>();
    const dependencies = new Map<string, Set<string>>();
    const nestedDtoSchemas = new Map<string, any>(); // Store schemas for nested DTOs
    const allEnums: Array<{ name: string, values: Array<{ key: string, value: string }> }> = [];
    const enumNames = new Set<string>();

    // Get the original spec with $ref intact if available
    const originalSpec = (spec as any)._originalSpec;
    const originalSchemas = originalSpec?.components?.schemas || schemas;

    // First pass: generate all main DTOs and collect nested DTO schemas
    for (const [schemaName, schema] of Object.entries(schemas)) {
      const dtoName = `${schemaName}Dto`;

      // Use original schema with $ref intact if available
      const originalSchema = originalSchemas[schemaName] || schema;
      const dtoSchema = this.processSchema(dtoName, originalSchema, spec);

      allDtos.set(dtoName, dtoSchema);
      dependencies.set(dtoName, new Set(dtoSchema.imports));

      // Collect nested DTO schemas
      this.collectNestedDtoSchemas(originalSchema, nestedDtoSchemas, spec, dtoName);

      // Collect enums from the resolved schema (not original to avoid $ref issues)
      const schemaEnums = this.collectEnumsForTemplate(schema, spec);
      schemaEnums.forEach(enumDef => {
        if (!enumNames.has(enumDef.name)) {
          enumNames.add(enumDef.name);
          allEnums.push(enumDef);
        }
      });
    }

    // Second pass: generate nested DTOs
    for (const [nestedDtoName, nestedSchema] of nestedDtoSchemas.entries()) {
      if (!allDtos.has(nestedDtoName)) {
        const dtoSchema = this.processSchema(nestedDtoName, nestedSchema, spec);
        allDtos.set(nestedDtoName, dtoSchema);
        dependencies.set(nestedDtoName, new Set(dtoSchema.imports));

        // Collect enums from nested schemas
        const nestedEnums = this.collectEnumsForTemplate(nestedSchema, spec);
        nestedEnums.forEach(enumDef => {
          if (!enumNames.has(enumDef.name)) {
            enumNames.add(enumDef.name);
            allEnums.push(enumDef);
          }
        });
      }
    }

    // Topological sort to resolve dependency order
    const sorted = this.topologicalSort(dependencies);

    // Return DTOs in dependency order
    const orderedDtos = sorted.map(dtoName => allDtos.get(dtoName)).filter(Boolean) as DtoSchema[];

    return template({
      schemas: orderedDtos,
      enums: allEnums
    });
  }

  private processSchema(dtoName: string, schema: any, spec: OpenAPISpec): DtoSchema {
    const properties: DtoProperty[] = [];
    const imports = new Set<string>();
    const required = schema.required || [];

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const property = this.processProperty(
          propName,
          propSchema as any,
          required.includes(propName),
          spec,
          imports,
          dtoName
        );
        properties.push(property);
      }
    }

    return {
      name: dtoName,
      properties,
      imports: Array.from(imports)
    };
  }

  private processProperty(name: string, schema: any, isRequired: boolean, spec: OpenAPISpec, imports: Set<string>, currentDtoName?: string): DtoProperty {
    const decorators: string[] = [];
    let type = this.getTypeScriptType(schema, spec, imports, currentDtoName);

    // Handle nested objects with properties
    if (schema.type === 'object' && schema.properties && !schema.$ref) {
      // First, check if this matches an existing schema exactly
      const matchingDtoName = this.findMatchingExistingDto(schema, spec);
      if (matchingDtoName) {
        type = matchingDtoName;
        imports.add(matchingDtoName);
      } else {
        // Create inline DTO type: ParentTypeFieldDto
        const parentTypeName = currentDtoName?.replace(/Dto$/, '') || 'Unknown';
        const fieldName = name.charAt(0).toUpperCase() + name.slice(1);
        const inlineDtoName = `${parentTypeName}${fieldName}Dto`;
        type = inlineDtoName;
        imports.add(inlineDtoName);
      }
    }

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
        let itemType = this.getTypeScriptType(schema.items, spec, imports, currentDtoName);

        // Check if array items match an existing DTO
        if (schema.items.type === 'object' && schema.items.properties && !schema.items.$ref) {
          const matchingDtoName = this.findMatchingExistingDto(schema.items, spec);
          if (matchingDtoName) {
            itemType = matchingDtoName;
            imports.add(matchingDtoName);
          } else {
            // Create inline DTO type for array items: ParentTypeFieldItemDto
            const parentTypeName = currentDtoName?.replace(/Dto$/, '') || 'Unknown';
            const fieldName = name.charAt(0).toUpperCase() + name.slice(1);
            const inlineDtoName = `${parentTypeName}${fieldName}ItemDto`;
            itemType = inlineDtoName;
            imports.add(inlineDtoName);
          }

          // Update the main type to use the correct array type
          type = `${itemType}[]`;
        }

        if (schema.items.$ref || (schema.items.type === 'object' && schema.items.properties)) {
          decorators.push('@ValidateNested({ each: true })');
          const typeReference = (schema.items.$ref && itemType !== 'any') || itemType.endsWith('Dto') ? itemType : 'Object';
          decorators.push(`@Type(() => ${typeReference})`);
        }
      }
    } else if (schema.$ref) {
      decorators.push('@ValidateNested()');
      const typeReference = type !== 'any' ? type : 'Object';
      decorators.push(`@Type(() => ${typeReference})`);
    } else if (schema.type === 'object' && schema.properties) {
      decorators.push('@ValidateNested()');
      // Use the proper DTO type if we determined it should be one
      const typeReference = type.endsWith('Dto') ? type : 'Object';
      decorators.push(`@Type(() => ${typeReference})`);
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
        const itemType = this.getTypeScriptType(schema.items, spec, imports, currentDtoName);
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

  private getTypeScriptType(schema: any, spec?: OpenAPISpec, imports?: Set<string>, currentDtoName?: string): string {
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      const dtoName = `${refName}Dto`;

      // Check for circular reference - if the referenced DTO is the same as current, use 'any'
      if (currentDtoName && dtoName === currentDtoName) {
        return 'any';
      }

      // Add import for referenced DTO if imports set is provided
      if (imports) {
        imports.add(dtoName);
      }

      return dtoName;
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
          let itemType = this.getTypeScriptType(schema.items, spec, imports, currentDtoName);

          // Check if array items match an existing DTO
          if (schema.items.type === 'object' && schema.items.properties && !schema.items.$ref && imports && spec) {
            const matchingDtoName = this.findMatchingExistingDto(schema.items, spec);
            if (matchingDtoName) {
              itemType = matchingDtoName;
              imports.add(matchingDtoName);
            } else {
              // For getTypeScriptType, we can't determine the parent name, so use a generic approach
              // This will be handled properly in processProperty
              itemType = 'object';
            }
          }

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

  private resolveSchemaReference(ref: string, spec: OpenAPISpec): any {
    // Handle #/components/schemas/SchemaName format
    if (ref.startsWith('#/components/schemas/')) {
      const schemaName = ref.replace('#/components/schemas/', '');
      return spec.components?.schemas?.[schemaName];
    }

    // Handle other reference formats if needed
    return null;
  }

  private findOriginalSchema(dtoName: string, originalSpec: OpenAPISpec): any {
    // Extract schema name from DTO name (remove 'Dto' suffix)
    const schemaName = dtoName.replace(/Dto$/, '');
    return originalSpec.components?.schemas?.[schemaName];
  }

  private findMatchingExistingDto(schema: any, spec: OpenAPISpec): string | null {
    // Check if this nested object matches an existing schema in the spec
    const schemas = spec.components?.schemas || {};

    for (const [schemaName, schemaDefinition] of Object.entries(schemas)) {
      if (this.schemasMatch(schema, schemaDefinition)) {
        return `${schemaName}Dto`;
      }
    }

    return null;
  }

  private schemasMatch(schema1: any, schema2: any): boolean {
    // Simple comparison - check if they have the same required fields and property names
    if (!schema1.properties || !schema2.properties) {
      return false;
    }

    const props1 = Object.keys(schema1.properties).sort();
    const props2 = Object.keys(schema2.properties).sort();

    if (props1.length !== props2.length) {
      return false;
    }

    return props1.every((prop, index) => prop === props2[index]);
  }



  private collectNestedDtoSchemas(schema: any, nestedDtoSchemas: Map<string, any>, spec: OpenAPISpec, parentDtoName?: string): void {
    if (!schema.properties) {
      return;
    }

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any;

      // Handle nested objects that should become DTOs
      if (prop.type === 'object' && prop.properties && !prop.$ref) {
        const matchingDtoName = this.findMatchingExistingDto(prop, spec);
        if (!matchingDtoName) {
          // Create inline DTO type: ParentTypeFieldDto
          const parentTypeName = parentDtoName?.replace(/Dto$/, '') || 'Unknown';
          const fieldName = propName.charAt(0).toUpperCase() + propName.slice(1);
          const inlineDtoName = `${parentTypeName}${fieldName}Dto`;
          nestedDtoSchemas.set(inlineDtoName, prop);

          // Recursively collect nested DTOs from this nested object
          this.collectNestedDtoSchemas(prop, nestedDtoSchemas, spec, inlineDtoName);
        }
      }

      // Handle arrays with nested objects
      if (prop.type === 'array' && prop.items && prop.items.type === 'object' && prop.items.properties && !prop.items.$ref) {
        const matchingDtoName = this.findMatchingExistingDto(prop.items, spec);
        if (!matchingDtoName) {
          // Create inline DTO type for array items: ParentTypeFieldItemDto
          const parentTypeName = parentDtoName?.replace(/Dto$/, '') || 'Unknown';
          const fieldName = propName.charAt(0).toUpperCase() + propName.slice(1);
          const inlineDtoName = `${parentTypeName}${fieldName}ItemDto`;
          nestedDtoSchemas.set(inlineDtoName, prop.items);

          // Recursively collect nested DTOs from array items
          this.collectNestedDtoSchemas(prop.items, nestedDtoSchemas, spec, inlineDtoName);
        }
      }
    }
  }

  private collectAndOrderAllDtos(mainDto: DtoSchema, spec: OpenAPISpec): DtoSchema[] {
    const allDtos = new Map<string, DtoSchema>();
    const dependencies = new Map<string, Set<string>>();
    const originalSpec = (spec as any)._originalSpec;

    // Add the main DTO
    allDtos.set(mainDto.name, mainDto);
    dependencies.set(mainDto.name, new Set(mainDto.imports));

    // Collect all referenced DTOs recursively
    const collectDto = (dtoName: string, visited = new Set<string>()): void => {
      if (allDtos.has(dtoName) || visited.has(dtoName)) {
        return;
      }
      visited.add(dtoName);

      const schemaName = dtoName.replace(/Dto$/, '');
      const originalSchema = originalSpec?.components?.schemas?.[schemaName];
      const resolvedSchema = spec.components?.schemas?.[schemaName];

      if (originalSchema && resolvedSchema) {
        const dtoSchema = this.processSchema(dtoName, originalSchema, spec);
        allDtos.set(dtoName, dtoSchema);
        dependencies.set(dtoName, new Set(dtoSchema.imports));

        // Recursively collect dependencies
        for (const dep of dtoSchema.imports) {
          collectDto(dep, visited);
        }
      }
    };

    // Start collection from the main DTO's imports
    for (const importName of mainDto.imports) {
      collectDto(importName);
    }

    // Topological sort to resolve dependency order
    const sorted = this.topologicalSort(dependencies);

    // Return DTOs in dependency order (dependencies first, then main DTO last)
    return sorted.map(dtoName => allDtos.get(dtoName)).filter(Boolean) as DtoSchema[];
  }

  private topologicalSort(dependencies: Map<string, Set<string>>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: string): void => {
      if (visiting.has(node)) {
        // Circular dependency detected - we'll handle this by continuing
        return;
      }
      if (visited.has(node)) {
        return;
      }

      visiting.add(node);
      const deps = dependencies.get(node) || new Set();

      for (const dep of deps) {
        if (dependencies.has(dep)) {
          visit(dep);
        }
      }

      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const node of dependencies.keys()) {
      visit(node);
    }

    return result;
  }

  private collectEnumsForTemplate(schema: any, spec: OpenAPISpec, visited = new Set<any>()): Array<{ name: string, values: Array<{ key: string, value: string }> }> {
    const enums: Array<{ name: string, values: Array<{ key: string, value: string }> }> = [];
    const enumNames = new Set<string>();

    // Prevent infinite recursion by tracking visited schemas
    if (visited.has(schema)) {
      return enums;
    }
    visited.add(schema);

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

        // Recursively check nested objects (but not $ref to avoid infinite recursion)
        if (prop.type === 'object' && prop.properties && !visited.has(prop)) {
          const nestedEnums = this.collectEnumsForTemplate(prop, spec, visited);
          nestedEnums.forEach(nestedEnum => {
            if (!enumNames.has(nestedEnum.name)) {
              enumNames.add(nestedEnum.name);
              enums.push(nestedEnum);
            }
          });
        }

        if (prop.type === 'array' && prop.items && prop.items.type === 'object' && prop.items.properties && !visited.has(prop.items)) {
          const arrayEnums = this.collectEnumsForTemplate(prop.items, spec, visited);
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