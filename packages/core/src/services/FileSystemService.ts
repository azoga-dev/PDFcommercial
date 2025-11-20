import * as path from 'path';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import { IFileSystemService, ILoggingService } from './interfaces';

export class FileSystemService implements IFileSystemService {
  constructor(private loggingService: ILoggingService) {}

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fsExtra.ensureDir(dirPath);
      this.loggingService.logDebug(`Directory ensured: ${dirPath}`);
    } catch (error) {
      this.loggingService.logError(`Failed to ensure directory ${dirPath}: ${error}`);
      throw error;
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    try {
      const data = await fsp.readFile(filePath);
      this.loggingService.logDebug(`File read: ${filePath}`);
      return data;
    } catch (error) {
      this.loggingService.logError(`Failed to read file ${filePath}: ${error}`);
      throw error;
    }
  }

  async writeFile(filePath: string, data: Buffer | string): Promise<void> {
    try {
      await fsp.writeFile(filePath, data);
      this.loggingService.logDebug(`File written: ${filePath}`);
    } catch (error) {
      this.loggingService.logError(`Failed to write file ${filePath}: ${error}`);
      throw error;
    }
  }

  async copyFile(src: string, dest: string): Promise<void> {
    try {
      await fsExtra.copy(src, dest, { overwrite: true });
      this.loggingService.logDebug(`File copied: ${src} -> ${dest}`);
    } catch (error) {
      this.loggingService.logError(`Failed to copy file ${src} to ${dest}: ${error}`);
      throw error;
    }
  }

  async remove(path: string): Promise<void> {
    try {
      await fsExtra.remove(path);
      this.loggingService.logDebug(`Path removed: ${path}`);
    } catch (error) {
      this.loggingService.logError(`Failed to remove path ${path}: ${error}`);
      throw error;
    }
  }

  async pathExists(path: string): Promise<boolean> {
    try {
      const exists = await fsExtra.pathExists(path);
      return exists;
    } catch (error) {
      this.loggingService.logError(`Failed to check path existence ${path}: ${error}`);
      return false;
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    try {
      const items = await fsp.readdir(dirPath);
      this.loggingService.logDebug(`Directory read: ${dirPath} (${items.length} items)`);
      return items;
    } catch (error) {
      this.loggingService.logError(`Failed to read directory ${dirPath}: ${error}`);
      throw error;
    }
  }

  async stat(path: string): Promise<{ size: number; mtimeMs: number; isFile(): boolean; isDirectory(): boolean }> {
    try {
      const stats = await fsp.stat(path);
      this.loggingService.logDebug(`Stat retrieved: ${path}`);
      return {
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        isFile: () => stats.isFile(),
        isDirectory: () => stats.isDirectory()
      };
    } catch (error) {
      this.loggingService.logError(`Failed to get stat for ${path}: ${error}`);
      throw error;
    }
  }

  basename(path: string): string {
    return path.basename(path);
  }

  dirname(path: string): string {
    return path.dirname(path);
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }
}