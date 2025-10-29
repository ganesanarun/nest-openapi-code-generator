import { SpecParser } from '../../src/parser/spec-parser';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('SpecParser', () => {
  let specParser: SpecParser;
  const fixturesDir = path.join(__dirname, '../fixtures');
  const testSpecPath = path.join(fixturesDir, 'user.openapi.yaml');

  beforeEach(() => {
    specParser = new SpecParser();
  });

  describe('parseSpec', () => {
    it('should successfully parse a valid OpenAPI specification', async () => {
      const spec = await specParser.parseSpec(testSpecPath);

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('User Management API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
    });

    it('should validate OpenAPI spec structure', async () => {
      const spec = await specParser.parseSpec(testSpecPath);

      // Validate paths structure
      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].post).toBeDefined();
      expect(spec.paths['/users/{userId}']).toBeDefined();
      expect(spec.paths['/users/{userId}'].get).toBeDefined();
      expect(spec.paths['/users/{userId}'].put).toBeDefined();
      expect(spec.paths['/users/{userId}'].delete).toBeDefined();

      // Validate components structure
      expect(spec.components?.schemas).toBeDefined();
      expect(spec.components?.schemas?.User).toBeDefined();
      expect(spec.components?.schemas?.CreateUserRequest).toBeDefined();
      expect(spec.components?.schemas?.UpdateUserRequest).toBeDefined();
    });

    it('should throw error for non-existent spec file', async () => {
      const nonExistentPath = path.join(fixturesDir, 'non-existent.yaml');

      await expect(specParser.parseSpec(nonExistentPath))
        .rejects
        .toThrow(/Failed to parse OpenAPI spec/);
    });

    it('should validate spec content and structure', async () => {
      const spec = await specParser.parseSpec(testSpecPath);

      // Validate operation IDs
      expect(spec.paths['/users']?.get?.operationId).toBe('getUsers');
      expect(spec.paths['/users']?.post?.operationId).toBe('createUser');
      expect(spec.paths['/users/{userId}']?.get?.operationId).toBe('getUserById');

      // Validate tags
      expect(spec.paths['/users']?.get?.tags).toContain('users');
      expect(spec.paths['/users/{userId}/profile']?.patch?.tags).toContain('users');
      expect(spec.paths['/users/{userId}/profile']?.patch?.tags).toContain('profile');

      // Validate parameters
      const getUsersOp = spec.paths['/users']?.get;
      expect(getUsersOp?.parameters).toBeDefined();
      expect(getUsersOp?.parameters?.length).toBeGreaterThan(0);
      
      const pageParam = getUsersOp?.parameters?.find(p => p.name === 'page');
      expect(pageParam).toBeDefined();
      expect(pageParam?.in).toBe('query');
      expect(pageParam?.schema?.type).toBe('integer');
    });
  });

  describe('findSpecs', () => {
    it('should find OpenAPI spec files in directory', async () => {
      const specs = await specParser.findSpecs(fixturesDir);

      expect(specs).toBeDefined();
      expect(Array.isArray(specs)).toBe(true);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs).toContain(testSpecPath);
    });

    it('should return empty array for non-existent directory', async () => {
      const nonExistentDir = path.join(__dirname, 'non-existent-dir');
      const specs = await specParser.findSpecs(nonExistentDir);

      expect(specs).toBeDefined();
      expect(Array.isArray(specs)).toBe(true);
      expect(specs.length).toBe(0);
    });

    it('should filter files by OpenAPI extensions', async () => {
      // Create temporary directory with mixed files
      const tempDir = path.join(__dirname, '../temp-test');
      await fs.ensureDir(tempDir);

      try {
        // Create test files
        await fs.writeFile(path.join(tempDir, 'spec1.yaml'), 'openapi: 3.1.0');
        await fs.writeFile(path.join(tempDir, 'spec2.yml'), 'openapi: 3.1.0');
        await fs.writeFile(path.join(tempDir, 'spec3.json'), '{"openapi": "3.1.0"}');
        await fs.writeFile(path.join(tempDir, 'readme.txt'), 'Not a spec file');
        await fs.writeFile(path.join(tempDir, 'config.js'), 'module.exports = {}');

        const specs = await specParser.findSpecs(tempDir);

        expect(specs.length).toBe(3);
        expect(specs.some(s => s.endsWith('.yaml'))).toBe(true);
        expect(specs.some(s => s.endsWith('.yml'))).toBe(true);
        expect(specs.some(s => s.endsWith('.json'))).toBe(true);
        expect(specs.some(s => s.endsWith('.txt'))).toBe(false);
        expect(specs.some(s => s.endsWith('.js'))).toBe(false);
      } finally {
        // Clean up
        await fs.remove(tempDir);
      }
    });
  });

  describe('resolveRef', () => {
    let spec: any;

    beforeEach(async () => {
      spec = await specParser.parseSpec(testSpecPath);
    });

    it('should resolve component schema references', () => {
      const userSchema = specParser.resolveRef(spec, '#/components/schemas/User');

      expect(userSchema).toBeDefined();
      expect(userSchema.type).toBe('object');
      expect(userSchema.properties).toBeDefined();
      expect(userSchema.properties.id).toBeDefined();
      expect(userSchema.properties.email).toBeDefined();
      expect(userSchema.required).toContain('id');
      expect(userSchema.required).toContain('email');
    });

    it('should resolve nested references', () => {
      const createUserSchema = specParser.resolveRef(spec, '#/components/schemas/CreateUserRequest');

      expect(createUserSchema).toBeDefined();
      expect(createUserSchema.type).toBe('object');
      expect(createUserSchema.properties.email).toBeDefined();
      expect(createUserSchema.properties.email.format).toBe('email');
    });

    it('should handle deep reference paths', () => {
      const emailProperty = specParser.resolveRef(spec, '#/components/schemas/User/properties/email');

      expect(emailProperty).toBeDefined();
      expect(emailProperty.type).toBe('string');
      expect(emailProperty.format).toBe('email');
    });

    it('should return undefined for invalid references', () => {
      const result = specParser.resolveRef(spec, '#/components/schemas/NonExistent');

      expect(result).toBeUndefined();
    });
  });

  describe('extractResourceName', () => {
    it('should extract resource name from spec file path', () => {
      const testCases = [
        { path: '/path/to/user.openapi.yaml', expected: 'user' },
        { path: '/path/to/product.openapi.yml', expected: 'product' },
        { path: '/path/to/order.yaml', expected: 'order' },
        { path: '/path/to/customer.json', expected: 'customer' },
        { path: 'simple.openapi.yaml', expected: 'simple' },
        { path: 'nested/path/service.openapi.json', expected: 'service' }
      ];

      testCases.forEach(({ path, expected }) => {
        const result = specParser.extractResourceName(path);
        expect(result).toBe(expected);
      });
    });

    it('should handle paths without openapi suffix', () => {
      const result = specParser.extractResourceName('/path/to/api.yaml');
      expect(result).toBe('api');
    });

    it('should handle paths with multiple dots', () => {
      const result = specParser.extractResourceName('/path/to/user.v1.openapi.yaml');
      expect(result).toBe('user.v1');
    });
  });

  describe('integration with real OpenAPI features', () => {
    let spec: any;

    beforeEach(async () => {
      spec = await specParser.parseSpec(testSpecPath);
    });

    it('should handle OpenAPI 3.1 features', () => {
      expect(spec.openapi).toBe('3.1.0');
      
      // Check for OpenAPI 3.1 specific features in our test spec
      const userSchema = spec.components.schemas.User;
      expect(userSchema.properties.metadata).toBeDefined();
      expect(userSchema.properties.metadata.additionalProperties).toBe(true);
    });

    it('should validate enum values', () => {
      const userSchema = spec.components.schemas.User;
      expect(userSchema.properties.status.enum).toEqual(['active', 'inactive', 'pending']);
      expect(userSchema.properties.role.enum).toEqual(['admin', 'user', 'moderator']);
    });

    it('should validate string formats and patterns', () => {
      const userSchema = spec.components.schemas.User;
      expect(userSchema.properties.email.format).toBe('email');
      expect(userSchema.properties.id.format).toBe('uuid');

      const profileSchema = spec.components.schemas.UserProfile;
      expect(profileSchema.properties.phoneNumber.pattern).toBeDefined();
      expect(profileSchema.properties.website.format).toBe('uri');
    });

    it('should validate numeric constraints', () => {
      const userSchema = spec.components.schemas.User;
      expect(userSchema.properties.age.minimum).toBe(13);
      expect(userSchema.properties.age.maximum).toBe(120);

      const paginationSchema = spec.components.schemas.Pagination;
      expect(paginationSchema.properties.page.minimum).toBe(1);
      expect(paginationSchema.properties.limit.maximum).toBe(100);
    });

    it('should validate string length constraints', () => {
      const userSchema = spec.components.schemas.User;
      expect(userSchema.properties.firstName.minLength).toBe(1);
      expect(userSchema.properties.firstName.maxLength).toBe(50);
      expect(userSchema.properties.email.maxLength).toBe(255);

      const profileSchema = spec.components.schemas.UserProfile;
      expect(profileSchema.properties.bio.maxLength).toBe(500);
    });

    it('should validate array properties', () => {
      const userSchema = spec.components.schemas.User;
      expect(userSchema.properties.tags.type).toBe('array');
      expect(userSchema.properties.tags.items.type).toBe('string');
    });

    it('should validate nested object references', () => {
      const userSchema = spec.components.schemas.User;
      // SwaggerParser may resolve references, so check if either $ref exists or the resolved object
      expect(userSchema.properties.profile.$ref || userSchema.properties.profile.type).toBeDefined();
      expect(userSchema.properties.preferences.$ref || userSchema.properties.preferences.type).toBeDefined();
    });
  });
});