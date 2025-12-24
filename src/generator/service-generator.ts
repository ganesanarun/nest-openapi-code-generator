import { OpenAPISpec, PathItem, Operation } from '../types/openapi';
import { TemplateLoader } from '../utils/template-loader';
import { DtoImporter } from '../utils/dto-importer';

interface ServiceMethod {
  httpMethod: string;
  methodName: string;
  path: string;
  summary?: string;
  parameters: MethodParameter[];
  bodyParam?: BodyParameter;
  returnType: string;
}

interface MethodParameter {
  name: string;
  type: string;
  required?: boolean;
}

interface BodyParameter {
  type: string;
}

export class ServiceGenerator {
  private templateLoader: TemplateLoader;
  private readonly isDtoGenerationEnabled: boolean;

  constructor(templateDir?: string, isDtoGenerationEnabled: boolean = true) {
    this.templateLoader = new TemplateLoader(templateDir);
    this.isDtoGenerationEnabled = isDtoGenerationEnabled;
  }

  async generateService(
    resourceName: string,
    paths: { [path: string]: PathItem },
    spec: OpenAPISpec
  ): Promise<string> {
    const methods = this.extractMethods(paths, spec, resourceName);

    const template = await this.templateLoader.loadTemplate('service');
    const { localDtos, sharedDtosUsed } = this.extractDtoImports(methods, spec);

    return template({
      className: this.generateClassName(resourceName),
      resourceName: resourceName.toLowerCase(),
      methods: methods.map(m => ({
        ...m,
        hasParams: m.parameters.length > 0 || !!m.bodyParam
      })),
      dtoImports: this.isDtoGenerationEnabled ? DtoImporter.generateImportStatements(localDtos, sharedDtosUsed, resourceName) : undefined
    });
  }

  private extractMethods(
    paths: { [path: string]: PathItem }, 
    spec: OpenAPISpec,
    resourceName: string
  ): ServiceMethod[] {
    const methods: ServiceMethod[] = [];
    const basePath = `/${resourceName.toLowerCase()}s`;

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
      
      for (const method of httpMethods) {
        const operation = pathItem[method] as Operation;
        if (!operation) continue;

        const serviceMethod = this.processOperation(
          method,
          pathStr,
          operation,
          spec,
          basePath
        );
        methods.push(serviceMethod);
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
  ): ServiceMethod {
    const methodName = operation.operationId || this.generateMethodName(httpMethod, path);
    const parameters = this.processParameters(operation.parameters || []);
    const originalSpec = (spec as any)._originalSpec;
    const bodyParam = this.processRequestBody(operation.requestBody, operation.operationId, originalSpec);
    const returnType = this.getReturnType(operation.responses, operation.operationId, originalSpec);

    return {
      httpMethod: this.capitalize(httpMethod),
      methodName,
      path,
      summary: operation.summary,
      parameters,
      bodyParam,
      returnType
    };
  }

  private processParameters(parameters: any[]): MethodParameter[] {
    return parameters.map(param => {
      const type = this.getParamType(param.schema);
      const isRequired = param.required === true || param.in === 'path';
      const nameWithOptional = isRequired ? param.name : `${param.name}?`;
      
      return {
        name: nameWithOptional,
        type: type,
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
    
    return {
      type
    };
  }

  private getReturnType(responses: any, operationId?: string, originalSpec?: any): string {
    const successResponse = Object.entries(responses).find(([status]) => {
      const statusCode = parseInt(status);
      return statusCode >= 200 && statusCode < 300;
    });

    if (!successResponse) return 'void';

    const [status, response] = successResponse as [string, any];
    const content = response.content?.['application/json'];
    
    if (!content || !content.schema) return 'void';

    // Try to find the original reference in the unresolved spec
    let originalRef: string | undefined;
    if (originalSpec && operationId) {
      originalRef = this.findOriginalSchemaRef(originalSpec, operationId, 'response', status);
    }

    return this.getSchemaType(content.schema, originalRef);
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
        return 'any[]';
      }
      return 'any[]';
    }
    
    if (schema.type === 'object' && schema.properties) {
      return 'any';
    }
    
    return 'any';
  }

  private generateMethodName(httpMethod: string, path: string): string {
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const resource = lastSegment.replace(/[{}]/g, '');
    return `${httpMethod}${this.capitalize(resource)}`;
  }

  private extractDtoImports(methods: ServiceMethod[], spec: OpenAPISpec): { localDtos: string[], sharedDtosUsed: string[] } {
    if (!this.isDtoGenerationEnabled) {
        return { localDtos: [], sharedDtosUsed: [] };
    }

    const dtos = new Set<string>();
    methods.forEach(m => {
      if (m.bodyParam) {
        dtos.add(m.bodyParam.type);
      }
      if (m.returnType !== 'void' && m.returnType !== 'any') {
        dtos.add(m.returnType);
      }
    });
    return DtoImporter.resolveDtoImports(dtos, spec);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateClassName(resourceName: string): string {
    // Split by dots and hyphens, then capitalize each part
    return resourceName
      .split(/[.\-_]/)
      .map(part => this.capitalize(part))
      .join('');
  }

  private findOriginalSchemaRef(originalSpec: any, operationId: string, type: 'requestBody' | 'response', status?: string): string | undefined {
    if (!originalSpec || !originalSpec.paths) return undefined;

    // Find the operation in the original spec
    for (const [pathKey, pathItem] of Object.entries(originalSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
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