export interface OpenAPISpec {
  openapi: string;
  info: any;
  paths: {
    [path: string]: PathItem;
  };
  components?: {
    schemas?: {
      [name: string]: SchemaObject;
    };
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  [key: string]: any;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: {
    [statusCode: string]: Response;
  };
  [key: string]: any;
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema: SchemaObject;
}

export interface RequestBody {
  required?: boolean;
  content: {
    [mediaType: string]: {
      schema: SchemaObject;
    };
  };
}

export interface Response {
  description: string;
  content?: {
    [mediaType: string]: {
      schema: SchemaObject;
    };
  };
}

export interface SchemaObject {
  type?: string;
  properties?: {
    [name: string]: SchemaObject;
  };
  required?: string[];
  items?: SchemaObject;
  enum?: any[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  $ref?: string;
  [key: string]: any;
}