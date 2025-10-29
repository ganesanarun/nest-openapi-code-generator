import { ServiceGenerator } from '../../src/generator/service-generator';
import { SpecParser } from '../../src/parser/spec-parser';
import { OpenAPISpec } from '../../src/types/openapi';
import * as path from 'path';

describe('ServiceGenerator', () => {
  let serviceGenerator: ServiceGenerator;
  let specParser: SpecParser;
  let testSpec: OpenAPISpec;

  beforeEach(async () => {
    serviceGenerator = new ServiceGenerator();
    specParser = new SpecParser();

    const testSpecPath = path.join(__dirname, '../fixtures/user.openapi.yaml');
    testSpec = await specParser.parseSpec(testSpecPath);
  });

  describe('generateService', () => {
    it('should generate service class with proper imports', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('import { Injectable, NotFoundException, BadRequestException } from \'@nestjs/common\'');
      expect(result).toContain('import { Logger } from \'@nestjs/common\'');
      expect(result).toContain('export class UserService');
    });

    it('should generate service with logger', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('private readonly logger = new Logger(UserService.name)');
    });

    it('should generate GET method for retrieving users', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('async getUsers(');
      expect(result).toContain('page?: number');
      expect(result).toContain('limit?: number');
      expect(result).toContain('status?: string');
      expect(result).toContain('): Promise<any>'); // inline object response
      expect(result).toContain('this.logger.log(\'Executing getUsers\')');
    });

    it('should generate POST method for creating users', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('async createUser(');
      expect(result).toContain('body: CreateUserRequestDto');
      expect(result).toContain('): Promise<UserDto>');
      expect(result).toContain('this.logger.log(\'Executing createUser\')');
    });

    it('should generate GET method with path parameters', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('async getUserById(');
      expect(result).toContain('userId: string');
      expect(result).toContain('): Promise<UserDto>');
    });

    it('should generate PUT method for updating users', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('async updateUser(');
      expect(result).toContain('userId: string');
      expect(result).toContain('body: UpdateUserRequestDto');
      expect(result).toContain('): Promise<UserDto>');
    });

    it('should generate DELETE method with proper return type', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('async deleteUser(');
      expect(result).toContain('userId: string');
      expect(result).toContain('): Promise<void>');
    });

    it('should generate PATCH method for profile updates', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('async updateUserProfile(');
      expect(result).toContain('userId: string');
      expect(result).toContain('body: ProfileUpdateRequestDto');
      expect(result).toContain('): Promise<UserProfileDto>');
    });

    it('should include proper method signatures with return types', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('async getUsers(');
      expect(result).toContain('): Promise<any>'); // inline object response

      expect(result).toContain('async createUser(');
      expect(result).toContain('): Promise<UserDto>');

      expect(result).toContain('async getUserById(');
      expect(result).toContain('): Promise<UserDto>');

      expect(result).toContain('async updateUser(');
      expect(result).toContain('): Promise<UserDto>');

      expect(result).toContain('async deleteUser(');
      expect(result).toContain('): Promise<void>');
    });

    it('should include error throwing placeholders', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('throw new Error(\'Method not implemented\')');
    });

    it('should generate DTO imports based on used schemas', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('import {');
      expect(result).toContain('} from \'./user.dto\'');

      // Should import proper DTOs based on actual OpenAPI schema names
      expect(result).toContain('CreateUserRequestDto');
      expect(result).toContain('UpdateUserRequestDto');
      expect(result).toContain('ProfileUpdateRequestDto');
      expect(result).toContain('UserDto');
      expect(result).toContain('UserProfileDto');
    });
  });

  describe('method name generation', () => {
    it('should use operationId when available', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      // These operation IDs are defined in the test spec
      expect(result).toContain('async getUsers(');
      expect(result).toContain('async createUser(');
      expect(result).toContain('async getUserById(');
      expect(result).toContain('async updateUser(');
      expect(result).toContain('async deleteUser(');
      expect(result).toContain('async updateUserProfile(');
    });

    it('should generate method names from path when operationId is missing', async () => {
      // Create a minimal spec without operationIds
      const pathsWithoutOperationId = {
        '/users': {
          get: {
            summary: 'Get users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { type: 'array' }
                  }
                }
              }
            }
          }
        }
      };

      const result = await serviceGenerator.generateService('user', pathsWithoutOperationId, testSpec);

      // Should generate method name from HTTP method and path
      expect(result).toContain('async getUsers(');
    });
  });

  describe('parameter handling', () => {
    it('should handle different parameter types correctly', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      // Path parameters (required)
      expect(result).toContain('userId: string');

      // Query parameters (optional)
      expect(result).toContain('page?: number');
      expect(result).toContain('limit?: number');
      expect(result).toContain('status?: string');
    });
  });

  describe('request body handling', () => {
    it('should generate proper body parameters for request bodies', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('body: CreateUserRequestDto');
      expect(result).toContain('body: UpdateUserRequestDto');
      expect(result).toContain('body: ProfileUpdateRequestDto');
    });

    it('should handle methods without request bodies', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      // GET and DELETE methods should not have body parameters
      const getUsersMatch = result.match(/async getUsers\([^)]*\)/);
      expect(getUsersMatch?.[0]).not.toContain('body:');

      const deleteUserMatch = result.match(/async deleteUser\([^)]*\)/);
      expect(deleteUserMatch?.[0]).not.toContain('body:');
    });
  });

  describe('return type handling', () => {
    it('should generate proper return types based on responses', async () => {
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      expect(result).toContain('): Promise<UserDto>'); // for operations returning User
      expect(result).toContain('): Promise<UserProfileDto>'); // for profile operations
      expect(result).toContain('): Promise<void>'); // for delete operations
      expect(result).toContain('): Promise<any>'); // for inline object responses
    });
  });

  describe('edge cases', () => {
    it('should handle empty paths object', async () => {
      const result = await serviceGenerator.generateService('empty', {}, testSpec);

      expect(result).toContain('export class EmptyService');
      // Should not contain any method definitions
      expect(result.split('async ').length).toBe(1);
    });

    it('should handle paths with missing operations', async () => {
      const pathsWithMissingOps = {
        '/test': {
          // No operations defined
        }
      };

      const result = await serviceGenerator.generateService('test', pathsWithMissingOps, testSpec);

      expect(result).toContain('export class TestService');
      // Should not generate any methods
      expect(result).not.toContain('throw new Error(\'Method not implemented\')');
    });

    it('should handle operations without responses', async () => {
      const pathsWithoutResponses = {
        '/test': {
          get: {
            summary: 'Test endpoint',
            responses: {}
          }
        }
      };

      const result = await serviceGenerator.generateService('test', pathsWithoutResponses, testSpec);

      expect(result).toContain('async getTest(');
      expect(result).toContain('): Promise<void>');
    });
  });

  describe('array response handling', () => {
    it('should handle array responses with referenced schemas', async () => {
      const pathsWithRefArrayResponse = {
        '/products': {
          get: {
            operationId: 'getProducts',
            summary: 'Get all products',
            responses: {
              '200': {
                description: 'List of products',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Product'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const result = await serviceGenerator.generateService('product', pathsWithRefArrayResponse, testSpec);

      expect(result).toContain('async getProducts(');
      expect(result).toContain('): Promise<ProductDto[]>'); // array of referenced DTOs
    });

    it('should handle simple array responses', async () => {
      const pathsWithArrayResponse = {
        '/items': {
          get: {
            operationId: 'getItems',
            summary: 'Get all items',
            responses: {
              '200': {
                description: 'List of items',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const result = await serviceGenerator.generateService('item', pathsWithArrayResponse, testSpec);

      expect(result).toContain('async getItems(');
      expect(result).toContain('): Promise<any[]>'); // array of inline objects
    });
  });
});