import chokidar from 'chokidar';
import { Logger } from '../utils/logger';
import { GeneratorOrchestrator } from '../orchestrator/generator-orchestrator';
import { GeneratorConfig } from '../types/config';

export class SpecWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private logger: Logger;
  private orchestrator: GeneratorOrchestrator;

  constructor(private config: GeneratorConfig) {
    this.logger = new Logger();
    this.orchestrator = new GeneratorOrchestrator(config);
  }

  async start(): Promise<void> {
    this.logger.info(`Watching for changes in ${this.config.specsDir}...`);

    this.watcher = chokidar.watch(`${this.config.specsDir}/**/*.{yaml,yml,json}`, {
      persistent: true,
      ignoreInitial: false,
    });

    this.watcher
      .on('add', (path) => this.handleChange('added', path))
      .on('change', (path) => this.handleChange('changed', path))
      .on('unlink', (path) => this.handleChange('deleted', path));
  }

  private async handleChange(event: string, filePath: string): Promise<void> {
    this.logger.info(`File ${event}: ${filePath}`);
    
    try {
      await this.orchestrator.generate();
    } catch (error: any) {
      this.logger.error(`Error during regeneration: ${error.message}`);
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.logger.info('Watcher stopped');
    }
  }
}