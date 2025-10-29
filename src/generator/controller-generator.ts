import { OpenAPISpec, PathItem, Operation } from '../types/openapi';
import { TemplateLoader } from '../utils/template-loader';

interface ControllerMethod {
  httpMethod: string;
  methodName: string;
  path: string;
  summary?: string;
  tags: string[];
  parameters: MethodParameter[];
  bodyParam?: BodyParameter;
  responses: MethodResponse[];
  decorators: string[];
}

interface MethodParameter {
  name: string;
  type: string;
  decorator: string;
  validationType?: string;
  required?: boolean;
}

interface BodyParameter {
  type: string;
  decorator: string;
}

interface MethodResponse {
  status: number;
  type: string;
  description: string;
}

export class ControllerGenerator {
  private templateLoader: TemplateLoader;

  constructor(templateDir?: string) {
    this.templateLoader = new TemplateLoader(templateDir);
  }

  async generateController(
    resourceName: string,
    paths: { [path: string]: PathItem },
    spec: OpenAPISpec
  ): Promise<string> {
    const methods = this.extractMethods(paths, spec, resourceName);
    const tags = this.extractTags(methods);

    const template = await this.templateLoader.loadTemplate('controller');
    const dtoImports = this.extractDtoImports(methods);

    return template({
      basePath: resourceName.toLowerCase(),
      className: this.capitalize(resourceName) + 'Controller',
      resourceName: resourceName.toLowerCase(),
      tags,
      methods: methods.map(m => ({
        ...m,
        returnType: this.getReturnType(m),
        hasParams: m.parameters.length > 0 || !!m.bodyParam
      })),
      dtoImports: dtoImports.join(', ')
    });
  }

  private extractMethods(
    paths: { [path: string]: PathItem }, 
    spec: OpenAPISpec,
    resourceName: string
  ): ControllerMethod[] {
    const methods: ControllerMethod[] = [];
    // Use plural form for basePath matching
    const basePath = `/${resourceName.toLowerCase()}s`;

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
      
      for (const method of httpMethods) {
        const operation = pathItem[method] as Operation;
        if (!operation) continue;

        const controllerMethod = this.processOperation(
          method,
          pathStr,
          operation,
          spec,
          basePath
        );
        methods.push(controllerMethod);
      }
    }

