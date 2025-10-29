import * as fs from 'fs-extra';
import * as path from 'path';
import { GeneratorConfig, defaultConfig } from '../types/config';

export class ConfigLoader {
  async loadConfig(configPath?: string): Promise<GeneratorConfig> {
    const possiblePaths = [
      configPath,
      'openapi-gen.config.ts',
      'openapi-gen.config.js',
      '.openapi-gen.json'
    ].filter(Boolean) as string[];

    for (const p of possiblePaths) {
      const fullPath = path.resolve(process.cwd(), p);
      if (await fs.pathExists(fullPath)) {
        return this.loadConfigFile(fullPath);
      }
    }

    return defaultConfig;
  }

  private async loadConfigFile(filePath: string): Promise<GeneratorConfig> {
    const ext = path.extname(filePath);

    if (ext === '.json') {
      const content = await fs.readJson(filePath);
      return { ...defaultConfig, ...content };
    }

    // For .ts/.js files, we'd need to use dynamic import or require
    // For simplicity, using require here
    const loaded = require(filePath);
    const config = loaded.default || loaded;
    return { ...defaultConfig, ...config };
  }
}