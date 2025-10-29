import { DtoGenerator } from '../../src/generator/dto-generator';
import { SpecParser } from '../../src/parser/spec-parser';
import { SchemaObject, OpenAPISpec } from '../../src/types/openapi';
import * as path from 'path';

describe('DtoGenerator', () => {
  let dtoGenerator: DtoGenerator;
  let specParser: SpecParser;
  let testSpec: OpenAPISpec;

  beforeEach(async () => {
    dtoGenerator = new DtoGenerator();
    specParser = new SpecParser();
    
    const testSpecPath = path.join(__dirname, '../fixtures/user.openapi.yaml');
    testSpec = await specParser.parseSpec(testSpecPath);
  });

  describe('generateDto', () => {
    it('should generate DTO class with basic properties', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      expect(result).toContain('export class UserDto');
      expect(result).toContain('import { ApiProperty }');
      expect(result).toContain('IsString, IsNumber, IsBoolean');
      
      // Check for required properties
      expect(result).toContain('id: string');
      expect(result).toContain('email: string');
      expect(result).toContain('firstName: string');
      expect(result).toContain('lastName: string');
    });

    it('should generate proper validation decorators for string properties', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Email validation
      expect(result).toContain('@IsString()');
      expect(result).toContain('@IsEmail()');
      
      // String length validation
      expect(result).toContain('@MinLength(1)');
      expect(result).toContain('@MaxLength(50)');
      expect(result).toContain('@MaxLength(255)');
    });

    it('should generate proper validation decorators for numeric properties', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Age validation
      expect(result).toContain('@IsInt()');
      expect(result).toContain('@Min(13)');
      expect(result).toContain('@Max(120)');
    });

    it('should generate enum validation decorators', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Status enum
      expect(result).toContain('@IsEnum(StatusEnum)');
      // Role enum
      expect(result).toContain('@IsEnum(RoleEnum)');
    });

    it('should generate array validation decorators', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Tags array
      expect(result).toContain('@IsArray()');
      expect(result).toContain('tags?: string[]');
    });

    it('should handle optional properties correctly', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Required properties should not have ?
      expect(result).toContain('id: string');
      expect(result).toContain('email: string');
      
      // Optional properties should have ?
      expect(result).toContain('age?: number');
      expect(result).toContain('role?: string');
      
      // Optional properties should have @IsOptional()
      expect(result).toContain('@IsOptional()');
    });

    it('should generate ApiProperty decorators with proper options', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Check for ApiProperty with description
      expect(result).toContain("description: 'Unique identifier for the user'");
      expect(result).toContain("description: 'User\\'s email address'");
      
      // Check for examples
      expect(result).toContain('example: "123e4567-e89b-12d3-a456-426614174000"');
      expect(result).toContain('example: "john.doe@example.com"');
      
      // Check for enum options
      // expect(result).toContain("enum: ['active', 'inactive', 'pending']");
      // expect(result).toContain("enum: ['admin', 'user', 'moderator']");
    });

    it('should handle nested object references', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Should reference other DTOs as objects (since our generator doesn't resolve refs yet)
      expect(result).toContain('profile?: object');
      expect(result).toContain('preferences?: object');
    });

    it('should generate DTO for CreateUserRequest schema', async () => {
      const createUserSchema = testSpec.components?.schemas?.CreateUserRequest as SchemaObject;
      const result = await dtoGenerator.generateDto('CreateUserRequestDto', createUserSchema, testSpec);

      expect(result).toContain('export class CreateUserRequestDto');
      
      // Required fields should not have ?
      expect(result).toContain('email: string');
      expect(result).toContain('firstName: string');
      expect(result).toContain('lastName: string');
      expect(result).toContain('password: string');
      
      // Optional fields should have ?
      expect(result).toContain('age?: number');
      expect(result).toContain('role?: string');
      
      // Password validation
      expect(result).toContain('@MinLength(8)');
      expect(result).toContain('@MaxLength(128)');
      expect(result).toContain('@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/)');
    });

    it('should generate DTO for UserProfile schema with pattern validation', async () => {
      const profileSchema = testSpec.components?.schemas?.UserProfile as SchemaObject;
      const result = await dtoGenerator.generateDto('UserProfileDto', profileSchema, testSpec);

      expect(result).toContain('export class UserProfileDto');
      
      // Phone number pattern validation
      expect(result).toContain('@Matches(/^\\+?[1-9]\\d{1,14}$/)');
      
      // URI format validation
      expect(result).toContain('avatar?: string');
      expect(result).toContain('website?: string');
      
      // All properties should be optional in profile
      expect(result).toContain('bio?: string');
      expect(result).toContain('location?: string');
    });

    it('should handle complex nested structures', async () => {
      const preferencesSchema = testSpec.components?.schemas?.UserPreferences as SchemaObject;
      const result = await dtoGenerator.generateDto('UserPreferencesDto', preferencesSchema, testSpec);

      expect(result).toContain('export class UserPreferencesDto');
      
      // Should handle nested object properties
      expect(result).toContain('notifications?: object');
      
      // Should handle pattern validation for language
      expect(result).toContain('@Matches(/^[a-z]{2}(-[A-Z]{2})?$/)');
      
      // Should handle enum for theme
      expect(result).toContain("enum: ['light', 'dark', 'auto']");
    });
  });

  describe('type mapping', () => {
    it('should map OpenAPI types to TypeScript types correctly', async () => {
      const testSchema: SchemaObject = {
        type: 'object',
        properties: {
          stringProp: { type: 'string' },
          numberProp: { type: 'number' },
          integerProp: { type: 'integer' },
          booleanProp: { type: 'boolean' },
          arrayProp: { type: 'array', items: { type: 'string' } },
          objectProp: { type: 'object' }
        },
        required: ['stringProp', 'numberProp', 'integerProp', 'booleanProp']
      };

      const result = await dtoGenerator.generateDto('TestDto', testSchema, testSpec);

      expect(result).toContain('stringProp: string');
      expect(result).toContain('numberProp: number');
      expect(result).toContain('integerProp: number');
      expect(result).toContain('booleanProp: boolean');
      expect(result).toContain('arrayProp?: string[]');
      expect(result).toContain('objectProp?: object');
    });
  });

  describe('validation decorator generation', () => {
    it('should generate correct decorators for different validation scenarios', async () => {
      const testSchema: SchemaObject = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 255
          },
          age: {
            type: 'integer',
            minimum: 0,
            maximum: 150
          },
          score: {
            type: 'number',
            minimum: 0.0,
            maximum: 100.0
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive']
          },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['email', 'age']
      };

      const result = await dtoGenerator.generateDto('ValidationTestDto', testSchema, testSpec);

      // Email validations
      expect(result).toContain('@IsString()');
      expect(result).toContain('@IsEmail()');
      expect(result).toContain('@MaxLength(255)');

      // Integer validations
      expect(result).toContain('@IsInt()');
      expect(result).toContain('@Min(0)');
      expect(result).toContain('@Max(150)');

      // Number validations
      expect(result).toContain('@IsNumber()');
      expect(result).toContain('@Max(100)');

      // Enum validations
      expect(result).toContain('@IsEnum(StatusEnum)');

      // Array validations
      expect(result).toContain('@IsArray()');

      // Optional validations
      expect(result).toContain('@IsOptional()');
    });
  });

  describe('edge cases', () => {
    it('should handle schema without properties', async () => {
      const emptySchema: SchemaObject = {
        type: 'object'
      };

      const result = await dtoGenerator.generateDto('EmptyDto', emptySchema, testSpec);

      expect(result).toContain('export class EmptyDto');
      expect(result).toContain('import { ApiProperty }');
      // Should not contain any property definitions
      expect(result.split('\n').filter(line => line.includes(': ')).length).toBe(0);
    });

    it('should handle schema with additionalProperties', async () => {
      const userSchema = testSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, testSpec);

      // Should handle metadata object with additionalProperties
      expect(result).toContain('metadata?: object');
    });

    it('should handle array of objects with references', async () => {
      const testSchema: SchemaObject = {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User'
            }
          }
        }
      };

      const result = await dtoGenerator.generateDto('UsersListDto', testSchema, testSpec);

      expect(result).toContain('users?: UserDto[]');
      expect(result).toContain('@IsArray()');
      expect(result).toContain('@ValidateNested({ each: true })');
      expect(result).toContain('@Type(() => UserDto)');
    });

    it('should handle array of inline objects with @Type(() => Object)', async () => {
      const testSchema: SchemaObject = {
        type: 'object',
        properties: {
          items: {
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
      };

      const result = await dtoGenerator.generateDto('ItemsListDto', testSchema, testSpec);

      expect(result).toContain('items?: object[]');
      expect(result).toContain('@IsArray()');
      expect(result).toContain('@ValidateNested({ each: true })');
      expect(result).toContain('@Type(() => Object)');
    });

    it('should handle nested objects with @Type(() => Object)', async () => {
      const testSchema: SchemaObject = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              setting1: { type: 'string' },
              setting2: { type: 'number' }
            }
          }
        }
      };

      const result = await dtoGenerator.generateDto('ConfigDto', testSchema, testSpec);

      expect(result).toContain('config?: object');
      expect(result).toContain('@ValidateNested()');
      expect(result).toContain('@Type(() => Object)');
    });

    it('should use capitalized types in @ApiProperty type parameter', async () => {
      const testSchema: SchemaObject = {
        type: 'object',
        properties: {
          stringArray: {
            type: 'array',
            items: { type: 'string' }
          },
          numberArray: {
            type: 'array',
            items: { type: 'number' }
          },
          objectArray: {
            type: 'array',
            items: { type: 'object' }
          }
        }
      };

      const result = await dtoGenerator.generateDto('ArrayTestDto', testSchema, testSpec);

      expect(result).toContain('type: () => String');
      expect(result).toContain('type: () => Number');
      expect(result).toContain('type: () => Object');
    });
  });
});