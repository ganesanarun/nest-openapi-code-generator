import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPISpec } from '../types/openapi';
import * as fs from 'fs-extra';
import * as path from 'path';

export class SpecParser {
  private originalSpec?: OpenAPISpec;

  async parseSpec(specPath: string): Promise<OpenAPISpec> {
    try {
      // First, parse without resolving references to preserve $ref information
      this.originalSpec = await SwaggerParser.parse(specPath) as OpenAPISpec;
      
      // Then validate and resolve references for the main spec
      const spec = await SwaggerParser.validate(specPath) as OpenAPISpec;
      
      // Add original spec as a property for reference lookup
      (spec as any)._originalSpec = this.originalSpec;
      
      return spec;
    } catch (error: any) {
      throw new Error(`Failed to parse OpenAPI spec at ${specPath}: ${error.message}`);
    }
  }

  async findSpecs(specsDir: string): Promise<string[]> {
    if (!await fs.pathExists(specsDir)) {
      return [];
    }

    const files = await fs.readdir(specsDir);
    return files
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json'))
      .map(f => path.join(specsDir, f));
  }

  resolveRef(spec: OpenAPISpec, ref: string): any {
    const parts = ref.replace('#/', '').split('/');
    let result: any = spec;
    for (const part of parts) {
      result = result[part];
    }
    return result;
  }

  extractResourceName(specPath: string): string {
    const basename = path.basename(specPath, path.extname(specPath));
    return basename.replace(/\.openapi$/, '');
  }
}