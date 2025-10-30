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
  allParameters?: MethodParameter[];
}

interface MethodParameter {
  name: string;
  type: string;
  decorator: string;
  validationType?: string;
  required?: boolean;
  schema?: any;
  description?: string;
  parameterType?: string;
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
  private includeErrorTypesInReturnType: boolean;

  constructor(templateDir?: string, includeErrorTypesInReturnType: boolean = false) {
    this.templateLoader = new TemplateLoader(templateDir);
    this.includeErrorTypesInReturnType = includeErrorTypesInReturnType;
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
      basePath: '', // Empty controller path
      className: this.generateClassName(resourceName) + 'Controller',
      resourceName: resourceName.toLowerCase(),
      tags,
      methods: methods.map(m => ({
        ...m,
        returnType: this.getReturnType(m),
        hasParams: (m.allParameters && m.allParameters.length > 0) || m.parameters.length > 0 || !!m.bodyParam
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
    // Extract base path dynamically from actual API paths
    const basePath = this.extractBasePath(Object.keys(paths), resourceName);

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

  private extractBasePath(paths: string[], resourceName: string): string {
    if (paths.length === 0) {
      return '';
    }

    // If there's only one path, use it as the base
    if (paths.length === 1) {
      const singlePath = paths[0];
      // Remove path parameters to get the base
      const basePart = singlePath.replace(/\/\{[^}]+\}/g, '');
      return basePart || '';
    }

    // Find the common prefix among all paths
    const commonPrefix = this.findCommonPathPrefix(paths);
    
    // If we found a meaningful common prefix, use it
    if (commonPrefix && commonPrefix !== '/') {
      return commonPrefix;
    }

    // Fallback: try to find a path that matches the resource name pattern
    const resourcePatterns = [
      `/${resourceName.toLowerCase()}s`, // plural
      `/${resourceName.toLowerCase()}`, // singular
      `/api/${resourceName.toLowerCase()}s`, // with api prefix
      `/api/${resourceName.toLowerCase()}`, // with api prefix singular
    ];

    for (const pattern of resourcePatterns) {
      if (paths.some(path => path.startsWith(pattern))) {
        return pattern;
      }
    }

    // Last resort: return empty string (no base path)
    return '';
  }

  private findCommonPathPrefix(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) {
      // For single path, extract the base without parameters
      return paths[0].replace(/\/\{[^}]+\}.*$/, '');
    }

    // Split all paths into segments
    const pathSegments = paths.map(path => path.split('/').filter(Boolean));
    
    // Find the shortest path to limit our search
    const minLength = Math.min(...pathSegments.map(segments => segments.length));
    
    let commonSegments: string[] = [];
    
    // Compare segments at each position
    for (let i = 0; i < minLength; i++) {
      const firstSegment = pathSegments[0][i];
      
      // Skip parameter segments in the comparison
      if (firstSegment.startsWith('{') && firstSegment.endsWith('}')) {
        break;
      }
      
      // Check if all paths have the same segment at this position
      const allMatch = pathSegments.every(segments => 
        segments[i] === firstSegment && 
        !segments[i].startsWith('{')
      );
      
      if (allMatch) {
        commonSegments.push(firstSegment);
      } else {
        break;
      }
    }
    
    return commonSegments.length > 0 ? '/' + commonSegments.join('/') : '';
  }

  private processOperation(
    httpMethod: string,
    path: string,
    operation: Operation,
    spec: OpenAPISpec,
    basePath: string
  ): ControllerMethod {
    const methodName = operation.operationId || this.generateMethodName(httpMethod, path);
    const allParameters = this.processParameters(operation.parameters || []);
    const originalSpec = (spec as any)._originalSpec;
    const bodyParam = this.processRequestBody(operation.requestBody, operation.operationId, originalSpec);
    
    // Combine parameters and body param for proper sorting
    const allMethodParams = [...allParameters];
    if (bodyParam) {
      // Convert body param to parameter format for sorting
      const bodyAsParam: MethodParameter = {
        name: 'body',
        type: bodyParam.type,
        decorator: bodyParam.decorator,
        required: true, // Body is always required when present
        parameterType: 'body'
      };
      allMethodParams.push(bodyAsParam);
    }
    
    // Sort all parameters including body
    const sortedParams = this.sortParameters(allMethodParams);
    
    const responses = this.processResponses(operation.responses, operation.operationId, originalSpec);
    const decorators = this.buildDecorators(operation, allParameters, responses);

    // Use the full path for HTTP method decorators
    const fullPath = path.startsWith('/') ? path : '/' + path;

    return {
      httpMethod: this.capitalize(httpMethod),
      methodName,
      path: fullPath,
      summary: operation.summary,
      tags: operation.tags || [],
      parameters: allParameters, // Keep original for decorators
      bodyParam,
      responses,
      decorators,
      allParameters: sortedParams // Add sorted parameters for template
    };
  }

  private processParameters(parameters: any[]): MethodParameter[] {
    return parameters.map(param => {
      const type = this.getParamType(param.schema);
      const isRequired = param.required === true || param.in === 'path';
      
      let decoratorType: string;
      let paramName: string;
      let decorator: string;
      
      if (param.in === 'header') {
        // For header parameters, use @Headers() and convert hyphenated names to camelCase
        decoratorType = 'Headers';
        paramName = this.toCamelCase(param.name);
        decorator = `@${decoratorType}('${param.name}')`;
      } else if (param.in === 'path') {
        decoratorType = 'Param';
        paramName = param.name;
        decorator = `@${decoratorType}('${param.name}')`;
      } else {
        decoratorType = this.capitalize(param.in);
        paramName = param.name;
        decorator = `@${decoratorType}('${param.name}')`;
      }
      
      const nameWithOptional = isRequired ? paramName : `${paramName}?`;
      
      return {
        name: nameWithOptional,
        type: type,
        decorator: decorator,
        validationType: type,
        required: isRequired,
        schema: param.schema,
        description: param.description,
        parameterType: param.in // Add parameter type for sorting
      };
    });
  }

  private sortParameters(parameters: MethodParameter[]): MethodParameter[] {
    // Define parameter type priority: path > body > query > header > others
    const getParameterTypePriority = (param: MethodParameter): number => {
      const paramType = (param as any).parameterType;
      switch (paramType) {
        case 'path': return 1;
        case 'body': return 2; // Body comes after path but before query/header
        case 'query': return 3;
        case 'header': return 4;
        default: return 5;
      }
    };

    return parameters.sort((a, b) => {
      // First, sort by required status (required first)
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      
      // Within the same required status, sort by parameter type
      const aPriority = getParameterTypePriority(a);
      const bPriority = getParameterTypePriority(b);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within the same type and required status, sort alphabetically by name
      return a.name.localeCompare(b.name);
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

    parameters
      .filter(p => p.decorator.includes('@Headers'))
      .forEach(p => {
        const cleanName = p.name.replace('?', '');
        const isRequired = p.required === true;
        // Extract the original header name from the decorator
        const headerName = p.decorator.match(/@Headers\('([^']+)'\)/)?.[1] || cleanName;
        
        // Build schema object for ApiHeader
        const schemaProps: string[] = [];
        if (p.schema) {
          if (p.schema.type) {
            schemaProps.push(`type: '${p.schema.type}'`);
          }
          if (p.schema.pattern) {
            schemaProps.push(`pattern: '${p.schema.pattern}'`);
          }
          if (p.schema.format) {
            schemaProps.push(`format: '${p.schema.format}'`);
          }
        }
        
        const description = p.description || `${headerName} header parameter`;
        const schemaStr = schemaProps.length > 0 ? `, schema: { ${schemaProps.join(', ')} }` : '';
        
        decorators.push(`@ApiHeader({ name: '${headerName}', description: '${description}', required: ${isRequired}${schemaStr} })`);
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
    // Filter responses based on configuration
    const responses = this.includeErrorTypesInReturnType 
      ? method.responses // Include all responses (success and error)
      : method.responses.filter(r => r.status >= 200 && r.status < 300); // Only success responses (2xx)
    
    if (responses.length === 0) {
      return 'void';
    }
    
    // Extract unique types from filtered responses
    const responseTypes = responses
      .map(r => r.type)
      .filter(type => type !== 'void' && type !== 'any') // Filter out void and any types
      .filter((type, index, array) => array.indexOf(type) === index); // Remove duplicates
    
    if (responseTypes.length === 0) {
      // If all responses are void or any, check if we have any non-void responses
      const hasNonVoidResponses = responses.some(r => r.type !== 'void');
      return hasNonVoidResponses ? 'any' : 'void';
    }
    
    if (responseTypes.length === 1) {
      return responseTypes[0];
    }
    
    // Create union type for multiple response types
    return responseTypes.join(' | ');
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
        // Extract base type from array types
        const baseType = m.bodyParam.type.replace(/\[\]$/, '');
        if (baseType !== 'void' && baseType !== 'any') {
          dtos.add(baseType);
        }
      }
      m.responses.forEach(r => {
        if (r.type !== 'void' && r.type !== 'any') {
          // Extract base type from array types
          const baseType = r.type.replace(/\[\]$/, '');
          if (baseType !== 'void' && baseType !== 'any') {
            dtos.add(baseType);
          }
        }
      });
    });
    
    // Also extract types from union return types
    methods.forEach(m => {
      const returnType = this.getReturnType(m);
      if (returnType !== 'void' && returnType !== 'any') {
        // Split union types and extract base types
        const unionTypes = returnType.split(' | ');
        unionTypes.forEach(type => {
          const baseType = type.trim().replace(/\[\]$/, '');
          if (baseType !== 'void' && baseType !== 'any') {
            dtos.add(baseType);
          }
        });
      }
    });
    
    return Array.from(dtos);
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

  private toCamelCase(str: string): string {
    return str.replace(/-([a-zA-Z])/g, (match, letter) => letter.toUpperCase())
              .replace(/^[A-Z]/, (match) => match.toLowerCase());
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