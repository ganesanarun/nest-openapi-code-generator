import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export class Logger {
  private logLevel: LogLevel = LogLevel.INFO;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, error?: Error): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(chalk.gray('→'), message);
      if (error) {
        console.log(chalk.gray('  Stack:'), error.stack);
      }
    }
  }

  info(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(chalk.blue('ℹ'), message);
    }
  }

  success(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(chalk.green('✓'), message);
    }
  }

  warn(message: string, error?: Error): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(chalk.yellow('⚠'), message);
      if (error) {
        console.warn(chalk.yellow('  Details:'), error.message);
      }
    }
  }

  error(message: string, error?: Error): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(chalk.red('✗'), message);
      if (error) {
        console.error(chalk.red('  Error:'), error.message);
        if (this.logLevel <= LogLevel.DEBUG) {
          console.error(chalk.red('  Stack:'), error.stack);
        }
      }
    }
  }

  /**
   * Log a message with a custom color and prefix
   */
  log(level: 'info' | 'success' | 'warn' | 'error' | 'debug', message: string, error?: Error): void {
    switch (level) {
      case 'debug':
        this.debug(message, error);
        break;
      case 'info':
        this.info(message);
        break;
      case 'success':
        this.success(message);
        break;
      case 'warn':
        this.warn(message, error);
        break;
      case 'error':
        this.error(message, error);
        break;
    }
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    const childLogger = new Logger(this.logLevel);
    
    // Override methods to include prefix
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalSuccess = childLogger.success.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);

    childLogger.debug = (message: string, error?: Error) => originalDebug(`[${prefix}] ${message}`, error);
    childLogger.info = (message: string) => originalInfo(`[${prefix}] ${message}`);
    childLogger.success = (message: string) => originalSuccess(`[${prefix}] ${message}`);
    childLogger.warn = (message: string, error?: Error) => originalWarn(`[${prefix}] ${message}`, error);
    childLogger.error = (message: string, error?: Error) => originalError(`[${prefix}] ${message}`, error);

    return childLogger;
  }
}

// Export a default logger instance
export const logger = new Logger();