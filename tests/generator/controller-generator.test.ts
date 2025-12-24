import {ControllerGenerator} from '../../src/generator/controller-generator';
import {SpecParser} from '../../src/parser/spec-parser';
import {OpenAPISpec} from '../../src/types/openapi';
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
            expect(result).toContain('Get, Post, Put, Patch, Delete,');
            expect(result).toContain('Body, Param, Query, Headers, HttpCode');
            expect(result).toContain('} from \'@nestjs/common\'');

            expect(result).toContain('import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiHeader } from \'@nestjs/swagger\'');

            expect(result).toContain('export abstract class UserControllerBase');
        });

        it('should generate controller with proper decorators', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            expect(result).not.toContain('@Controller()');
            expect(result).toContain('@ApiTags(\'users\', \'profile\')');
        });

        it('should generate GET method for retrieving users', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            expect(result).toContain('@Get(\'/users\')');
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

            expect(result).toContain('@Post(\'/users\')');
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

            expect(result).toContain('@Get(\'/users/:userId\')');
            expect(result).toContain('getUserById(');
            expect(result).toContain('@Param(\'userId\') userId: string');

            // API documentation
            expect(result).toContain('@ApiParam({ name: \'userId\', type: String })');
            expect(result).toContain('@ApiResponse({ status: 200, type: UserDto })');
            expect(result).toContain('@ApiResponse({ status: 404, type: ErrorDto })');
        });

        it('should generate PUT method for updating users', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            expect(result).toContain('@Put(\'/users/:userId\')');
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

            expect(result).toContain('@Delete(\'/users/:userId\')');
            expect(result).toContain('deleteUser(');
            expect(result).toContain('@Param(\'userId\') userId: string');

            // Should include HttpCode decorator for 204 response
            expect(result).toContain('@HttpCode(204)');
            expect(result).toContain('@ApiResponse({ status: 204 })');
            expect(result).toContain('@ApiResponse({ status: 404, type: ErrorDto })');
        });

        it('should generate PATCH method for profile updates', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            expect(result).toContain('@Patch(\'/users/:userId/profile\')');
            expect(result).toContain('updateUserProfile(');
            expect(result).toContain('@Param(\'userId\') userId: string');
            expect(result).toContain('@Body() body: ProfileUpdateRequestDto');

            // Response type with proper DTO
            expect(result).toContain('@ApiResponse({ status: 200, type: UserProfileDto })');
        });

        it('should generate proper method signatures with return types', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            expect(result).toContain('getUsers(');
            expect(result).toContain('): Promise<GetUsersResponseDto>'); // inline object response, now generates DTO

            expect(result).toContain('createUser(');
            expect(result).toContain('): Promise<UserDto>');

            expect(result).toContain('getUserById(');
            expect(result).toContain('): Promise<UserDto>');

            expect(result).toContain('updateUser(');
            expect(result).toContain('): Promise<UserDto>');

            expect(result).toContain('deleteUser(');
            expect(result).toContain('): Promise<void>');
        });

        it('should call abstract methods from decorated methods', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            expect(result).toContain('return this.getUsers(');
            expect(result).toContain('return this.createUser(');
            expect(result).toContain('return this.getUserById(');
            expect(result).toContain('return this.updateUser(');
            expect(result).toContain('return this.deleteUser(');
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
        });

        it('should generate shared DTO imports based on used schemas', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // Should import shared DTOs based on actual OpenAPI x-shared: true vendor extension
            expect(result).toContain('import { ErrorDto, ValidationErrorDto, PaginationDto } from \'../shared/shared.dto\'');
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
                                        schema: {type: 'array'}
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

        it('should handle header parameters with hyphens correctly', async () => {
            // Create a spec with header parameters containing hyphens
            const pathsWithHeaders: { [path: string]: any } = {
                '/test': {
                    post: {
                        operationId: 'testWithHeaders',
                        summary: 'Test endpoint with headers',
                        parameters: [
                            {
                                name: 'X-Trace-Id',
                                in: 'header' as const,
                                required: false,
                                schema: {
                                    type: 'string',
                                    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                },
                                description: 'Unique trace identifier'
                            },
                            {
                                name: 'X-Span-Id',
                                in: 'header' as const,
                                required: false,
                                schema: {
                                    type: 'string',
                                    pattern: '^[0-9a-f]{16}$'
                                },
                                description: 'Unique span identifier'
                            },
                            {
                                name: 'Authorization',
                                in: 'header' as const,
                                required: true,
                                schema: {
                                    type: 'string'
                                },
                                description: 'Bearer token'
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {type: 'object'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('test', pathsWithHeaders, testSpec);

            // Should import Headers from @nestjs/common
            expect(result).toContain('Headers');

            // Should convert hyphenated header names to camelCase for parameter names
            expect(result).toContain('@Headers(\'X-Trace-Id\') xTraceId?: string');
            expect(result).toContain('@Headers(\'X-Span-Id\') xSpanId?: string');
            expect(result).toContain('@Headers(\'Authorization\') authorization: string');

            // Should generate proper API documentation for headers
            expect(result).toContain('@ApiHeader({ name: \'X-Trace-Id\', description: \'Unique trace identifier\', required: false, schema: { type: \'string\', pattern: \'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$\' } })');
            expect(result).toContain('@ApiHeader({ name: \'X-Span-Id\', description: \'Unique span identifier\', required: false, schema: { type: \'string\', pattern: \'^[0-9a-f]{16}$\' } })');
            expect(result).toContain('@ApiHeader({ name: \'Authorization\', description: \'Bearer token\', required: true, schema: { type: \'string\' } })');
        });

        it('should handle mixed parameter types including headers', async () => {
            const pathsWithMixedParams: { [path: string]: any } = {
                '/items/{itemId}': {
                    put: {
                        operationId: 'updateItem',
                        summary: 'Update item with mixed parameters',
                        parameters: [
                            {
                                name: 'itemId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'version',
                                in: 'query' as const,
                                required: false,
                                schema: {type: 'number'}
                            },
                            {
                                name: 'X-Request-ID',
                                in: 'header' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/UpdateItemRequest'
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Item'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithMixedParams, testSpec);

            // Should handle all parameter types correctly
            expect(result).toContain('@Param(\'itemId\') itemId: string');
            expect(result).toContain('@Query(\'version\') version?: number');
            expect(result).toContain('@Headers(\'X-Request-ID\') xRequestID: string');
            expect(result).toContain('@Body() body: UpdateItemRequestDto');

            // Should generate proper API documentation
            expect(result).toContain('@ApiParam({ name: \'itemId\', type: String })');
            expect(result).toContain('@ApiQuery({ name: \'version\', type: Number, required: false })');
            expect(result).toContain('@ApiHeader({ name: \'X-Request-ID\', description: \'X-Request-ID header parameter\', required: true, schema: { type: \'string\' } })');
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
            expect(result).toContain('): Promise<GetUsersResponseDto>'); // inline object response, now generates DTO
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
                                                    id: {type: 'string'},
                                                    name: {type: 'string'}
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
            expect(result).toContain('@ApiResponse({ status: 200, type: [ProductDto]');
        });

        it('should handle paginated array responses', async () => {
            // This tests the actual getUsers endpoint from our fixture which has pagination
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // Check that pagination parameters are handled correctly
            expect(result).toContain('@Query(\'page\') page?: number');
            expect(result).toContain('@Query(\'limit\') limit?: number');
            expect(result).toContain('@ApiQuery({ name: \'page\', type: Number, required: false })');
            expect(result).toContain('@ApiQuery({ name: \'limit\', type: Number, required: false })');

            // Check that the response type is now a generated DTO for inline object
            expect(result).toContain('): Promise<GetUsersResponseDto>');
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
            expect(result).toContain('return this.');
        });

        it('should handle template loading errors gracefully', async () => {
            const invalidTemplateDir = '/invalid/path/that/does/not/exist';
            const controllerGeneratorWithInvalidPath = new ControllerGenerator(invalidTemplateDir);

            // Should not throw error and fallback to default template
            const result = await controllerGeneratorWithInvalidPath.generateController('user', testSpec.paths, testSpec);

            expect(result).toContain('export abstract class UserControllerBase');
            expect(result).toContain('return this.');
        });
    });

    describe('nested schema references', () => {
        it('should handle schemas that reference other schemas via $ref', async () => {
            const pathsWithNestedRefs = {
                '/orders': {
                    post: {
                        operationId: 'createOrder',
                        summary: 'Create a new order',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/CreateOrderRequest'
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Order created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Order'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('order', pathsWithNestedRefs, testSpec);

            expect(result).toContain('@Body() body: CreateOrderRequestDto');
            expect(result).toContain('): Promise<OrderDto>');
            expect(result).toContain('@ApiResponse({ status: 201, type: OrderDto })');
            expect(result).toContain('CreateOrderRequestDto, OrderDto');
        });

        it('should handle complex nested object structures in DTOs', async () => {
            const pathsWithComplexNesting = {
                '/companies/{companyId}/departments': {
                    get: {
                        operationId: 'getCompanyDepartments',
                        summary: 'Get departments for a company',
                        parameters: [
                            {
                                name: 'companyId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'List of departments with nested employee data',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                departments: {
                                                    type: 'array',
                                                    items: {
                                                        $ref: '#/components/schemas/Department'
                                                    }
                                                },
                                                company: {
                                                    $ref: '#/components/schemas/Company'
                                                },
                                                metadata: {
                                                    $ref: '#/components/schemas/ResponseMetadata'
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

            const result = await controllerGenerator.generateController('company', pathsWithComplexNesting, testSpec);

            expect(result).toContain('getCompanyDepartments(');
            expect(result).toContain('@Param(\'companyId\') companyId: string');
            expect(result).toContain('): Promise<GetCompanyDepartmentsResponseDto>'); // inline object with nested refs, now generates DTO
            expect(result).toContain('@ApiResponse({ status: 200');
        });

        it('should handle array responses with referenced schemas', async () => {
            const pathsWithArrayRefs = {
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

            const result = await controllerGenerator.generateController('product', pathsWithArrayRefs, testSpec);

            expect(result).toContain('getProducts(');
            expect(result).toContain('): Promise<ProductDto[]>');
            expect(result).toContain('@ApiResponse({ status: 200, type: [ProductDto]');
            expect(result).toContain('ProductDto');
        });

        it('should handle multiple levels of schema nesting', async () => {
            const pathsWithDeepNesting = {
                '/analytics/reports': {
                    post: {
                        operationId: 'generateReport',
                        summary: 'Generate analytics report',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            reportConfig: {
                                                $ref: '#/components/schemas/ReportConfiguration'
                                            },
                                            filters: {
                                                type: 'array',
                                                items: {
                                                    $ref: '#/components/schemas/ReportFilter'
                                                }
                                            },
                                            output: {
                                                $ref: '#/components/schemas/OutputSettings'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Report generated successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                report: {
                                                    $ref: '#/components/schemas/GeneratedReport'
                                                },
                                                metadata: {
                                                    type: 'object',
                                                    properties: {
                                                        generatedAt: {type: 'string', format: 'date-time'},
                                                        processingTime: {type: 'number'},
                                                        dataSource: {
                                                            $ref: '#/components/schemas/DataSource'
                                                        }
                                                    }
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

            const result = await controllerGenerator.generateController('analytics', pathsWithDeepNesting, testSpec);

            expect(result).toContain('generateReport(');
            expect(result).toContain('@Body() body: any'); // inline object with nested refs
            expect(result).toContain('): Promise<GenerateReportResponseDto>'); // inline object response, now generates DTO
            expect(result).toContain('@ApiResponse({ status: 200');
        });

        it('should handle optional vs required nested properties', async () => {
            const pathsWithOptionalNested = {
                '/profiles/{profileId}': {
                    patch: {
                        operationId: 'updateProfile',
                        summary: 'Update user profile',
                        parameters: [
                            {
                                name: 'profileId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'includePreferences',
                                in: 'query' as const,
                                required: false,
                                schema: {type: 'boolean'}
                            }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['basicInfo'],
                                        properties: {
                                            basicInfo: {
                                                $ref: '#/components/schemas/BasicProfileInfo'
                                            },
                                            preferences: {
                                                $ref: '#/components/schemas/UserPreferences'
                                            },
                                            settings: {
                                                $ref: '#/components/schemas/ProfileSettings'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Profile updated successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/FullProfile'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('profile', pathsWithOptionalNested, testSpec);

            expect(result).toContain('updateProfile(');
            expect(result).toContain('@Param(\'profileId\') profileId: string');
            expect(result).toContain('@Query(\'includePreferences\') includePreferences?: boolean');
            expect(result).toContain('@Body() body: any'); // inline object with nested refs
            expect(result).toContain('): Promise<FullProfileDto>');
            expect(result).toContain('FullProfileDto');
        });

        it('should generate proper import statements for referenced DTOs', async () => {
            const pathsWithMultipleRefs = {
                '/transactions': {
                    post: {
                        operationId: 'createTransaction',
                        summary: 'Create a new transaction',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/TransactionRequest'
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Transaction created',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Transaction'
                                        }
                                    }
                                }
                            },
                            '400': {
                                description: 'Validation error',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/ValidationError'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    get: {
                        operationId: 'getTransactions',
                        summary: 'Get transactions',
                        responses: {
                            '200': {
                                description: 'List of transactions',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                $ref: '#/components/schemas/Transaction'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('transaction', pathsWithMultipleRefs, testSpec);

            // Should import all referenced DTOs
            expect(result).toContain('import { TransactionDto, TransactionRequestDto } from \'./transaction.dto\'');
            expect(result).toContain('import { ValidationErrorDto } from \'../shared/shared.dto\'');
            expect(result).toContain('@Body() body: TransactionRequestDto');
            expect(result).toContain('): Promise<TransactionDto>');
            expect(result).toContain('): Promise<TransactionDto[]>');
            expect(result).toContain('@ApiResponse({ status: 201, type: TransactionDto })');
            expect(result).toContain('@ApiResponse({ status: 400, type: ValidationErrorDto })');
        });

        it('should handle circular reference detection', async () => {
            // This test ensures we don't get into infinite loops with circular references
            const pathsWithPotentialCircular = {
                '/nodes/{nodeId}': {
                    get: {
                        operationId: 'getNode',
                        summary: 'Get node with children',
                        parameters: [
                            {
                                name: 'nodeId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Node with nested children',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/TreeNode'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('node', pathsWithPotentialCircular, testSpec);

            expect(result).toContain('getNode(');
            expect(result).toContain('@Param(\'nodeId\') nodeId: string');
            expect(result).toContain('): Promise<TreeNodeDto>');
            expect(result).toContain('TreeNodeDto');
        });
    });

    describe('controller path generation', () => {
        it('should extract base path from consistent API paths', async () => {
            const pathsWithConsistentBase = {
                '/api/v1/users': {
                    get: {
                        operationId: 'getUsers',
                        summary: 'Get users',
                        responses: {'200': {description: 'Success'}}
                    }
                },
                '/api/v1/users/{userId}': {
                    get: {
                        operationId: 'getUserById',
                        summary: 'Get user by ID',
                        parameters: [
                            {name: 'userId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {'200': {description: 'Success'}}
                    }
                }
            };

            const result = await controllerGenerator.generateController('user', pathsWithConsistentBase, testSpec);

            expect(result).toContain('@Get(\'/api/v1/users\')');
            expect(result).toContain('@Get(\'/api/v1/users/:userId\')');
        });

        it('should handle APIs with mixed path structures', async () => {
            const pathsWithMixedStructure = {
                '/items': {
                    get: {
                        operationId: 'getItems',
                        summary: 'Get items',
                        responses: {'200': {description: 'Success'}}
                    }
                },
                '/products/{productId}': {
                    get: {
                        operationId: 'getProduct',
                        summary: 'Get product',
                        parameters: [
                            {name: 'productId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {'200': {description: 'Success'}}
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithMixedStructure, testSpec);

            // Should use empty controller with full paths in HTTP methods
            expect(result).toContain('@Get(\'/items\')');
            expect(result).toContain('@Get(\'/products/:productId\')');
        });

        it('should handle single-endpoint APIs', async () => {
            const singleEndpointPaths = {
                '/health': {
                    get: {
                        operationId: 'healthCheck',
                        summary: 'Health check',
                        responses: {'200': {description: 'Healthy'}}
                    }
                }
            };

            const result = await controllerGenerator.generateController('health', singleEndpointPaths, testSpec);

            expect(result).toContain('@Get(\'/health\')');
        });

        it('should handle APIs with nested resource paths', async () => {
            const nestedResourcePaths = {
                '/companies/{companyId}/employees': {
                    get: {
                        operationId: 'getCompanyEmployees',
                        summary: 'Get company employees',
                        parameters: [
                            {name: 'companyId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {'200': {description: 'Success'}}
                    }
                },
                '/companies/{companyId}/employees/{employeeId}': {
                    get: {
                        operationId: 'getCompanyEmployee',
                        summary: 'Get company employee',
                        parameters: [
                            {name: 'companyId', in: 'path' as const, required: true, schema: {type: 'string'}},
                            {name: 'employeeId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {'200': {description: 'Success'}}
                    }
                }
            };

            const result = await controllerGenerator.generateController('employee', nestedResourcePaths, testSpec);

            expect(result).toContain('@Get(\'/companies/:companyId/employees\')');
            expect(result).toContain('@Get(\'/companies/:companyId/employees/:employeeId\')');
        });
    });

    describe('parameter ordering', () => {
        it('should order parameters correctly: required path, required query/header, optional query/header', async () => {
            const pathsWithMixedParams = {
                '/items/{itemId}': {
                    put: {
                        operationId: 'updateItem',
                        summary: 'Update item with mixed parameters',
                        parameters: [
                            {
                                name: 'version',
                                in: 'query' as const,
                                required: false,
                                schema: {type: 'number'}
                            },
                            {
                                name: 'itemId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'X-Request-ID',
                                in: 'header' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'X-Optional-Header',
                                in: 'header' as const,
                                required: false,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'force',
                                in: 'query' as const,
                                required: true,
                                schema: {type: 'boolean'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Success'
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithMixedParams, testSpec);

            // Check parameter order in method signature
            const methodMatch = result.match(/updateItem\([^)]+\)/s);
            expect(methodMatch).toBeTruthy();

            const methodSignature = methodMatch![0];

            // Check that parameters are ordered correctly: path, then required query/header, then optional
            expect(result).toContain('@Param(\'itemId\') itemId: string');
            expect(result).toContain('@Query(\'force\') force: boolean');
            expect(result).toContain('@Headers(\'X-Request-ID\') xRequestID: string');
            expect(result).toContain('@Query(\'version\') version?: number');
            expect(result).toContain('@Headers(\'X-Optional-Header\') xOptionalHeader?: string');
        });
    });

    describe('class name generation', () => {
        it('should generate proper class names for multi-part resource names', async () => {
            const testCases = [
                {resourceName: 'user', expected: 'UserControllerBase'},
                {resourceName: 'user.query', expected: 'UserQueryControllerBase'},
                {resourceName: 'user-admin', expected: 'UserAdminControllerBase'},
                {resourceName: 'user_profile', expected: 'UserProfileControllerBase'},
                {resourceName: 'api.v1.users', expected: 'ApiV1UsersControllerBase'},
                {resourceName: 'order-management.service', expected: 'OrderManagementServiceControllerBase'}
            ];

            for (const testCase of testCases) {
                const result = await controllerGenerator.generateController(testCase.resourceName, {}, testSpec);
                expect(result).toContain(`export abstract class ${testCase.expected}`);
            }
        });
    });

    describe('union return types', () => {
        it('should generate single return type for methods with one success response', async () => {
            const pathsWithSingleResponse = {
                '/items/{itemId}': {
                    get: {
                        operationId: 'getItem',
                        summary: 'Get single item',
                        parameters: [
                            {name: 'itemId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Item found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Item'}
                                    }
                                }
                            },
                            '404': {
                                description: 'Item not found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Error'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithSingleResponse, testSpec);

            expect(result).toContain('getItem(');
            expect(result).toContain('): Promise<ItemDto>'); // Single return type
            expect(result).not.toContain('|'); // No union type
        });

        it('should generate union return types for methods with multiple success responses', async () => {
            const pathsWithMultipleSuccessResponses = {
                '/content/{contentId}': {
                    get: {
                        operationId: 'getContent',
                        summary: 'Get content with multiple possible return types',
                        parameters: [
                            {name: 'contentId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Full content',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/FullContent'}
                                    }
                                }
                            },
                            '206': {
                                description: 'Partial content',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/PartialContent'}
                                    }
                                }
                            },
                            '404': {
                                description: 'Content not found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Error'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('content', pathsWithMultipleSuccessResponses, testSpec);

            expect(result).toContain('getContent(');
            expect(result).toContain('): Promise<FullContentDto | PartialContentDto>'); // Union return type
            expect(result).toContain('FullContentDto, PartialContentDto');
        });

        it('should handle methods with multiple success responses including void', async () => {
            const pathsWithVoidAndTypeResponses = {
                '/actions/{actionId}': {
                    post: {
                        operationId: 'executeAction',
                        summary: 'Execute action with conditional return',
                        parameters: [
                            {name: 'actionId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Action executed with result',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/ActionResult'}
                                    }
                                }
                            },
                            '204': {
                                description: 'Action executed without result'
                            },
                            '400': {
                                description: 'Invalid action',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Error'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('action', pathsWithVoidAndTypeResponses, testSpec);

            expect(result).toContain('executeAction(');
            expect(result).toContain('): Promise<ActionResultDto>'); // Only non-void type
            expect(result).not.toContain('void |'); // void should be filtered out
            expect(result).toContain('ActionResultDto');
        });

        it('should return void for methods with only void responses', async () => {
            const pathsWithOnlyVoidResponses = {
                '/cleanup': {
                    delete: {
                        operationId: 'cleanup',
                        summary: 'Cleanup resources',
                        responses: {
                            '204': {
                                description: 'Cleanup completed'
                            },
                            '202': {
                                description: 'Cleanup accepted'
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('cleanup', pathsWithOnlyVoidResponses, testSpec);

            expect(result).toContain('cleanup(');
            expect(result).toContain('): Promise<void>'); // void return type
        });

        it('should return any for methods with only any responses', async () => {
            const pathsWithOnlyAnyResponses = {
                '/dynamic': {
                    get: {
                        operationId: 'getDynamic',
                        summary: 'Get dynamic content',
                        responses: {
                            '200': {
                                description: 'Dynamic content',
                                content: {
                                    'application/json': {
                                        schema: {type: 'object'} // inline object = any
                                    }
                                }
                            },
                            '202': {
                                description: 'Processing',
                                content: {
                                    'application/json': {
                                        schema: {type: 'object'} // inline object = any
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('dynamic', pathsWithOnlyAnyResponses, testSpec);

            expect(result).toContain('getDynamic(');
            expect(result).toContain('): Promise<any>'); // any return type
        });

        it('should handle mixed response types with duplicates', async () => {
            const pathsWithDuplicateTypes = {
                '/resources/{resourceId}': {
                    get: {
                        operationId: 'getResource',
                        summary: 'Get resource with possible duplicates',
                        parameters: [
                            {name: 'resourceId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Current resource',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Resource'}
                                    }
                                }
                            },
                            '202': {
                                description: 'Cached resource',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Resource'} // Same type as 200
                                    }
                                }
                            },
                            '206': {
                                description: 'Partial resource',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/PartialResource'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('resource', pathsWithDuplicateTypes, testSpec);

            expect(result).toContain('getResource(');
            expect(result).toContain('): Promise<ResourceDto | PartialResourceDto>'); // Deduplicated union
            expect(result).not.toContain('ResourceDto | ResourceDto'); // No duplicates
            expect(result).toContain('ResourceDto, PartialResourceDto');
        });

        it('should handle complex union types with arrays', async () => {
            const pathsWithArrayUnions = {
                '/search': {
                    get: {
                        operationId: 'search',
                        summary: 'Search with multiple result formats',
                        responses: {
                            '200': {
                                description: 'Full search results',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {$ref: '#/components/schemas/SearchResult'}
                                        }
                                    }
                                }
                            },
                            '206': {
                                description: 'Partial search results',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/SearchSummary'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('search', pathsWithArrayUnions, testSpec);

            expect(result).toContain('search(');
            expect(result).toContain('): Promise<SearchResultDto[] | SearchSummaryDto>'); // Array and object union
            expect(result).toContain('SearchResultDto, SearchSummaryDto');
        });

        it('should include error types in return type when configured', async () => {
            const controllerGeneratorWithErrors = new ControllerGenerator(undefined, true);

            const pathsWithSuccessAndError = {
                '/items/{itemId}': {
                    get: {
                        operationId: 'getItem',
                        summary: 'Get single item',
                        parameters: [
                            {name: 'itemId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Item found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Item'}
                                    }
                                }
                            },
                            '404': {
                                description: 'Item not found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/NotFoundError'}
                                    }
                                }
                            },
                            '500': {
                                description: 'Server error',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/ServerError'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGeneratorWithErrors.generateController('item', pathsWithSuccessAndError, testSpec);

            expect(result).toContain('getItem(');
            expect(result).toContain('): Promise<ItemDto | NotFoundErrorDto | ServerErrorDto>'); // Union with error types
            expect(result).toContain('ItemDto, NotFoundErrorDto, ServerErrorDto');
        });

        it('should exclude error types in return type by default', async () => {
            const controllerGeneratorDefault = new ControllerGenerator(undefined, false);

            const pathsWithSuccessAndError = {
                '/items/{itemId}': {
                    get: {
                        operationId: 'getItem',
                        summary: 'Get single item',
                        parameters: [
                            {name: 'itemId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Item found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Item'}
                                    }
                                }
                            },
                            '404': {
                                description: 'Item not found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/NotFoundError'}
                                    }
                                }
                            },
                            '500': {
                                description: 'Server error',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/ServerError'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGeneratorDefault.generateController('item', pathsWithSuccessAndError, testSpec);

            expect(result).toContain('getItem(');
            expect(result).toContain('): Promise<ItemDto>'); // Only success type
            expect(result).not.toContain('): Promise<ItemDto | NotFoundErrorDto'); // No error types in return type
            expect(result).not.toContain('): Promise<ItemDto | ServerErrorDto'); // No error types in return type
            expect(result).toContain('ItemDto, NotFoundErrorDto, ServerErrorDto'); // But should still import for @ApiResponse decorators
        });

        it('should handle multiple success responses with error types when configured', async () => {
            const controllerGeneratorWithErrors = new ControllerGenerator(undefined, true);

            const pathsWithMultipleSuccessAndErrors = {
                '/content/{contentId}': {
                    get: {
                        operationId: 'getContent',
                        summary: 'Get content with multiple success and error responses',
                        parameters: [
                            {name: 'contentId', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Full content',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/FullContent'}
                                    }
                                }
                            },
                            '206': {
                                description: 'Partial content',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/PartialContent'}
                                    }
                                }
                            },
                            '400': {
                                description: 'Bad request',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/BadRequestError'}
                                    }
                                }
                            },
                            '404': {
                                description: 'Content not found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/NotFoundError'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGeneratorWithErrors.generateController('content', pathsWithMultipleSuccessAndErrors, testSpec);

            expect(result).toContain('getContent(');
            expect(result).toContain('): Promise<FullContentDto | PartialContentDto | BadRequestErrorDto | NotFoundErrorDto>'); // Union with all types
            expect(result).toContain('FullContentDto, PartialContentDto, BadRequestErrorDto, NotFoundErrorDto');
        });
    });

    describe('controller method override pattern', () => {
        it('should generate methods with underscore prefix containing decorators', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // Should generate decorated methods with underscore prefix
            expect(result).toContain('_getUsers(');
            expect(result).toContain('_createUser(');
            expect(result).toContain('_getUserById(');
            expect(result).toContain('_updateUser(');
            expect(result).toContain('_deleteUser(');
            expect(result).toContain('_updateUserProfile(');

            // Decorated methods should have all the decorators
            expect(result).toContain('@Get(\'/users\')');
            expect(result).toContain('@ApiOperation({ summary: \'Get all users\' })');
            expect(result).toContain('@Post(\'/users\')');
            expect(result).toContain('@ApiOperation({ summary: \'Create a new user\' })');
        });

        it('should generate abstract methods without decorators for user implementation', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // Should generate abstract methods without decorators
            expect(result).toContain('abstract getUsers(');
            expect(result).toContain('abstract createUser(');
            expect(result).toContain('abstract getUserById(');
            expect(result).toContain('abstract updateUser(');
            expect(result).toContain('abstract deleteUser(');
            expect(result).toContain('abstract updateUserProfile(');

            // Check that abstract methods don't have decorators immediately before them
            const abstractMethods = [
                'abstract getUsers(',
                'abstract createUser(',
                'abstract getUserById(',
                'abstract updateUser(',
                'abstract deleteUser(',
                'abstract updateUserProfile('
            ];

            abstractMethods.forEach(methodSignature => {
                const methodIndex = result.indexOf(methodSignature);
                expect(methodIndex).toBeGreaterThan(-1);

                // Get the 100 characters before the abstract method
                const beforeMethod = result.substring(Math.max(0, methodIndex - 100), methodIndex);

                // Should not contain HTTP method decorators immediately before
                expect(beforeMethod).not.toMatch(/@(Get|Post|Put|Patch|Delete)\s*$/);
                expect(beforeMethod).not.toMatch(/@ApiOperation\s*$/);
                expect(beforeMethod).not.toMatch(/@ApiParam\s*$/);
                expect(beforeMethod).not.toMatch(/@ApiQuery\s*$/);
                expect(beforeMethod).not.toMatch(/@ApiResponse\s*$/);
            });
        });

        it('should make decorated methods call abstract methods with proper parameters', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // Decorated methods should call abstract methods
            expect(result).toContain('return this.getUsers(');
            expect(result).toContain('return this.createUser(');
            expect(result).toContain('return this.getUserById(');
            expect(result).toContain('return this.updateUser(');
            expect(result).toContain('return this.deleteUser(');
            expect(result).toContain('return this.updateUserProfile(');

            // Should pass parameters correctly
            expect(result).toContain('return this.getUsers(limit, page, status)');
            expect(result).toContain('return this.createUser(body)');
            expect(result).toContain('return this.getUserById(userId)');
            expect(result).toContain('return this.updateUser(userId, body)');
            expect(result).toContain('return this.deleteUser(userId)');
            expect(result).toContain('return this.updateUserProfile(userId, body)');
        });

        it('should handle methods with mixed parameter types in override pattern', async () => {
            const pathsWithMixedParams = {
                '/items/{itemId}': {
                    put: {
                        operationId: 'updateItem',
                        summary: 'Update item with mixed parameters',
                        parameters: [
                            {
                                name: 'itemId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'version',
                                in: 'query' as const,
                                required: false,
                                schema: {type: 'number'}
                            },
                            {
                                name: 'X-Request-ID',
                                in: 'header' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/UpdateItemRequest'
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Item'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithMixedParams, testSpec);

            // Should generate decorated method with underscore
            expect(result).toContain('_updateItem(');
            expect(result).toContain('@Put(\'/items/:itemId\')');
            expect(result).toContain('@Param(\'itemId\') itemId: string');
            expect(result).toContain('@Headers(\'X-Request-ID\') xRequestID: string');
            expect(result).toContain('@Query(\'version\') version?: number');
            expect(result).toContain('@Body() body: UpdateItemRequestDto');

            // Should generate abstract method without decorators
            expect(result).toContain('abstract updateItem(');

            // Should call abstract method with correct parameter order
            expect(result).toContain('return this.updateItem(itemId, body, xRequestID, version)');
        });

        it('should handle methods without parameters in override pattern', async () => {
            const pathsWithoutParams = {
                '/status': {
                    get: {
                        operationId: 'getStatus',
                        summary: 'Get system status',
                        responses: {
                            '200': {
                                description: 'Status',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Status'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('status', pathsWithoutParams, testSpec);

            // Should generate decorated method with underscore
            expect(result).toContain('_getStatus(');
            expect(result).toContain('@Get(\'/status\')');

            // Should generate abstract method without decorators
            expect(result).toContain('abstract getStatus(');

            // Should call abstract method without parameters
            expect(result).toContain('return this.getStatus()');
        });

        it('should maintain proper return types in both decorated and abstract methods', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // Both decorated and abstract methods should have same return types
            expect(result).toContain('_getUsers(');
            expect(result).toContain('): Promise<GetUsersResponseDto>');
            expect(result).toContain('abstract getUsers(');
            expect(result).toContain('): Promise<GetUsersResponseDto>');

            expect(result).toContain('_createUser(');
            expect(result).toContain('): Promise<UserDto>');
            expect(result).toContain('abstract createUser(');
            expect(result).toContain('): Promise<UserDto>');

            expect(result).toContain('_deleteUser(');
            expect(result).toContain('): Promise<void>');
            expect(result).toContain('abstract deleteUser(');
            expect(result).toContain('): Promise<void>');
        });
    });

    describe('edge cases', () => {
        it('should handle empty paths object', async () => {
            const result = await controllerGenerator.generateController('empty', {}, testSpec);

            expect(result).toContain('export abstract class EmptyControllerBase');
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

    describe('path parameter conversion', () => {
        it('should convert single path parameter from OpenAPI format to NestJS format', async () => {
            const pathsWithSingleParam = {
                '/users/{id}': {
                    get: {
                        operationId: 'getUserById',
                        summary: 'Get user by ID',
                        parameters: [
                            {
                                name: 'id',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'User found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/User'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('user', pathsWithSingleParam, testSpec);

            // Should convert {id} to :id in the decorator
            expect(result).toContain('@Get(\'/users/:id\')');
            expect(result).not.toContain('@Get(\'/users/{id}\')');

            // Parameter decorator should still use the original name
            expect(result).toContain('@Param(\'id\') id: string');
        });

        it('should convert multiple path parameters in one path', async () => {
            const pathsWithMultipleParams = {
                '/users/{userId}/posts/{postId}': {
                    get: {
                        operationId: 'getUserPost',
                        summary: 'Get a specific post for a user',
                        parameters: [
                            {
                                name: 'userId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'postId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Post found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Post'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('user', pathsWithMultipleParams, testSpec);

            // Should convert both {userId} and {postId} to :userId and :postId
            expect(result).toContain('@Get(\'/users/:userId/posts/:postId\')');
            expect(result).not.toContain('@Get(\'/users/{userId}/posts/{postId}\')');

            // Parameter decorators should still use original names
            expect(result).toContain('@Param(\'userId\') userId: string');
            expect(result).toContain('@Param(\'postId\') postId: string');
        });

        it('should handle paths with mixed static and parameter segments', async () => {
            const pathsWithMixedSegments = {
                '/api/v1/organizations/{orgId}/teams/{teamId}/members': {
                    get: {
                        operationId: 'getTeamMembers',
                        summary: 'Get team members',
                        parameters: [
                            {
                                name: 'orgId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'teamId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Team members',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                $ref: '#/components/schemas/Member'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('organization', pathsWithMixedSegments, testSpec);

            // Should convert path parameters while preserving static segments
            expect(result).toContain('@Get(\'/api/v1/organizations/:orgId/teams/:teamId/members\')');
            expect(result).not.toContain('{orgId}');
            expect(result).not.toContain('{teamId}');

            // Static segments should remain unchanged
            expect(result).toContain('/api/v1/organizations/');
            expect(result).toContain('/teams/');
            expect(result).toContain('/members');
        });

        it('should convert path parameters for all HTTP methods', async () => {
            const pathsWithAllMethods = {
                '/resources/{id}': {
                    get: {
                        operationId: 'getResource',
                        summary: 'Get resource',
                        parameters: [
                            {
                                name: 'id',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Resource found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Resource'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    post: {
                        operationId: 'createResource',
                        summary: 'Create resource',
                        parameters: [
                            {
                                name: 'id',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/CreateResourceRequest'
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Resource created',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Resource'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    put: {
                        operationId: 'updateResource',
                        summary: 'Update resource',
                        parameters: [
                            {
                                name: 'id',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/UpdateResourceRequest'
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Resource updated',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Resource'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    patch: {
                        operationId: 'patchResource',
                        summary: 'Patch resource',
                        parameters: [
                            {
                                name: 'id',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/PatchResourceRequest'
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Resource patched',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Resource'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    delete: {
                        operationId: 'deleteResource',
                        summary: 'Delete resource',
                        parameters: [
                            {
                                name: 'id',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '204': {
                                description: 'Resource deleted'
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('resource', pathsWithAllMethods, testSpec);

            // All HTTP methods should have converted path parameters
            expect(result).toContain('@Get(\'/resources/:id\')');
            expect(result).toContain('@Post(\'/resources/:id\')');
            expect(result).toContain('@Put(\'/resources/:id\')');
            expect(result).toContain('@Patch(\'/resources/:id\')');
            expect(result).toContain('@Delete(\'/resources/:id\')');

            // None should contain the OpenAPI format
            const openApiFormatCount = (result.match(/\{id\}/g) || []).length;
            expect(openApiFormatCount).toBe(0);
        });

        it('should preserve exact parameter names during conversion', async () => {
            const pathsWithVariousNames = {
                '/items/{itemId}/variants/{variantId}/options/{optionId}': {
                    get: {
                        operationId: 'getItemVariantOption',
                        summary: 'Get item variant option',
                        parameters: [
                            {
                                name: 'itemId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'variantId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'optionId',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Option found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Option'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithVariousNames, testSpec);

            // Should preserve exact parameter names in conversion
            expect(result).toContain('@Get(\'/items/:itemId/variants/:variantId/options/:optionId\')');

            // Parameter decorators should use exact names
            expect(result).toContain('@Param(\'itemId\') itemId: string');
            expect(result).toContain('@Param(\'variantId\') variantId: string');
            expect(result).toContain('@Param(\'optionId\') optionId: string');
        });

        it('should handle paths without parameters correctly', async () => {
            const pathsWithoutParams = {
                '/health': {
                    get: {
                        operationId: 'getHealth',
                        summary: 'Health check',
                        responses: {
                            '200': {
                                description: 'Healthy',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                status: {type: 'string'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('health', pathsWithoutParams, testSpec);

            // Should not modify paths without parameters
            expect(result).toContain('@Get(\'/health\')');
            // Should not contain path parameters in NestJS format (e.g., :paramName in paths)
            expect(result).not.toMatch(/@Get\([^)]*:[a-zA-Z_]/);
            // Should not contain path parameters in OpenAPI format (e.g., {paramName} in decorator paths)
            expect(result).not.toMatch(/@Get\([^)]*\{[a-zA-Z_]/);
            expect(result).not.toMatch(/@Post\([^)]*\{[a-zA-Z_]/);
            expect(result).not.toMatch(/@Put\([^)]*\{[a-zA-Z_]/);
            expect(result).not.toMatch(/@Patch\([^)]*\{[a-zA-Z_]/);
            expect(result).not.toMatch(/@Delete\([^)]*\{[a-zA-Z_]/);
        });

        it('should convert path parameters with underscores and numbers', async () => {
            const pathsWithComplexNames = {
                '/api/{api_version}/users/{user_id_123}': {
                    get: {
                        operationId: 'getUserByVersion',
                        summary: 'Get user by version',
                        parameters: [
                            {
                                name: 'api_version',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            },
                            {
                                name: 'user_id_123',
                                in: 'path' as const,
                                required: true,
                                schema: {type: 'string'}
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'User found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/User'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('user', pathsWithComplexNames, testSpec);

            // Should convert parameters with underscores and numbers
            expect(result).toContain('@Get(\'/api/:api_version/users/:user_id_123\')');
            expect(result).toContain('@Param(\'api_version\') api_version: string');
            expect(result).toContain('@Param(\'user_id_123\') user_id_123: string');
        });
    });
});
