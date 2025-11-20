/**
 * Интерфейс для сервиса логирования
 */
export interface ILoggingService {
  log(message: string, level?: 'info' | 'warn' | 'error' | 'debug'): void;
  logInfo(message: string): void;
  logWarn(message: string): void;
  logError(message: string): void;
  logDebug(message: string): void;
  appendLog(message: string): void;
}

/**
 * Интерфейс для сервиса файловой системы
 */
export interface IFileSystemService {
  ensureDir(dirPath: string): Promise<void>;
  readFile(filePath: string): Promise<Buffer>;
  writeFile(filePath: string, data: Buffer | string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  remove(path: string): Promise<void>;
  pathExists(path: string): Promise<boolean>;
  readdir(dirPath: string): Promise<string[]>;
  stat(path: string): Promise<{ size: number; mtimeMs: number; isFile(): boolean; isDirectory(): boolean }>;
  basename(path: string): string;
  dirname(path: string): string;
  join(...paths: string[]): string;
}

/**
 * Интерфейс для сервиса настроек
 */
export interface ISettingsService {
  loadSettings(): Promise<any>;
  saveSettings(settings: any): Promise<boolean>;
  getSettings(): any;
  updateSettings(patch: Partial<any>): void;
}

/**
 * Интерфейс для сервиса сжатия PDF
 */
export interface IPDFCompressService {
  compressFiles(options: {
    files: string[];
    outputFolder: string;
    quality?: number;
  }): Promise<any>;
  
  compressPDFs(options: {
    inputFolder: string;
    outputFolder: string;
    quality?: number;
  }): Promise<any>;
  
  cancel(): void;
}

/**
 * Интерфейс для сервиса объединения PDF
 */
export interface IPDFMergeService {
  mergePDFs(options: {
    mainFolder: string;
    insertFolder: string;
    outputFolder: string;
    recursiveMain: boolean;
    recursiveInsert: boolean;
  }): Promise<any>;
  
  cancel(): void;
}

/**
 * Интерфейс для сервиса обновлений
 */
export interface IUpdateService {
  checkForUpdates(): Promise<void>;
  downloadUpdate(): Promise<boolean>;
  quitAndInstall(): Promise<void>;
}

/**
 * Интерфейс для сервиса Ghostscript
 */
export interface IGhostscriptService {
  findGhostscript(): Promise<string | null>;
  qualityToPdfSettings(quality: number): string;
  compressPDF(inputPath: string, outputPath: string, quality: number): Promise<void>;
}