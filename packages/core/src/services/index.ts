import { PDFMergeService } from './PDFMergeService';
import { PDFCompressService } from './PDFCompressService';
import { FileSystemService } from './FileSystemService';
import { SettingsService } from './SettingsService';
import { LoggingService } from './LoggingService';
import { UpdateService } from './UpdateService';
import { GhostscriptService } from './GhostscriptService';

/**
 * Центральный класс для управления всеми сервисами приложения
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  
  // Основные сервисы
  public readonly pdfMergeService: PDFMergeService;
  public readonly pdfCompressService: PDFCompressService;
  public readonly fileSystemService: FileSystemService;
  public readonly settingsService: SettingsService;
  public readonly loggingService: LoggingService;
  public readonly updateService: UpdateService;
  public readonly ghostscriptService: GhostscriptService;

  private constructor() {
    // Инициализация сервисов
    this.loggingService = new LoggingService();
    this.fileSystemService = new FileSystemService(this.loggingService);
    this.settingsService = new SettingsService(this.fileSystemService, this.loggingService);
    this.ghostscriptService = new GhostscriptService(this.fileSystemService, this.loggingService);
    this.pdfCompressService = new PDFCompressService(
      this.ghostscriptService, 
      this.fileSystemService, 
      this.loggingService
    );
    this.pdfMergeService = new PDFMergeService(
      this.fileSystemService,
      this.loggingService
    );
    this.updateService = new UpdateService(this.loggingService);
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
}

// Экспорт всех сервисов
export * from './PDFMergeService';
export * from './PDFCompressService';
export * from './FileSystemService';
export * from './SettingsService';
export * from './LoggingService';
export * from './UpdateService';
export * from './GhostscriptService';