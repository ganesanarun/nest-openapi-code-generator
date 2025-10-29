// Main library exports for programmatic usage

// Import types and classes for internal use
import { GeneratorOrchestrator } from './orchestrator/generator-orchestrator';
import { ConfigLoader } from './config/config-loader';
import { GeneratorConfig } from './types/config';
import { SpecParser } from './parser/spec-parser';
import { OpenAPISpec } from './types/openapi';

// Core orchestration - main entry point for generation
export { GeneratorOrchestrator } from './orchestrator/generator-orchestrator';

// Configuration management
export { ConfigLoader } from './config/config-loader';
export { GeneratorConfig, defaultConfig } from './types/config';

// OpenAPI parsing
export { SpecParser } from './parser/spec-parser';

// Code generators
export { DtoGenerator } from './generator/dto-generator';
export { ControllerGenerator } from './generator/controller-generator';
export { FileWriter } from './generator/file-writer';

// File watching
export { SpecWatcher } from './watcher/spec-watcher';

// Utilities
export { Logger, LogLevel, logger } from './utils/logger';

// Type definitions for OpenAPI
export {
  OpenAPISpec,
  PathItem,
  Operation,
  Parameter,
  RequestBody,
  Response,
  SchemaObject
} from './types/openapi';

// Package version
export const version = '1.0.0';

// Convenience function for quick generation
export async function generateFromConfig(config?: Partial<GeneratorConfig>): Promise<void> {
  const configLoader = new ConfigLoader();
  const fullConfig = config 
    ? { ...await configLoader.loadConfig(), ...config }
    : await configLoader.loadConfig();
  
  const orchestrator = new GeneratorOrchestrator(fullConfig);
  await orchestrator.generate();
}

// Convenience function for parsing a single spec
export async function parseSpec(specPath: string): Promise<OpenAPISpec> {
  const parser = new SpecParser();
  return parser.parseSpec(specPath);
}