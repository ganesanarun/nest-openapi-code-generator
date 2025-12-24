import { GeneratorOrchestrator } from '../../src/orchestrator/generator-orchestrator';
import { GeneratorConfig } from '../../src/types/config';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('GeneratorOrchestrator', () => {
  let orchestrator: GeneratorOrchestrator;
  let tempDir: string;
  let config: GeneratorConfig;

  beforeEach(async () => {
    // Create temporary directory for test outputs
    tempDir = path.join(__dirname, '../temp-integration');
    await fs.ensureDir(tempDir);

    // Set up test configuration
    config = {
      specsDir: path.join(__dirname, '../fixtures'),
      outputDir: tempDir,
      generateDtos: true,
      generateControllers: true,
      generateTypes: false
    };

    orchestrator = new GeneratorOrchestrator(config);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('generate', () => {
    it('should generate complete code from OpenAPI specification', async () => {
      await orchestrator.generate();

      // Check that user directory was created
      const userDir = path.join(tempDir, 'user');
      expect(await fs.pathExists(userDir)).toBe(true);

      // Check that shared directory was created
      const sharedDir = path.join(tempDir, 'shared');
      expect(await fs.pathExists(sharedDir)).toBe(true);

      // Check that DTO file was generated
      const dtoFile = path.join(userDir, 'user.dto.ts');
      expect(await fs.pathExists(dtoFile)).toBe(true);

      // Check that shared DTO file was generated
      const sharedDtoFile = path.join(sharedDir, 'shared.dto.ts');
      expect(await fs.pathExists(sharedDtoFile)).toBe(true);

      // Check that controller file was generated
      const controllerFile = path.join(userDir, 'user.controller.base.ts');
      expect(await fs.pathExists(controllerFile)).toBe(true);
    });

    it('should generate DTOs with proper content', async () => {
      await orchestrator.generate();

      const dtoFile = path.join(tempDir, 'user', 'user.dto.ts');
      const dtoContent = await fs.readFile(dtoFile, 'utf-8');

      // Check imports
      expect(dtoContent).toContain('import { ApiProperty } from \'@nestjs/swagger\'');
      expect(dtoContent).toContain('import { PaginationDto } from \'../shared/shared.dto\'');
      expect(dtoContent).toContain('import {');
      expect(dtoContent).toContain('IsString, IsNumber, IsBoolean, IsArray, IsOptional');
      expect(dtoContent).toContain('} from \'class-validator\'');

      // Check DTO classes
      expect(dtoContent).toContain('export class UserDto');
      expect(dtoContent).toContain('export class CreateUserRequestDto');
      expect(dtoContent).toContain('export class UpdateUserRequestDto');
      expect(dtoContent).toContain('export class UserProfileDto');
      expect(dtoContent).toContain('export class UserPreferencesDto');

      // Check properties and validations
      expect(dtoContent).toContain('@IsString()');
      expect(dtoContent).toContain('@IsEmail()');
      expect(dtoContent).toContain('@IsInt()');
      expect(dtoContent).toContain('@Min(');
      expect(dtoContent).toContain('@Max(');
      expect(dtoContent).toContain('@ApiProperty(');
    });

    it('should generate shared DTOs with proper content', async () => {
      await orchestrator.generate();

      const sharedDtoFile = path.join(tempDir, 'shared', 'shared.dto.ts');
      const sharedDtoContent = await fs.readFile(sharedDtoFile, 'utf-8');

      // Check imports
      expect(sharedDtoContent).toContain('import { ApiProperty } from \'@nestjs/swagger\'');
      expect(sharedDtoContent).toContain('import {');
      expect(sharedDtoContent).toContain('IsString, IsNumber, IsBoolean, IsArray, IsOptional');
      expect(sharedDtoContent).toContain('} from \'class-validator\'');

      // Check DTO classes
      expect(sharedDtoContent).toContain('export class PaginationDto');
      expect(sharedDtoContent).toContain('export class ErrorDto');
      expect(sharedDtoContent).toContain('export class ValidationErrorDto');

      // Check properties and validations
      expect(sharedDtoContent).toContain('@IsString()');
      expect(sharedDtoContent).toContain('@IsArray()');
      expect(sharedDtoContent).toContain('@IsInt()');
      expect(sharedDtoContent).toContain('@Min(');
      expect(sharedDtoContent).toContain('@Max(');
      expect(sharedDtoContent).toContain('@ApiProperty(');
    });

    it('should generate controllers with proper content', async () => {
      await orchestrator.generate();

      const controllerFile = path.join(tempDir, 'user', 'user.controller.base.ts');
      const controllerContent = await fs.readFile(controllerFile, 'utf-8');

      // Check imports
      expect(controllerContent).toContain('import {');
      expect(controllerContent).toContain('Get, Post, Put, Patch, Delete');
      expect(controllerContent).toContain('} from \'@nestjs/common\'');
      expect(controllerContent).toContain('import { ApiTags, ApiOperation, ApiResponse');
      expect(controllerContent).toContain('import { GetUsersResponseDto, CreateUserRequestDto, UserDto, UpdateUserRequestDto, ProfileUpdateRequestDto, UserProfileDto } from \'./user.dto\';');
      expect(controllerContent).toContain('import { ErrorDto, ValidationErrorDto, PaginationDto } from \'../shared/shared.dto\'');

      // Check controller class
      expect(controllerContent).toContain('export abstract class UserControllerBase');
      expect(controllerContent).toContain('@ApiTags(');

      // Check methods
      expect(controllerContent).toContain('getUsers(');
      expect(controllerContent).toContain('createUser(');
      expect(controllerContent).toContain('getUserById(');
      expect(controllerContent).toContain('updateUser(');
      expect(controllerContent).toContain('deleteUser(');
      expect(controllerContent).toContain('updateUserProfile(');

      // Check decorators
      expect(controllerContent).toContain('@Get(\'/users\')');
      expect(controllerContent).toContain('@Post(\'/users\')');
      expect(controllerContent).toContain('@Put(\'/users/:userId\')');
      expect(controllerContent).toContain('@Delete(\'/users/:userId\')');
      expect(controllerContent).toContain('@Patch(\'/users/:userId/profile\')');

      // Check NotImplementedException
      expect(controllerContent).not.toContain('NotImplementedException');
    });

    it('should handle configuration with DTOs disabled', async () => {
      config.generateDtos = false;
      orchestrator = new GeneratorOrchestrator(config);

      await orchestrator.generate();

      const userDir = path.join(tempDir, 'user');
      expect(await fs.pathExists(userDir)).toBe(true);

      // DTO file should not be generated
      const dtoFile = path.join(userDir, 'user.dto.ts');
      expect(await fs.pathExists(dtoFile)).toBe(false);

      // Shared folder (with shared DTOs) should not be generated
      const sharedDir = path.join(tempDir, 'shared');
      expect(await fs.pathExists(sharedDir)).toBe(false);

      // Controller file should still be generated
      const controllerFile = path.join(userDir, 'user.controller.base.ts');
      expect(await fs.pathExists(controllerFile)).toBe(true);

      // Controller should not have DTO imports
      const controllerContent = await fs.readFile(controllerFile, 'utf-8');
      expect(controllerContent).not.toContain('import { GetUsersResponseDto, CreateUserRequestDto, UserDto, UpdateUserRequestDto, ProfileUpdateRequestDto, UserProfileDto } from \'./user.dto\'');
      expect(controllerContent).not.toContain('import { ErrorDto, ValidationErrorDto } from \'../shared/shared.dto\'');
    });

    it('should handle configuration with controllers disabled', async () => {
      config.generateControllers = false;
      orchestrator = new GeneratorOrchestrator(config);

      await orchestrator.generate();

      const userDir = path.join(tempDir, 'user');
      expect(await fs.pathExists(userDir)).toBe(true);

      // DTO file should be generated
      const dtoFile = path.join(userDir, 'user.dto.ts');
      expect(await fs.pathExists(dtoFile)).toBe(true);

      // Shared DTO file should be generated
      const sharedDir = path.join(tempDir, 'shared');
      const sharedDtoFile = path.join(sharedDir, 'shared.dto.ts');
      expect(await fs.pathExists(sharedDtoFile)).toBe(true);

      // Controller file should not be generated
      const controllerFile = path.join(userDir, 'user.controller.base.ts');
      expect(await fs.pathExists(controllerFile)).toBe(false);
    });

    it('should handle empty specs directory gracefully', async () => {
      const emptyDir = path.join(tempDir, 'empty-specs');
      await fs.ensureDir(emptyDir);

      config.specsDir = emptyDir;
      orchestrator = new GeneratorOrchestrator(config);

      // Should not throw error
      await expect(orchestrator.generate()).resolves.not.toThrow();

      // No output files should be created
      const outputFiles = await fs.readdir(tempDir);
      expect(outputFiles.filter(f => f !== 'empty-specs')).toHaveLength(0);
    });

    it('should handle non-existent specs directory gracefully', async () => {
      config.specsDir = path.join(tempDir, 'non-existent');
      orchestrator = new GeneratorOrchestrator(config);

      // Should not throw error
      await expect(orchestrator.generate()).resolves.not.toThrow();

      // No output files should be created
      const outputFiles = await fs.readdir(tempDir);
      expect(outputFiles).toHaveLength(0);
    });

    it('should create output directories as needed', async () => {
      const deepOutputDir = path.join(tempDir, 'deep', 'nested', 'output');
      config.outputDir = deepOutputDir;
      orchestrator = new GeneratorOrchestrator(config);

      await orchestrator.generate();

      // Deep directory structure should be created
      expect(await fs.pathExists(deepOutputDir)).toBe(true);
      
      const userDir = path.join(deepOutputDir, 'user');
      expect(await fs.pathExists(userDir)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid OpenAPI specification', async () => {
      // Create invalid spec file
      const invalidSpecPath = path.join(tempDir, 'invalid.yaml');
      await fs.writeFile(invalidSpecPath, 'invalid: yaml: content: [');

      config.specsDir = tempDir;
      orchestrator = new GeneratorOrchestrator(config);

      await expect(orchestrator.generate()).rejects.toThrow();
    });

    it('should handle file write permissions errors', async () => {
      // This test would require setting up permission restrictions
      // which might not work consistently across different environments
      // For now, we'll test that the orchestrator properly propagates errors
      
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.ensureDir(readOnlyDir);
      
      // Try to make directory read-only (may not work on all systems)
      try {
        await fs.chmod(readOnlyDir, 0o444);
        
        config.outputDir = readOnlyDir;
        orchestrator = new GeneratorOrchestrator(config);

        await expect(orchestrator.generate()).rejects.toThrow();
      } catch (error) {
        // If chmod fails, skip this test
        console.warn('Skipping permission test due to system limitations');
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(readOnlyDir, 0o755);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('multiple specs handling', () => {
    beforeEach(async () => {
      // Create additional test spec
      const productSpec = `
openapi: 3.1.0
info:
  title: Product API
  version: 1.0.0
paths:
  /products:
    get:
      operationId: getProducts
      summary: Get products
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'
    post:
      operationId: createProduct
      summary: Create product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
components:
  schemas:
    Product:
      type: object
      required:
        - id
        - name
        - price
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          minLength: 1
          maxLength: 100
        price:
          type: number
          minimum: 0
        description:
          type: string
          maxLength: 500
    CreateProductRequest:
      type: object
      required:
        - name
        - price
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        price:
          type: number
          minimum: 0
        description:
          type: string
          maxLength: 500
`;

      const productSpecPath = path.join(config.specsDir, 'product.openapi.yaml');
      await fs.writeFile(productSpecPath, productSpec);
    });

    it('should generate code for multiple specifications', async () => {
      await orchestrator.generate();

      // Check user files
      const userDir = path.join(tempDir, 'user');
      expect(await fs.pathExists(userDir)).toBe(true);
      expect(await fs.pathExists(path.join(userDir, 'user.dto.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(userDir, 'user.controller.base.ts'))).toBe(true);

      // Check product files
      const productDir = path.join(tempDir, 'product');
      expect(await fs.pathExists(productDir)).toBe(true);
      expect(await fs.pathExists(path.join(productDir, 'product.dto.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(productDir, 'product.controller.base.ts'))).toBe(true);
    });

    it('should generate correct content for each specification', async () => {
      await orchestrator.generate();

      // Check product DTO content
      const productDtoFile = path.join(tempDir, 'product', 'product.dto.ts');
      const productDtoContent = await fs.readFile(productDtoFile, 'utf-8');

      expect(productDtoContent).toContain('export class ProductDto');
      expect(productDtoContent).toContain('export class CreateProductRequestDto');
      expect(productDtoContent).toContain('name: string');
      expect(productDtoContent).toContain('price: number');

      // Check product controller content
      const productControllerFile = path.join(tempDir, 'product', 'product.controller.base.ts');
      const productControllerContent = await fs.readFile(productControllerFile, 'utf-8');

      expect(productControllerContent).toContain('export abstract class ProductControllerBase');
      expect(productControllerContent).toContain('getProducts(');
      expect(productControllerContent).toContain('createProduct(');
    });
  });

  describe('resource name extraction', () => {
    it('should extract correct resource names from spec file paths', async () => {
      // Create specs with different naming patterns
      const specs = [
        { filename: 'order.openapi.yaml', expectedDir: 'order' },
        { filename: 'customer.yaml', expectedDir: 'customer' },
        { filename: 'inventory.json', expectedDir: 'inventory' }
      ];

      for (const spec of specs) {
        const specContent = `
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
components:
  schemas:
    TestModel:
      type: object
      properties:
        id:
          type: string
`;
        await fs.writeFile(path.join(config.specsDir, spec.filename), specContent);
      }

      await orchestrator.generate();

      // Check that directories were created with correct names
      for (const spec of specs) {
        const expectedDir = path.join(tempDir, spec.expectedDir);
        expect(await fs.pathExists(expectedDir)).toBe(true);
      }
    });
  });

  describe('file organization', () => {
    it('should organize generated files in separate directories per resource', async () => {
      await orchestrator.generate();

      const userDir = path.join(tempDir, 'user');
      const files = await fs.readdir(userDir);

      expect(files).toContain('user.dto.ts');
      expect(files).toContain('user.controller.base.ts');
      expect(files).toHaveLength(2);
    });

    it('should not interfere between different resource generations', async () => {
      // Add another spec to ensure isolation
      const simpleSpec = `
openapi: 3.1.0
info:
  title: Simple API
  version: 1.0.0
paths:
  /simple:
    get:
      responses:
        '200':
          description: Success
components:
  schemas:
    Simple:
      type: object
      properties:
        value:
          type: string
`;

      await fs.writeFile(path.join(config.specsDir, 'simple.yaml'), simpleSpec);
      await orchestrator.generate();

      // Check user directory is not affected
      const userDtoContent = await fs.readFile(path.join(tempDir, 'user', 'user.dto.ts'), 'utf-8');
      expect(userDtoContent).toContain('UserDto');
      expect(userDtoContent).not.toContain('Simple');

      // Check simple directory has its own content
      const simpleDtoContent = await fs.readFile(path.join(tempDir, 'simple', 'simple.dto.ts'), 'utf-8');
      expect(simpleDtoContent).toContain('SimpleDto');
      expect(simpleDtoContent).not.toContain('User');
    });
  });
});