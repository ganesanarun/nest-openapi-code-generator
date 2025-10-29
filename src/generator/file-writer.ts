import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '../utils/logger';

export class FileWriter {
  constructor(private logger: Logger) {}

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await fs.ensureDir(dir);
      await fs.writeFile(filePath, content, 'utf-8');
      this.logger.success(`Generated: ${filePath}`);
    } catch (error: any) {
      this.logger.error(`Failed to write file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await fs.pathExists(filePath);
    } catch (error: any) {
      this.logger.error(`Failed to check file existence ${filePath}: ${error.message}`);
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error: any) {
      this.logger.error(`Failed to read file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
      this.logger.debug(`Ensured directory: ${dirPath}`);
    } catch (error: any) {
      this.logger.error(`Failed to ensure directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  async removeFile(filePath: string): Promise<void> {
    try {
      if (await this.fileExists(filePath)) {
        await fs.remove(filePath);
        this.logger.debug(`Removed file: ${filePath}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to remove file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const dir = path.dirname(destinationPath);
      await fs.ensureDir(dir);
      await fs.copy(sourcePath, destinationPath);
      this.logger.debug(`Copied file from ${sourcePath} to ${destinationPath}`);
    } catch (error: any) {
      this.logger.error(`Failed to copy file from ${sourcePath} to ${destinationPath}: ${error.message}`);
      throw error;
    }
  }
}