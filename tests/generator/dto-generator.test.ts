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

      // Should reference proper DTO types now that we resolve refs
      expect(result).toContain('profile?: UserProfileDto');
      expect(result).toContain('preferences?: UserPreferencesDto');
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
      expect(result).toContain('notifications?: UserPreferencesNotificationsDto');
      
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

  describe('complex nested schema handling', () => {
    let complexSpec: OpenAPISpec;

    beforeEach(async () => {
      const complexSpecPath = path.join(__dirname, '../fixtures/complex-nested.openapi.yaml');
      complexSpec = await specParser.parseSpec(complexSpecPath);
    });

    it('should handle deeply nested schema references', async () => {
      const organizationSchema = complexSpec.components?.schemas?.Organization as SchemaObject;
      const result = await dtoGenerator.generateDto('OrganizationDto', organizationSchema, complexSpec);

      // Should properly reference nested DTOs
      expect(result).toContain('owner: UserDto');
      expect(result).toContain('members?: UserDto[]');
      expect(result).toContain('departments?: DepartmentDto[]');
      expect(result).toContain('settings: OrganizationSettingsDto');

      // Should include proper validation decorators for references
      expect(result).toContain('@ValidateNested()');
      expect(result).toContain('@Type(() => UserDto)');
      expect(result).toContain('@Type(() => OrganizationSettingsDto)');
    });

    it('should handle multiple levels of nesting', async () => {
      const userSchema = complexSpec.components?.schemas?.User as SchemaObject;
      const result = await dtoGenerator.generateDto('UserDto', userSchema, complexSpec);

      // Should handle nested profile with address
      expect(result).toContain('profile: UserProfileDto');
      expect(result).toContain('permissions?: PermissionDto[]');
      expect(result).toContain('preferences?: UserPreferencesDto');

      // Should include proper decorators
      expect(result).toContain('@ValidateNested()');
      expect(result).toContain('@Type(() => UserProfileDto)');
      expect(result).toContain('@Type(() => PermissionDto)');
    });

    it('should handle arrays of referenced objects', async () => {
      const departmentSchema = complexSpec.components?.schemas?.Department as SchemaObject;
      const result = await dtoGenerator.generateDto('DepartmentDto', departmentSchema, complexSpec);

      // Should handle arrays of referenced objects
      expect(result).toContain('employees?: UserDto[]');
      expect(result).toContain('projects?: ProjectDto[]');

      // Should include proper array validation decorators
      expect(result).toContain('@IsArray()');
      expect(result).toContain('@ValidateNested({ each: true })');
      expect(result).toContain('@Type(() => UserDto)');
      expect(result).toContain('@Type(() => ProjectDto)');
    });

    it('should handle optional vs required nested properties', async () => {
      const userProfileSchema = complexSpec.components?.schemas?.UserProfile as SchemaObject;
      const result = await dtoGenerator.generateDto('UserProfileDto', userProfileSchema, complexSpec);

      // Required properties should not have ?
      expect(result).toContain('firstName: string');
      expect(result).toContain('lastName: string');

      // Optional properties should have ?
      expect(result).toContain('avatar?: string');
      expect(result).toContain('address?: AddressDto');
      expect(result).toContain('socialLinks?: SocialLinkDto[]');

      // Optional properties should have @IsOptional()
      expect(result).toContain('@IsOptional()');
    });

    it('should detect and handle circular references', async () => {
      const milestoneSchema = complexSpec.components?.schemas?.Milestone as SchemaObject;
      const result = await dtoGenerator.generateDto('MilestoneDto', milestoneSchema, complexSpec);

      // Should handle self-referencing dependencies array by using 'any' to avoid circular reference
      expect(result).toContain('dependencies?: any[]');
      expect(result).toContain('@ValidateNested({ each: true })');
      expect(result).toContain('@Type(() => Object)');
    });

    it('should generate all DTOs with proper types', async () => {
      const schemas = complexSpec.components?.schemas || {};
      const result = await dtoGenerator.generateAllDtos(schemas, complexSpec);

      // Should contain all DTO class definitions
      expect(result).toContain('export class OrganizationDto');
      expect(result).toContain('export class UserDto');
      expect(result).toContain('export class UserProfileDto');
      expect(result).toContain('export class AddressDto');
      expect(result).toContain('export class DepartmentDto');

      // Should contain proper DTO type references
      expect(result).toContain('owner: UserDto');
      expect(result).toContain('profile: UserProfileDto');
    });

    it('should handle complex enum structures in nested schemas', async () => {
      const addressSchema = complexSpec.components?.schemas?.Address as SchemaObject;
      const result = await dtoGenerator.generateDto('AddressDto', addressSchema, complexSpec);

      // Should generate enum for country
      expect(result).toContain('export enum CountryEnum');
      expect(result).toContain('US = \'US\'');
      expect(result).toContain('CA = \'CA\'');
      expect(result).toContain('@IsEnum(CountryEnum)');
    });

    it('should handle nested objects with additional properties', async () => {
      const organizationSchema = complexSpec.components?.schemas?.Organization as SchemaObject;
      const result = await dtoGenerator.generateDto('OrganizationDto', organizationSchema, complexSpec);

      // Should handle metadata with additionalProperties
      expect(result).toContain('metadata?: object');
    });

    it('should handle complex validation patterns in nested schemas', async () => {
      const addressSchema = complexSpec.components?.schemas?.Address as SchemaObject;
      const result = await dtoGenerator.generateDto('AddressDto', addressSchema, complexSpec);

      // Should include pattern validation for postal code
      expect(result).toContain('@Matches(/^[0-9]{5}(-[0-9]{4})?$/)');
    });

    it('should handle nested arrays with inline object schemas', async () => {
      const createOrgSchema = complexSpec.components?.schemas?.CreateOrganizationRequest as SchemaObject;
      const result = await dtoGenerator.generateDto('CreateOrganizationRequestDto', createOrgSchema, complexSpec);

      // Should handle initialMembers array with inline object schema
      expect(result).toContain('initialMembers?: CreateOrganizationRequestInitialMembersItemDto[]');
      expect(result).toContain('@IsArray()');
      expect(result).toContain('@ValidateNested({ each: true })');
      expect(result).toContain('@Type(() => CreateOrganizationRequestInitialMembersItemDto)');
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

      expect(result).toContain('items?: ItemsListItemsItemDto[]');
      expect(result).toContain('@IsArray()');
      expect(result).toContain('@ValidateNested({ each: true })');
      expect(result).toContain('@Type(() => ItemsListItemsItemDto)');
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

      expect(result).toContain('config?: ConfigConfigDto');
      expect(result).toContain('@ValidateNested()');
      expect(result).toContain('@Type(() => ConfigConfigDto)');
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