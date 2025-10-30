import * as path from 'path';
import { GeneratorConfig } from '../types/config';
import { SpecParser } from '../parser/spec-parser';
import { DtoGenerator } from '../generator/dto-generator';
import { ControllerGenerator } from '../generator/controller-generator';
import { ServiceGenerator } from '../generator/service-generator';
import { FileWriter } from '../generator/file-writer';
import { Logger } from '../utils/logger';
import { OpenAPISpec } from '../types/openapi';

export class GeneratorOrchestrator {
  private specParser: SpecParser;
  private dtoGenerator: DtoGenerator;
  private controllerGenerator: ControllerGenerator;
  private serviceGenerator: ServiceGenerator;
  private fileWriter: FileWriter;
  private logger: Logger;

  constructor(private config: GeneratorConfig) {
    this.logger = new Logger();
    this.specParser = new SpecParser();
    this.dtoGenerator = new DtoGenerator();
    this.controllerGenerator = new ControllerGenerator(
      this.config.templateDir,
      this.config.generatorOptions?.includeErrorTypesInReturnType ?? false
    );
    this.serviceGenerator = new ServiceGenerator(this.config.templateDir);
    this.fileWriter = new FileWriter(this.logger);
  }

  async generate(): Promise<void> {
    try {
      this.logger.info('Starting code generation...');

      const specPaths = await this.specParser.findSpecs(this.config.specsDir);

      if (specPaths.length === 0) {
        this.logger.warn(`No OpenAPI specs found in ${this.config.specsDir}`);
        return;
      }

      this.logger.info(`Found ${specPaths.length} spec(s)`);

      for (const specPath of specPaths) {
        await this.generateFromSpec(specPath);
      }

      this.logger.success('Code generation completed!');
    } catch (error: any) {
      this.logger.error(`Generation failed: ${error.message}`);
      throw error;
    }
  }

  private async generateFromSpec(specPath: string): Promise<void> {
    this.logger.info(`Processing: ${specPath}`);

    const spec = await this.specParser.parseSpec(specPath);
    const resourceName = this.specParser.extractResourceName(specPath);

    const outputDir = path.join(this.config.outputDir, resourceName);

    if (this.config.generateDtos && spec.components?.schemas) {
      await this.generateDtos(resourceName, spec, outputDir);
    }

    if (this.config.generateControllers && spec.paths) {
      await this.generateController(resourceName, spec, outputDir);
    }

    if (this.config.generateServices && spec.paths) {
      await this.generateService(resourceName, spec, outputDir);
    }
  }

  private async generateDtos(
    resourceName: string,
    spec: OpenAPISpec,
    outputDir: string
  ): Promise<void> {
    const schemas = spec.components?.schemas || {};
    const dtoOutputPath = path.join(outputDir, `${resourceName}.dto.ts`);

    // Generate all DTOs in one file with proper imports and enums
    const dtoContent = await this.dtoGenerator.generateAllDtos(schemas, spec);
    
    // Add imports at the beginning
    const fullContent = `${dtoContent}`;

    await this.fileWriter.writeFile(dtoOutputPath, fullContent);
  }

  private async generateController(
    resourceName: string,
    spec: OpenAPISpec,
    outputDir: string
  ): Promise<void> {
    const controllerOutputPath = path.join(outputDir, `${resourceName}.controller.base.ts`);
    
    const controllerCode = await this.controllerGenerator.generateController(
      resourceName,
      spec.paths,
      spec
    );

    await this.fileWriter.writeFile(controllerOutputPath, controllerCode);
  }

  private async generateService(
    resourceName: string,
    spec: OpenAPISpec,
    outputDir: string
  ): Promise<void> {
    const serviceOutputPath = path.join(outputDir, `${resourceName}.service.ts`);
    
    const serviceCode = await this.serviceGenerator.generateService(
      resourceName,
      spec.paths,
      spec
    );

    await this.fileWriter.writeFile(serviceOutputPath, serviceCode);
  }
}