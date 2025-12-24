import { ControllerGenerator } from '../../src/generator/controller-generator';
import { ServiceGenerator } from '../../src/generator/service-generator';
import { SpecParser } from '../../src/parser/spec-parser';
import { GeneratorOrchestrator } from '../../src/orchestrator/generator-orchestrator';
import { OpenAPISpec } from '../../src/types/openapi';
import { GeneratorConfig } from '../../src/types/config';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Template Customization', () => {
  let specParser: SpecParser;
  let testSpec: OpenAPISpec;
  const tempDir = path.join(__dirname, '../temp-templates');

  beforeAll(async () => {
    specParser = new SpecParser();
    const testSpecPath = path.join(__dirname, '../fixtures/user.openapi.yaml');
    testSpec = await specParser.parseSpec(testSpecPath);

    // Create temp directory for test templates
    await fs.ensureDir(tempDir);
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('ControllerGenerator with custom templates', () => {
    it('should use custom controller template with different structure', async () => {
      const customTemplateDir = path.join(__dirname, '../fixtures/custom-templates');
      const controllerGenerator = new ControllerGenerator(customTemplateDir);
      
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Custom template should generate different structure
      expect(result).toContain('export class UserControllerController'); // Not "Base"
      expect(result).toContain('constructor(private readonly userControllerService: UserControllerService)');
      expect(result).toContain('return this.userControllerService.'); // Service calls instead of NotImplementedException
      expect(result).toContain('async getUsers('); // async methods
      expect(result).toContain('async createUser(');
      expect(result).toContain('async getUserById(');
    });

    it('should handle missing custom templates gracefully', async () => {
      const nonExistentTemplateDir = path.join(__dirname, '../fixtures/non-existent-templates');
      const controllerGenerator = new ControllerGenerator(nonExistentTemplateDir);
      
      const result = await controllerGenerator.generateController('user', testSpec.paths, testSpec);

      // Should fallback to default template
      expect(result).toContain('export abstract class UserControllerBase');
      expect(result).toContain('return this.');
    });
  });

  describe('ServiceGenerator with custom templates', () => {
    it('should generate services using custom templates', async () => {
      const customTemplateDir = path.join(__dirname, '../fixtures/custom-templates');
      const serviceGenerator = new ServiceGenerator(customTemplateDir);
      
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      // Should use service template
      expect(result).toContain('export class UserService');
      expect(result).toContain('private readonly logger = new Logger');
      expect(result).toContain('async getUsers(');
      expect(result).toContain('async createUser(');
      expect(result).toContain('this.logger.log(\'Executing');
    });

    it('should fallback to default service template when custom template missing', async () => {
      const serviceGenerator = new ServiceGenerator(); // No template dir
      
      const result = await serviceGenerator.generateService('user', testSpec.paths, testSpec);

      // Should use default service template
      expect(result).toContain('export class UserService');
      expect(result).toContain('throw new Error(\'Method not implemented\')');
    });
  });

  describe('GeneratorOrchestrator with template configuration', () => {
    it('should use custom templates when configured', async () => {
      const customTemplateDir = path.join(__dirname, '../fixtures/custom-templates');
      const outputDir = path.join(tempDir, 'custom-output');
      
      const config: GeneratorConfig = {
        specsDir: path.join(__dirname, '../fixtures'),
        outputDir,
        generateControllers: true,
        generateDtos: true,
        generateTypes: true,
        generateServices: true,
        templateDir: customTemplateDir
      };

      const orchestrator = new GeneratorOrchestrator(config);
      
      // Create a single spec file for testing
      const testSpecPath = path.join(tempDir, 'test.openapi.yaml');
      await fs.copy(
        path.join(__dirname, '../fixtures/user.openapi.yaml'),
        testSpecPath
      );

      // Create a folder for ref schemas and copy schemas folder there
      const specsSchemasDir = path.join(tempDir, 'schemas');
      await fs.ensureDir(specsSchemasDir);
      await fs.copy(
        path.join(__dirname, '../fixtures/schemas'),
        specsSchemasDir
      );

      // Update config to use temp directory
      config.specsDir = tempDir;
      const testOrchestrator = new GeneratorOrchestrator(config);
      
      await testOrchestrator.generate();

      // Check that files were generated
      const controllerPath = path.join(outputDir, 'test/test.controller.base.ts');
      const servicePath = path.join(outputDir, 'test/test.service.ts');
      
      expect(await fs.pathExists(controllerPath)).toBe(true);
      expect(await fs.pathExists(servicePath)).toBe(true);

      // Check controller content uses custom template
      const controllerContent = await fs.readFile(controllerPath, 'utf-8');
      expect(controllerContent).toContain('export class TestControllerController');
      expect(controllerContent).toContain('return this.userControllerService.');

      // Check service content
      const serviceContent = await fs.readFile(servicePath, 'utf-8');
      expect(serviceContent).toContain('export class TestService');
      expect(serviceContent).toContain('this.logger.log(\'Executing');
    });

    it('should generate only controllers when services disabled', async () => {
      const outputDir = path.join(tempDir, 'controllers-only');
      
      const config: GeneratorConfig = {
        specsDir: tempDir,
        outputDir,
        generateControllers: true,
        generateDtos: true,
        generateTypes: true,
        generateServices: false // Disabled
      };

      const orchestrator = new GeneratorOrchestrator(config);
      await orchestrator.generate();

      // Check that only controller was generated
      const controllerPath = path.join(outputDir, 'test/test.controller.base.ts');
      const servicePath = path.join(outputDir, 'test/test.service.ts');
      
      expect(await fs.pathExists(controllerPath)).toBe(true);
      expect(await fs.pathExists(servicePath)).toBe(false);
    });
  });

  describe('Template loading edge cases', () => {
    it('should handle template compilation errors gracefully', async () => {
      // Create a template with invalid Handlebars syntax
      const invalidTemplateDir = path.join(tempDir, 'invalid-templates');
      await fs.ensureDir(invalidTemplateDir);
      
      const invalidTemplate = `
        import { Controller } from '@nestjs/common';
        
        {{#invalid syntax here
        export class {{className}} {
        }
      `;
      
      await fs.writeFile(
        path.join(invalidTemplateDir, 'controller.hbs'),
        invalidTemplate
      );

      const controllerGenerator = new ControllerGenerator(invalidTemplateDir);
      
      // Should throw an error for invalid template syntax
      await expect(
        controllerGenerator.generateController('user', testSpec.paths, testSpec)
      ).rejects.toThrow();
    });

    it('should cache compiled templates for performance', async () => {
      const customTemplateDir = path.join(__dirname, '../fixtures/custom-templates');
      const controllerGenerator = new ControllerGenerator(customTemplateDir);
      
      // Generate multiple times to test caching
      const result1 = await controllerGenerator.generateController('user', testSpec.paths, testSpec);
      const result2 = await controllerGenerator.generateController('user', testSpec.paths, testSpec);
      
      // Results should be identical (templates cached)
      expect(result1).toBe(result2);
    });
  });

  describe('Handlebars helpers', () => {
    it('should provide camelCase helper', async () => {
      const testTemplateDir = path.join(tempDir, 'helper-test');
      await fs.ensureDir(testTemplateDir);
      
      const template = `
        Test camelCase: {{camelCase "TestString"}}
        Test kebabCase: {{kebabCase "TestString"}}
      `;
      
      await fs.writeFile(
        path.join(testTemplateDir, 'controller.hbs'),
        template
      );

      const controllerGenerator = new ControllerGenerator(testTemplateDir);
      const result = await controllerGenerator.generateController('user', {}, testSpec);
      
      expect(result).toContain('Test camelCase: testString');
      expect(result).toContain('Test kebabCase: test-string');
    });

    it('should handle undefined values in helpers', async () => {
      const testTemplateDir = path.join(tempDir, 'undefined-test');
      await fs.ensureDir(testTemplateDir);
      
      const template = `
        Test undefined: {{camelCase undefinedVar}}
        Test null: {{kebabCase nullVar}}
      `;
      
      await fs.writeFile(
        path.join(testTemplateDir, 'controller.hbs'),
        template
      );

      const controllerGenerator = new ControllerGenerator(testTemplateDir);
      const result = await controllerGenerator.generateController('user', {}, testSpec);
      
      expect(result).toContain('Test undefined:');
      expect(result).toContain('Test null:');
      // Should not throw errors
    });
  });
});