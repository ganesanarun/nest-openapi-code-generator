#!/usr/bin/env node
import { Command } from 'commander';
import { ConfigLoader } from '../config/config-loader';
import { GeneratorOrchestrator } from '../orchestrator/generator-orchestrator';
import { SpecWatcher } from '../watcher/spec-watcher';
import { Logger } from '../utils/logger';

const logger = new Logger();
const program = new Command();

program
  .name('openapi-generate')
  .description('Generate NestJS controllers and DTOs from OpenAPI specs')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to config file')
  .option('-w, --watch', 'Watch for changes')
  .option('-s, --specs <path>', 'Path to specs directory')
  .option('-o, --output <path>', 'Output directory')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader();
      let config = await configLoader.loadConfig(options.config);

      // Override with CLI options
      if (options.specs) config.specsDir = options.specs;
      if (options.output) config.outputDir = options.output;

      if (options.watch) {
        const watcher = new SpecWatcher(config);
        await watcher.start();

        // Keep process alive
        process.on('SIGINT', () => {
          logger.info('Stopping watcher...');
          watcher.stop();
          process.exit(0);
        });
      } else {
        const orchestrator = new GeneratorOrchestrator(config);
        await orchestrator.generate();
      }
    } catch (error: any) {
      logger.error(error.message);
      process.exit(1);
    }
  });

program.parse();