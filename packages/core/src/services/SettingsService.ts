import { ISettingsService, IFileSystemService, ILoggingService } from './interfaces';

export class SettingsService implements ISettingsService {
  private settings: any = {};
  private settingsPath: string = 'settings.json';

  constructor(
    private fileSystemService: IFileSystemService,
    private loggingService: ILoggingService
  ) {}

  async loadSettings(): Promise<any> {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (!homeDir) {
        throw new Error('Cannot determine home directory');
      }
      
      this.settingsPath = this.fileSystemService.join(homeDir, '.pdfmanager', 'settings.json');
      
      const settingsDir = this.fileSystemService.dirname(this.settingsPath);
      await this.fileSystemService.ensureDir(settingsDir);
      
      if (await this.fileSystemService.pathExists(this.settingsPath)) {
        const data = await this.fileSystemService.readFile(this.settingsPath);
        this.settings = JSON.parse(data.toString());
        this.loggingService.logInfo('Settings loaded successfully');
      } else {
        this.settings = this.getDefaultSettings();
        this.loggingService.logInfo('Default settings initialized');
      }
    } catch (error) {
      this.loggingService.logError(`Failed to load settings: ${error}`);
      this.settings = this.getDefaultSettings();
    }
    
    return this.settings;
  }

  async saveSettings(settings: any): Promise<boolean> {
    try {
      const settingsDir = this.fileSystemService.dirname(this.settingsPath);
      await this.fileSystemService.ensureDir(settingsDir);
      
      await this.fileSystemService.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
      this.settings = { ...settings };
      this.loggingService.logInfo('Settings saved successfully');
      return true;
    } catch (error) {
      this.loggingService.logError(`Failed to save settings: ${error}`);
      return false;
    }
  }

  getSettings(): any {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<any>): void {
    this.settings = { ...this.settings, ...patch };
  }

  private getDefaultSettings(): any {
    return {
      mainFolder: '',
      insertFolder: '',
      outputFolder: '',
      mainRecursive: false,
      insertRecursive: false,
      lastSelectedMainFolder: null,
      lastSelectedInsertFolder: null,
      lastSelectedOutputFolder: null,
      lastReportPath: null,
      theme: 'system',
      compressionQuality: 30,
      maxParallelCompression: 3,
      language: 'ru'
    };
  }
}