    return methods;
  }

  private processOperation(
    httpMethod: string,
    path: string,
    operation: Operation,
    spec: OpenAPISpec,
    basePath: string
  ): ControllerMethod {
    const methodName = operation.operationId || this.generateMethodName(httpMethod, path);
    const parameters = this.processParameters(operation.parameters || []);
    const originalSpec = (spec as any)._originalSpec;
    const bodyParam = this.processRequestBody(operation.requestBody, operation.operationId, originalSpec);
    const responses = this.processResponses(operation.responses, operation.operationId, originalSpec);
    const decorators = this.buildDecorators(operation, parameters, responses);

    let relativePath = '';
    if (path.startsWith(basePath)) {
      relativePath = path.substring(basePath.length);
    } else {
      // If path doesn't start with basePath, use the full path
      relativePath = path;
    }

    return {
      httpMethod: this.capitalize(httpMethod),
      methodName,
      path: relativePath,
      summary: operation.summary,
      tags: operation.tags || [],
      parameters,
      bodyParam,
      responses,
      decorators
    };
  }

  private processParameters(parameters: any[]): MethodParameter[] {
    return parameters.map(param => {
      const decoratorType = param.in === 'path' ? 'Param' : this.capitalize(param.in);
      const type = this.getParamType(param.schema);
      const isRequired = param.required === true || param.in === 'path';
      const nameWithOptional = isRequired ? param.name : `${param.name}?`;
      
      return {
        name: nameWithOptional,
        type: type,
        decorator: `@${decoratorType}('${param.name}')`,
        validationType: type,
        required: isRequired
      };
    });
  }

  private processRequestBody(requestBody?: any, operationId?: string, originalSpec?: any): BodyParameter | undefined {
    if (!requestBody || !requestBody.content) return undefined;

    const content = requestBody.content['application/json'];
    if (!content || !content.schema) return undefined;

    // Try to find the original reference in the unresolved spec
    let originalRef: string | undefined;
    if (originalSpec && operationId) {
      originalRef = this.findOriginalSchemaRef(originalSpec, operationId, 'requestBody');
    }

    let type = this.getSchemaType(content.schema, originalRef);
    
    // If it's still 'any', leave it as 'any' - we should only use actual schema names
    
    return {
      type,
      decorator: '@Body()'
    };
  }

  private processResponses(responses: any, operationId?: string, originalSpec?: any): MethodResponse[] {
    return Object.entries(responses).map(([status, response]: [string, any]) => {
      const content = response.content?.['application/json'];
      let type = 'void';
      
      if (content && content.schema) {
        // Try to find the original reference in the unresolved spec
        let originalRef: string | undefined;
        if (originalSpec && operationId) {
          originalRef = this.findOriginalSchemaRef(originalSpec, operationId, 'response', status);
        }

        type = this.getSchemaType(content.schema, originalRef);
        
        // If it's still 'any', leave it as 'any' - we should only use actual schema names
        // For error responses without content, we'll leave them as 'void'
      }
      
      return {
        status: parseInt(status),
        type,
        description: response.description
      };
    });
  }

  private buildDecorators(
    operation: Operation,
    parameters: MethodParameter[],
    responses: MethodResponse[]
  ): string[] {
    const decorators: string[] = [];

    if (operation.summary) {
      decorators.push(`@ApiOperation({ summary: '${operation.summary}' })`);
    }

    parameters
      .filter(p => p.decorator.includes('@Param'))
      .forEach(p => {
        const cleanType = p.type.replace('?', '');
        const typeClass = this.getTypeClass(cleanType);
        decorators.push(`@ApiParam({ name: '${p.name}', type: ${typeClass} })`);
      });

    parameters
      .filter(p => p.decorator.includes('@Query'))
      .forEach(p => {
        const cleanType = p.type.replace('?', '');
        const typeClass = this.getTypeClass(cleanType);
        const cleanName = p.name.replace('?', '');
        const isRequired = p.required === true;
        decorators.push(`@ApiQuery({ name: '${cleanName}', type: ${typeClass}, required: ${isRequired} })`);
      });

    responses.forEach(r => {
      const options = r.type !== 'void' && r.type !== 'any' && r.status !== 204
        ? `{ status: ${r.status}, type: ${r.type} }` 
        : `{ status: ${r.status} }`;
      decorators.push(`@ApiResponse(${options})`);
    });

    const successResponse = responses.find(r => r.status >= 200 && r.status < 300);
    if (successResponse && successResponse.status !== 200 && successResponse.status !== 201) {
      decorators.push(`@HttpCode(${successResponse.status})`);
    }

    return decorators;
  }

  private getParamType(schema: any): string {
    if (!schema) return 'string';
    const type = schema.type || 'string';
    return type === 'integer' ? 'number' : type;
  }

  private getSchemaType(schema: any, originalRef?: string): string {
    // If we have the original reference, use that
    if (originalRef) {
      const refName = originalRef.split('/').pop();
      return `${refName}Dto`;
    }
    
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return `${refName}Dto`;
    }
    
    if (schema.type === 'array') {
      // Handle array responses
      if (schema.items) {
        if (schema.items.$ref) {
          const refName = schema.items.$ref.split('/').pop();
          return `${refName}Dto[]`;
        }
        // For inline array items, we'll still return 'any' for now
        return 'any[]';
      }
      return 'any[]';
    }
    
    if (schema.type === 'object' && schema.properties) {
      // For inline objects, we could generate a type name based on context
      return 'any';
    }
    
    return 'any';
  }

  private getReturnType(method: ControllerMethod): string {
    const successResponse = method.responses.find(r => r.status >= 200 && r.status < 300);
    return successResponse?.type || 'void';
  }

  private generateMethodName(httpMethod: string, path: string): string {
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const resource = lastSegment.replace(/[{}]/g, '');
    return `${httpMethod}${this.capitalize(resource)}`;
  }

  private extractTags(methods: ControllerMethod[]): string[] {
    const tags = new Set<string>();
    methods.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }

  private extractDtoImports(methods: ControllerMethod[]): string[] {
    const dtos = new Set<string>();
    methods.forEach(m => {
      if (m.bodyParam) {
        dtos.add(m.bodyParam.type);
      }
      m.responses.forEach(r => {
        if (r.type !== 'void' && r.type !== 'any') {
          dtos.add(r.type);
        }
      });
    });
    return Array.from(dtos);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getTypeClass(type: string): string {
    switch (type) {
      case 'string':
        return 'String';
      case 'number':
        return 'Number';
      case 'boolean':
        return 'Boolean';
      default:
        return type;
    }
  }



  private findOriginalSchemaRef(originalSpec: any, operationId: string, type: 'requestBody' | 'response', status?: string): string | undefined {
    if (!originalSpec || !originalSpec.paths) return undefined;

    // Find the operation in the original spec
    for (const [, pathItem] of Object.entries(originalSpec.paths)) {
      for (const [, operation] of Object.entries(pathItem as any)) {
        if (operation && typeof operation === 'object' && (operation as any).operationId === operationId) {
          const op = operation as any;
          if (type === 'requestBody' && op.requestBody) {
            const content = op.requestBody.content?.['application/json'];
            if (content && content.schema && content.schema.$ref) {
              return content.schema.$ref;
            }
          } else if (type === 'response' && status && op.responses && op.responses[status]) {
            const response = op.responses[status];
            const content = response.content?.['application/json'];
            if (content && content.schema) {
              if (content.schema.$ref) {
                return content.schema.$ref;
              } else if (content.schema.type === 'array' && content.schema.items && content.schema.items.$ref) {
                // Handle array responses
                return content.schema.items.$ref;
              }
            }
          }
        }
      }
    }

    return undefined;
  }
}