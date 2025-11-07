import {ControllerGenerator} from '../../src/generator/controller-generator';
import {DtoGenerator} from '../../src';
import {SpecParser} from '../../src';
import {OpenAPISpec} from '../../src';
import * as path from 'path';

describe('Inline Response DTO Generation', () => {
    let controllerGenerator: ControllerGenerator;
    let dtoGenerator: DtoGenerator;
    let specParser: SpecParser;
    let testSpec: OpenAPISpec;

    beforeEach(async () => {
        controllerGenerator = new ControllerGenerator();
        dtoGenerator = new DtoGenerator();
        specParser = new SpecParser();

        const testSpecPath = path.join(__dirname, '../fixtures/user.openapi.yaml');
        testSpec = await specParser.parseSpec(testSpecPath);
    });

    describe('inline response object detection', () => {
        it('should detect inline response objects vs referenced schemas', async () => {
            const pathsWithInlineAndRef = {
                '/items': {
                    get: {
                        operationId: 'getItems',
                        summary: 'Get items with inline response',
                        responses: {
                            '200': {
                                description: 'Inline response object',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                items: {
                                                    type: 'array',
                                                    items: {$ref: '#/components/schemas/Item'}
                                                },
                                                total: {type: 'number'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    post: {
                        operationId: 'createItem',
                        summary: 'Create item with referenced response',
                        responses: {
                            '201': {
                                description: 'Referenced response schema',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Item'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithInlineAndRef, testSpec);

            // Should generate proper DTO name for inline response
            expect(result).toContain('): Promise<GetItemsResponseDto>');

            // Should use referenced DTO for non-inline response
            expect(result).toContain('): Promise<ItemDto>');

            // Should import both generated and referenced DTOs
            expect(result).toContain('GetItemsResponseDto');
            expect(result).toContain('ItemDto');
        });

        it('should handle the existing getUsers endpoint with inline response', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // The getUsers endpoint has an inline response object, should generate DTO
            expect(result).toContain('): Promise<GetUsersResponseDto>');
            expect(result).not.toContain('): Promise<any>'); // Should not return 'any' anymore

            // Should import the generated response DTO
            expect(result).toContain('GetUsersResponseDto');
        });

        it('should not generate DTOs for simple types', async () => {
            const pathsWithSimpleTypes = {
                '/count': {
                    get: {
                        operationId: 'getCount',
                        summary: 'Get count',
                        responses: {
                            '200': {
                                description: 'Simple number response',
                                content: {
                                    'application/json': {
                                        schema: {type: 'number'}
                                    }
                                }
                            }
                        }
                    }
                },
                '/status': {
                    get: {
                        operationId: 'getStatus',
                        summary: 'Get status',
                        responses: {
                            '200': {
                                description: 'Simple string response',
                                content: {
                                    'application/json': {
                                        schema: {type: 'string'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('simple', pathsWithSimpleTypes, testSpec);

            // Should use primitive types, not generate DTOs
            expect(result).toContain('): Promise<number>');
            expect(result).toContain('): Promise<string>');
            expect(result).not.toContain('GetCountResponseDto');
            expect(result).not.toContain('GetStatusResponseDto');
        });

        it('should not generate DTOs for array responses without object items', async () => {
            const pathsWithSimpleArrays = {
                '/tags': {
                    get: {
                        operationId: 'getTags',
                        summary: 'Get tags',
                        responses: {
                            '200': {
                                description: 'Array of strings',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {type: 'string'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('tag', pathsWithSimpleArrays, testSpec);

            // Should use array type, not generate DTO
            expect(result).toContain('): Promise<string[]>');
            expect(result).not.toContain('GetTagsResponseDto');
        });
    });

    describe('DTO generation for inline response objects', () => {
        it('should generate DTO for inline response object with proper validation decorators', async () => {
            const pathsWithInlineResponse = {
                '/products': {
                    get: {
                        operationId: 'getProducts',
                        summary: 'Get products',
                        responses: {
                            '200': {
                                description: 'Products with pagination',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                products: {
                                                    type: 'array',
                                                    items: {$ref: '#/components/schemas/Product'}
                                                },
                                                pagination: {
                                                    $ref: '#/components/schemas/Pagination'
                                                },
                                                filters: {
                                                    type: 'object',
                                                    properties: {
                                                        category: {type: 'string'},
                                                        priceRange: {
                                                            type: 'object',
                                                            properties: {
                                                                min: {type: 'number'},
                                                                max: {type: 'number'}
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
                }
            };

            // This test will verify the DTO generation once the generateDtos method is implemented
            // For now, we'll test the controller generation behavior
            const result = await controllerGenerator.generateController('product', pathsWithInlineResponse, testSpec);

            // Should generate proper return type for inline response
            expect(result).toContain('): Promise<GetProductsResponseDto>');
            expect(result).toContain('GetProductsResponseDto');
        });

        it('should generate unique DTO names based on operation context', async () => {
            const pathsWithMultipleInlineResponses = {
                '/users/search': {
                    get: {
                        operationId: 'searchUsers',
                        summary: 'Search users',
                        responses: {
                            '200': {
                                description: 'Search results',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                users: {
                                                    type: 'array',
                                                    items: {$ref: '#/components/schemas/User'}
                                                },
                                                total: {type: 'number'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/users/export': {
                    get: {
                        operationId: 'exportUsers',
                        summary: 'Export users',
                        responses: {
                            '200': {
                                description: 'Export data',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                users: {
                                                    type: 'array',
                                                    items: {$ref: '#/components/schemas/User'}
                                                },
                                                exportedAt: {type: 'string', format: 'date-time'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('user', pathsWithMultipleInlineResponses, testSpec);

            // Should generate unique DTO names based on operation ID
            expect(result).toContain('): Promise<SearchUsersResponseDto>');
            expect(result).toContain('): Promise<ExportUsersResponseDto>');

            // Should import both DTOs
            expect(result).toContain('SearchUsersResponseDto');
            expect(result).toContain('ExportUsersResponseDto');
        });

        it('should handle multiple response status codes with inline objects', async () => {
            const pathsWithMultipleInlineStatuses = {
                '/data': {
                    get: {
                        operationId: 'getData',
                        summary: 'Get data',
                        responses: {
                            '200': {
                                description: 'Full data',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                data: {type: 'array', items: {type: 'object'}},
                                                complete: {type: 'boolean', enum: [true]}
                                            }
                                        }
                                    }
                                }
                            },
                            '206': {
                                description: 'Partial data',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                data: {type: 'array', items: {type: 'object'}},
                                                complete: {type: 'boolean', enum: [false]},
                                                nextToken: {type: 'string'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('data', pathsWithMultipleInlineStatuses, testSpec);

            // Should generate union type with both response DTOs
            expect(result).toContain('): Promise<GetData200ResponseDto | GetData206ResponseDto>');

            // Should import both DTOs
            expect(result).toContain('GetData200ResponseDto');
            expect(result).toContain('GetData206ResponseDto');
        });

        it('should handle nested references within inline objects', async () => {
            const pathsWithNestedRefs = {
                '/orders': {
                    get: {
                        operationId: 'getOrders',
                        summary: 'Get orders',
                        responses: {
                            '200': {
                                description: 'Orders with nested references',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                orders: {
                                                    type: 'array',
                                                    items: {$ref: '#/components/schemas/Order'}
                                                },
                                                summary: {
                                                    type: 'object',
                                                    properties: {
                                                        totalAmount: {type: 'number'},
                                                        currency: {$ref: '#/components/schemas/Currency'},
                                                        statistics: {
                                                            $ref: '#/components/schemas/OrderStatistics'
                                                        }
                                                    }
                                                },
                                                pagination: {$ref: '#/components/schemas/Pagination'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            // This test will verify the DTO generation once the generateDtos method is implemented
            const result = await controllerGenerator.generateController('order', pathsWithNestedRefs, testSpec);

            // Should generate proper return type for inline response with nested refs
            expect(result).toContain('): Promise<GetOrdersResponseDto>');
            expect(result).toContain('GetOrdersResponseDto');
        });
    });

    describe('import management for auto-generated response DTOs', () => {
        it('should include auto-generated response DTOs in controller imports', async () => {
            const pathsWithMixedResponses = {
                '/analytics': {
                    get: {
                        operationId: 'getAnalytics',
                        summary: 'Get analytics',
                        responses: {
                            '200': {
                                description: 'Analytics data',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                metrics: {
                                                    type: 'array',
                                                    items: {$ref: '#/components/schemas/Metric'}
                                                },
                                                period: {type: 'string'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    post: {
                        operationId: 'createAnalyticsReport',
                        summary: 'Create analytics report',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {$ref: '#/components/schemas/ReportRequest'}
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Report created',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/Report'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('analytics', pathsWithMixedResponses, testSpec);

            // Should import both auto-generated and referenced DTOs
            expect(result).toContain('import {');
            expect(result).toContain('GetAnalyticsResponseDto'); // Auto-generated
            expect(result).toContain('ReportRequestDto'); // Referenced request DTO
            expect(result).toContain('ReportDto'); // Referenced response DTO
            expect(result).toContain('} from \'./analytics.dto\'');
        });

        it('should handle circular dependencies gracefully', async () => {
            const pathsWithPotentialCircular = {
                '/tree': {
                    get: {
                        operationId: 'getTree',
                        summary: 'Get tree structure',
                        responses: {
                            '200': {
                                description: 'Tree with metadata',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                root: {$ref: '#/components/schemas/TreeNode'},
                                                metadata: {
                                                    type: 'object',
                                                    properties: {
                                                        totalNodes: {type: 'number'},
                                                        maxDepth: {type: 'number'}
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

            const result = await controllerGenerator.generateController('tree', pathsWithPotentialCircular, testSpec);

            // Should generate response DTO without infinite loops
            expect(result).toContain('): Promise<GetTreeResponseDto>');
            expect(result).toContain('GetTreeResponseDto');
            expect(result).toContain('TreeNodeDto');
        });

        it('should ensure proper TypeScript import statements', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // Should have proper import structure
            expect(result).toMatch(/import\s*{\s*[^}]*GetUsersResponseDto[^}]*\s*}\s*from\s*['"]\.\/user\.dto['"]/);

            // Should not have duplicate imports
            const importMatches = result.match(/import\s*{[^}]*}\s*from\s*['"]\.\/user\.dto['"]/g);
            expect(importMatches).toHaveLength(1);
        });
    });

    describe('return type generation in controllers', () => {
        it('should use generated DTO names instead of any for inline response objects', async () => {
            const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

            // getUsers has inline response, should use generated DTO
            expect(result).toContain('getUsers(');
            expect(result).toContain('): Promise<GetUsersResponseDto>');
            expect(result).not.toContain('): Promise<any>');

            // Other methods with referenced schemas should remain unchanged
            expect(result).toContain('createUser(');
            expect(result).toContain('): Promise<UserDto>');

            expect(result).toContain('getUserById(');
            expect(result).toContain('): Promise<UserDto>');
        });

        it('should handle multiple response types per operation with inline objects', async () => {
            const pathsWithMultipleInlineResponses = {
                '/content/{id}': {
                    get: {
                        operationId: 'getContent',
                        summary: 'Get content',
                        parameters: [
                            {name: 'id', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Full content',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                content: {type: 'string'},
                                                metadata: {type: 'object'},
                                                complete: {type: 'boolean', enum: [true]}
                                            }
                                        }
                                    }
                                }
                            },
                            '206': {
                                description: 'Partial content',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                content: {type: 'string'},
                                                complete: {type: 'boolean', enum: [false]},
                                                nextChunk: {type: 'string'}
                                            }
                                        }
                                    }
                                }
                            },
                            '404': {
                                description: 'Not found',
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

            const result = await controllerGenerator.generateController('content', pathsWithMultipleInlineResponses, testSpec);

            // Should create union type with generated DTOs (excluding error types by default)
            expect(result).toContain('): Promise<GetContent200ResponseDto | GetContent206ResponseDto>');

            // Should import all DTOs including error DTO for @ApiResponse decorators
            expect(result).toContain('GetContent200ResponseDto');
            expect(result).toContain('GetContent206ResponseDto');
            expect(result).toContain('ErrorDto');
        });

        it('should maintain existing behavior for referenced schemas', async () => {
            const pathsWithReferencedSchemas = {
                '/items/{id}': {
                    get: {
                        operationId: 'getItem',
                        summary: 'Get item',
                        parameters: [
                            {name: 'id', in: 'path' as const, required: true, schema: {type: 'string'}}
                        ],
                        responses: {
                            '200': {
                                description: 'Item found',
                                content: {
                                    'application/json': {
                                        schema: {$ref: '#/components/schemas/User'} // Using existing schema
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('item', pathsWithReferencedSchemas, testSpec);

            // Should use referenced DTO, not generate new one
            expect(result).toContain('): Promise<UserDto>');
            expect(result).not.toContain('GetItemResponseDto');
            expect(result).toContain('UserDto');
        });

        it('should handle array responses with inline item schemas', async () => {
            const pathsWithInlineArrayItems = {
                '/reports': {
                    get: {
                        operationId: 'getReports',
                        summary: 'Get reports',
                        responses: {
                            '200': {
                                description: 'List of reports',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: {type: 'string'},
                                                    title: {type: 'string'},
                                                    createdAt: {type: 'string', format: 'date-time'}
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

            const result = await controllerGenerator.generateController('report', pathsWithInlineArrayItems, testSpec);

            // Should handle array of inline objects as any[]
            expect(result).toContain('): Promise<any[]>');
            expect(result).not.toContain('GetReportsResponseDto');
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle responses without content', async () => {
            const pathsWithNoContent = {
                '/ping': {
                    get: {
                        operationId: 'ping',
                        summary: 'Ping endpoint',
                        responses: {
                            '200': {
                                description: 'Pong'
                                // No content defined
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('ping', pathsWithNoContent, testSpec);

            // Should return void for responses without content
            expect(result).toContain('): Promise<void>');
            expect(result).not.toContain('PingResponseDto');
        });

        it('should handle responses with multiple content types', async () => {
            const pathsWithMultipleContentTypes = {
                '/export': {
                    get: {
                        operationId: 'exportData',
                        summary: 'Export data',
                        responses: {
                            '200': {
                                description: 'Exported data',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                data: {type: 'array', items: {type: 'object'}}
                                            }
                                        }
                                    },
                                    'text/csv': {
                                        schema: {type: 'string'}
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('export', pathsWithMultipleContentTypes, testSpec);

            // Should prioritize application/json and generate DTO for it
            expect(result).toContain('): Promise<ExportDataResponseDto>');
            expect(result).toContain('ExportDataResponseDto');
        });

        it('should handle empty inline objects', async () => {
            const pathsWithEmptyObjects = {
                '/empty': {
                    get: {
                        operationId: 'getEmpty',
                        summary: 'Get empty object',
                        responses: {
                            '200': {
                                description: 'Empty object',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('empty', pathsWithEmptyObjects, testSpec);

            // Should generate DTO even for empty objects
            expect(result).toContain('): Promise<GetEmptyResponseDto>');
            expect(result).toContain('GetEmptyResponseDto');
        });

        it('should handle inline objects with additionalProperties', async () => {
            const pathsWithAdditionalProps = {
                '/dynamic': {
                    get: {
                        operationId: 'getDynamic',
                        summary: 'Get dynamic object',
                        responses: {
                            '200': {
                                description: 'Dynamic object',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                id: {type: 'string'}
                                            },
                                            additionalProperties: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const result = await controllerGenerator.generateController('dynamic', pathsWithAdditionalProps, testSpec);

            // Should generate DTO for objects with additionalProperties
            expect(result).toContain('): Promise<GetDynamicResponseDto>');
            expect(result).toContain('GetDynamicResponseDto');
        });
    });
});