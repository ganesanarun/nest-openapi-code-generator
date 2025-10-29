import { ControllerGenerator } from '../../src/generator/controller-generator';
import { SpecParser } from '../../src/parser/spec-parser';
import { OpenAPISpec } from '../../src/types/openapi';
import * as path from 'path';

describe('ControllerGenerator', () => {
  let controllerGenerator: ControllerGenerator;
  let specParser: SpecParser;
  let testSpec: OpenAPISpec;

  beforeEach(async () => {
    controllerGenerator = new ControllerGenerator();
    specParser = new SpecParser();

    const testSpecPath = path.join(__dirname, '../fixtures/user.openapi.yaml');
    testSpec = await specParser.parseSpec(testSpecPath);
  });

  describe('generateController', () => {
    it('should generate controller class with proper imports', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('import {');
      expect(result).toContain('Controller, Get, Post, Put, Patch, Delete,');
      expect(result).toContain('Body, Param, Query, HttpCode, NotImplementedException');
      expect(result).toContain('} from \'@nestjs/common\'');

      expect(result).toContain('import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from \'@nestjs/swagger\'');

      expect(result).toContain('export abstract class UserControllerBase');
    });

    it('should generate controller with proper decorators', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Controller(\'user\')');
      expect(result).toContain('@ApiTags(\'users\', \'profile\')');
    });

    it('should generate GET method for retrieving users', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Get()');
      expect(result).toContain('getUsers(');
      expect(result).toContain('@ApiOperation({ summary: \'Get all users\' })');

      // Query parameters
      expect(result).toContain('@Query(\'page\') page?: number');
      expect(result).toContain('@Query(\'limit\') limit?: number');
      expect(result).toContain('@Query(\'status\') status?: string');

      // API documentation decorators
      expect(result).toContain('@ApiQuery({ name: \'page\', type: Number, required: false })');
      expect(result).toContain('@ApiQuery({ name: \'limit\', type: Number, required: false })');
      expect(result).toContain('@ApiQuery({ name: \'status\', type: String, required: false })');

      // Response decorators with types - getUsers returns an inline object, so it should be 'any' for now
      expect(result).toContain('@ApiResponse({ status: 200');
      expect(result).toContain('@ApiResponse({ status: 400, type: ErrorDto })');
      expect(result).toContain('@ApiResponse({ status: 500, type: ErrorDto })');
    });

    it('should generate POST method for creating users', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Post()');
      expect(result).toContain('createUser(');
      expect(result).toContain('@ApiOperation({ summary: \'Create a new user\' })');

      // Request body with proper type
      expect(result).toContain('@Body() body: CreateUserRequestDto');

      // Response decorators with types
      expect(result).toContain('@ApiResponse({ status: 201, type: UserDto })');
      expect(result).toContain('@ApiResponse({ status: 400, type: ValidationErrorDto })');
      expect(result).toContain('@ApiResponse({ status: 409, type: ErrorDto })');
    });

    it('should generate GET method with path parameters', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Get(\'/{userId}\')');
      expect(result).toContain('getUserById(');
      expect(result).toContain('@Param(\'userId\') userId: string');

      // API documentation
      expect(result).toContain('@ApiParam({ name: \'userId\', type: String })');
      expect(result).toContain('@ApiResponse({ status: 200, type: UserDto })');
      expect(result).toContain('@ApiResponse({ status: 404, type: ErrorDto })');
    });

    it('should generate PUT method for updating users', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Put(\'/{userId}\')');
      expect(result).toContain('updateUser(');
      expect(result).toContain('@Param(\'userId\') userId: string');
      expect(result).toContain('@Body() body: UpdateUserRequestDto');

      // Response decorators with types
      expect(result).toContain('@ApiResponse({ status: 200, type: UserDto })');
      expect(result).toContain('@ApiResponse({ status: 400, type: ValidationErrorDto })');
      expect(result).toContain('@ApiResponse({ status: 404, type: ErrorDto })');
    });

    it('should generate DELETE method with proper response codes', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Delete(\'/{userId}\')');
      expect(result).toContain('deleteUser(');
      expect(result).toContain('@Param(\'userId\') userId: string');

      // Should include HttpCode decorator for 204 response
      expect(result).toContain('@HttpCode(204)');
      expect(result).toContain('@ApiResponse({ status: 204 })');
      expect(result).toContain('@ApiResponse({ status: 404, type: ErrorDto })');
    });

    it('should generate PATCH method for profile updates', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Patch(\'/{userId}/profile\')');
      expect(result).toContain('updateUserProfile(');
      expect(result).toContain('@Param(\'userId\') userId: string');
      expect(result).toContain('@Body() body: ProfileUpdateRequestDto');

      // Response type with proper DTO
      expect(result).toContain('@ApiResponse({ status: 200, type: UserProfileDto })');
    });

    it('should generate proper method signatures with return types', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('getUsers(');
      expect(result).toContain('): Promise<any>'); // inline object response, so 'any'

      expect(result).toContain('createUser(');
      expect(result).toContain('): Promise<UserDto>');

      expect(result).toContain('getUserById(');
      expect(result).toContain('): Promise<UserDto>');

      expect(result).toContain('updateUser(');
      expect(result).toContain('): Promise<UserDto>');

      expect(result).toContain('deleteUser(');
      expect(result).toContain('): Promise<void>');
    });

    it('should include NotImplementedException in method bodies', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('throw new NotImplementedException(\'getUsers not yet implemented\')');
      expect(result).toContain('throw new NotImplementedException(\'createUser not yet implemented\')');
      expect(result).toContain('throw new NotImplementedException(\'getUserById not yet implemented\')');
      expect(result).toContain('throw new NotImplementedException(\'updateUser not yet implemented\')');
      expect(result).toContain('throw new NotImplementedException(\'deleteUser not yet implemented\')');
    });

    it('should generate DTO imports based on used schemas', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('import {');
      expect(result).toContain('} from \'./user.dto\'');

      // Should import proper DTOs based on actual OpenAPI schema names
      expect(result).toContain('CreateUserRequestDto');
      expect(result).toContain('UpdateUserRequestDto');
      expect(result).toContain('ProfileUpdateRequestDto');
      expect(result).toContain('UserDto');
      expect(result).toContain('UserProfileDto');
      expect(result).toContain('ValidationErrorDto');
      expect(result).toContain('ErrorDto');
    });
  });

  describe('method name generation', () => {
    it('should use operationId when available', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // These operation IDs are defined in the test spec
      expect(result).toContain('getUsers(');
      expect(result).toContain('createUser(');
      expect(result).toContain('getUserById(');
      expect(result).toContain('updateUser(');
      expect(result).toContain('deleteUser(');
      expect(result).toContain('updateUserProfile(');
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

      const result = await controllerGenerator.generateController('user', pathsWithoutOperationId, testSpec);

      // Should generate method name from HTTP method and path
      expect(result).toContain('getUsers(');
    });
  });

  describe('parameter handling', () => {
    it('should handle different parameter types correctly', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Path parameters
      expect(result).toContain('@Param(\'userId\') userId: string');

      // Query parameters with different types (optional)
      expect(result).toContain('@Query(\'page\') page?: number');
      expect(result).toContain('@Query(\'limit\') limit?: number');
      expect(result).toContain('@Query(\'status\') status?: string');
    });

    it('should generate proper API documentation for parameters', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@ApiParam({ name: \'userId\', type: String })');
      expect(result).toContain('@ApiQuery({ name: \'page\', type: Number, required: false })');
      expect(result).toContain('@ApiQuery({ name: \'limit\', type: Number, required: false })');
      expect(result).toContain('@ApiQuery({ name: \'status\', type: String, required: false })');
    });
  });

  describe('response handling', () => {
    it('should generate response decorators for all status codes', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Success responses with types
      expect(result).toContain('@ApiResponse({ status: 200, type: UserDto');
      expect(result).toContain('@ApiResponse({ status: 201, type: UserDto');
      expect(result).toContain('@ApiResponse({ status: 204 })');

      // Error responses with types
      expect(result).toContain('@ApiResponse({ status: 400, type: ValidationErrorDto');
      expect(result).toContain('@ApiResponse({ status: 404, type: ErrorDto');
      expect(result).toContain('@ApiResponse({ status: 409, type: ErrorDto');
      expect(result).toContain('@ApiResponse({ status: 500, type: ErrorDto');
    });

    it('should include response types when available', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@ApiResponse({ status: 200, type: UserDto');
      expect(result).toContain('@ApiResponse({ status: 201, type: UserDto');
      expect(result).toContain('@ApiResponse({ status: 204 })'); // No content response
    });

    it('should add HttpCode decorator for non-standard success codes', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // DELETE returns 204, which should have HttpCode decorator
      expect(result).toContain('@HttpCode(204)');
    });
  });

  describe('request body handling', () => {
    it('should generate Body decorators for request bodies', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      expect(result).toContain('@Body() body: CreateUserRequestDto');
      expect(result).toContain('@Body() body: UpdateUserRequestDto');
      expect(result).toContain('@Body() body: ProfileUpdateRequestDto');
    });

    it('should handle methods without request bodies', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // GET and DELETE methods should not have body parameters
      const getUsersMatch = result.match(/getUsers\([^)]*\)/);
      expect(getUsersMatch?.[0]).not.toContain('@Body()');

      const deleteUserMatch = result.match(/deleteUser\([^)]*\)/);
      expect(deleteUserMatch?.[0]).not.toContain('@Body()');
    });
  });

  describe('tags handling', () => {
    it('should extract and include all unique tags', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Should include both 'users' and 'profile' tags from the spec
      expect(result).toContain('@ApiTags(\'users\', \'profile\')');
    });

    it('should handle controllers without tags', async () => {
      const pathsWithoutTags = {
        '/test': {
          get: {
            summary: 'Test endpoint',
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      };

      const result = await controllerGenerator.generateController('test', pathsWithoutTags, testSpec);

      // Should not include ApiTags decorator when no tags are present
      expect(result).not.toContain('@ApiTags');
    });
  });

  describe('array response handling', () => {
    it('should handle endpoints that return complex objects with arrays', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // The getUsers endpoint returns a complex object with data array and pagination
      expect(result).toContain('getUsers(');
      expect(result).toContain('): Promise<any>'); // inline object response, so 'any'
      expect(result).toContain('@ApiResponse({ status: 200');
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

      const result = await controllerGenerator.generateController('item', pathsWithArrayResponse, testSpec);

      expect(result).toContain('getItems(');
      expect(result).toContain('): Promise<any[]>'); // array of inline objects
      expect(result).toContain('@ApiResponse({ status: 200');
    });

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

      const result = await controllerGenerator.generateController('product', pathsWithRefArrayResponse, testSpec);

      expect(result).toContain('getProducts(');
      expect(result).toContain('): Promise<ProductDto[]>'); // array of referenced DTOs
      expect(result).toContain('@ApiResponse({ status: 200, type: ProductDto');
    });

    it('should handle paginated array responses', async () => {
      // This tests the actual getUsers endpoint from our fixture which has pagination
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Check that pagination parameters are handled correctly
      expect(result).toContain('@Query(\'page\') page?: number');
      expect(result).toContain('@Query(\'limit\') limit?: number');
      expect(result).toContain('@ApiQuery({ name: \'page\', type: Number, required: false })');
      expect(result).toContain('@ApiQuery({ name: \'limit\', type: Number, required: false })');

      // Check that the response type is 'any' for inline object
      expect(result).toContain('): Promise<any>');
      expect(result).toContain('@ApiResponse({ status: 200');
    });

    it('should handle array responses with filtering parameters', async () => {
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Check that filtering parameters are handled correctly
      expect(result).toContain('@Query(\'status\') status?: string');
      expect(result).toContain('@ApiQuery({ name: \'status\', type: String, required: false })');
    });
  });

  describe('template customization', () => {
    it('should use custom templates when templateDir is provided', async () => {
      const customTemplateDir = path.join(__dirname, '../fixtures/custom-templates');
      const customControllerGenerator = new ControllerGenerator(customTemplateDir);
      
      const result = await customControllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Custom template should generate different structure
      expect(result).toContain('Throttle');
      expect(result).toContain('export class UserControllerController'); // Not "Base"
      expect(result).toContain('constructor(private readonly userControllerService: UserControllerService)');
      expect(result).toContain('return this.userControllerService.'); // Service calls instead of NotImplementedException
      expect(result).toContain('async getUsers('); // async methods
    });

    it('should fallback to default template when custom template does not exist', async () => {
      const nonExistentTemplateDir = path.join(__dirname, '../fixtures/non-existent-templates');
      const controllerGeneratorWithFallback = new ControllerGenerator(nonExistentTemplateDir);
      
      const result = await controllerGeneratorWithFallback.generateController('user', testSpec.paths, testSpec);

      // Should use default template
      expect(result).toContain('export abstract class UserControllerBase');
      expect(result).toContain('throw new NotImplementedException');
    });

    it('should handle template loading errors gracefully', async () => {
      const invalidTemplateDir = '/invalid/path/that/does/not/exist';
      const controllerGeneratorWithInvalidPath = new ControllerGenerator(invalidTemplateDir);
      
      // Should not throw error and fallback to default template
      const result = await controllerGeneratorWithInvalidPath.generateController('user', testSpec.paths, testSpec);
      
      expect(result).toContain('export abstract class UserControllerBase');
      expect(result).toContain('throw new NotImplementedException');
    });
  });

  describe('edge cases', () => {
    it('should handle empty paths object', async () => {
      const result = await controllerGenerator.generateController('empty', {}, testSpec);

      expect(result).toContain('export abstract class EmptyControllerBase');
      expect(result).toContain('@Controller(\'empty\')');
      // Should not contain any method definitions
      expect(result.split('@Get').length).toBe(1);
      expect(result.split('@Post').length).toBe(1);
    });

    it('should handle paths with missing operations', async () => {
      const pathsWithMissingOps = {
        '/test': {
          // No operations defined
        }
      };

      const result = await controllerGenerator.generateController('test', pathsWithMissingOps, testSpec);

      expect(result).toContain('export abstract class TestControllerBase');
      // Should not generate any methods
      expect(result).not.toContain('throw new NotImplementedException');
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

      const result = await controllerGenerator.generateController('test', pathsWithoutResponses, testSpec);

      expect(result).toContain('getTest(');
      expect(result).toContain('): Promise<void>');
    });
  });
});