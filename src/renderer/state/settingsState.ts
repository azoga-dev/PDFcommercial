type ElectronAPISettings = Pick<
  Window['electronAPI'],
  'loadSettings' | 'saveSettings' | 'buildDict' | 'countFilesInFolder'
>;

export interface AppSettings {
  mainFolder: string;
  insertFolder: string;
  outputFolder: string;
  mainRecursive: boolean;
  insertRecursive: boolean;
  lastSelectedMainFolder: string | null;
  lastSelectedInsertFolder: string | null;
  lastSelectedOutputFolder: string | null;

  compressInputFolder: string | null;
  compressOutputFolder: string | null;
  lastSelectedCompress: string | null;
  lastSelectedCompressOutputFolder: string | null;
  compressQuality?: number;
  thumbnailsEnabled?: boolean;
  thumbnailSize?: number;

  lastReportPath: string | null;
}

export interface SettingsStateDeps {
  electronAPI: ElectronAPISettings;
  onSettingsChanged?: (settings: AppSettings) => void;
  onDictsChanged?: (dicts: {
    zepbDict: Record<string, string>;
    insertDict: Record<string, string>;
  }) => void;
}

/**
 * Хранилище настроек renderer-а. Единственный источник правды для настроек и словарей.
 */
export class SettingsState {
  private electronAPI: ElectronAPISettings;
  private onSettingsChanged?: (settings: AppSettings) => void;
  private onDictsChanged?: (dicts: { zepbDict: Record<string, string>; insertDict: Record<string, string> }) => void;

  private settings: AppSettings;
  private zepbDict: Record<string, string> = {};
  private insertDict: Record<string, string> = {};

  constructor({ electronAPI, onSettingsChanged, onDictsChanged }: SettingsStateDeps) {
    this.electronAPI = electronAPI;
    this.onSettingsChanged = onSettingsChanged;
    this.onDictsChanged = onDictsChanged;

    this.settings = {
      mainFolder: '',
      insertFolder: '',
      outputFolder: '',
      mainRecursive: true,
      insertRecursive: true,
      lastSelectedMainFolder: null,
      lastSelectedInsertFolder: null,
      lastSelectedOutputFolder: null,
      compressInputFolder: null,
      compressOutputFolder: null,
      lastSelectedCompress: null,
      lastSelectedCompressOutputFolder: null,
      compressQuality: 30,
      thumbnailsEnabled: true,
      thumbnailSize: 128,
      lastReportPath: null,
    };
  }

  /** Текущие настройки (копия). */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /** Текущие словари (копия). */
  getDicts(): { zepbDict: Record<string, string>; insertDict: Record<string, string> } {
    return {
      zepbDict: { ...this.zepbDict },
      insertDict: { ...this.insertDict },
    };
  }

  /** Обновить настройки частично и триггернуть onSettingsChanged. */
  updateSettings(patch: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...patch };
    this.onSettingsChanged?.(this.getSettings());
  }

  /** Обновить словари ZEPB/insert и триггернуть onDictsChanged. */
  updateDicts(dicts: { zepbDict?: Record<string, string>; insertDict?: Record<string, string> }) {
    if (dicts.zepbDict) this.zepbDict = { ...dicts.zepbDict };
    if (dicts.insertDict) this.insertDict = { ...dicts.insertDict };
    this.onDictsChanged?.(this.getDicts());
  }

  /** Загрузить настройки из main и построить словари. */
  async load() {
    const raw = await this.electronAPI.loadSettings().catch(() => ({}));

    const s = this.settings;
    const merged: AppSettings = {
      ...s,
      mainFolder: raw.mainFolder || '',
      insertFolder: raw.insertFolder || '',
      outputFolder: raw.outputFolder || '',
      mainRecursive: typeof raw.mainRecursive === 'boolean' ? raw.mainRecursive : s.mainRecursive,
      insertRecursive: typeof raw.insertRecursive === 'boolean' ? raw.insertRecursive : s.insertRecursive,
      lastSelectedMainFolder: raw.lastSelectedMainFolder || raw.mainFolder || null,
      lastSelectedInsertFolder: raw.lastSelectedInsertFolder || raw.insertFolder || null,
      lastSelectedOutputFolder: raw.lastSelectedOutputFolder || raw.outputFolder || null,
      compressInputFolder: raw.compressInputFolder || null,
      compressOutputFolder: raw.compressOutputFolder || null,
      lastSelectedCompress: raw.lastSelectedCompress || raw.compressInputFolder || null,
      lastSelectedCompressOutputFolder:
        raw.lastSelectedCompressOutputFolder || raw.compressOutputFolder || null,
      compressQuality: raw.compressQuality || s.compressQuality,
      thumbnailsEnabled: typeof raw.thumbnailsEnabled === 'boolean' ? raw.thumbnailsEnabled : s.thumbnailsEnabled,
      thumbnailSize: raw.thumbnailSize || s.thumbnailSize,
      lastReportPath: raw.lastReportPath || null,
    };

    this.settings = merged;
    this.onSettingsChanged?.(this.getSettings());

    // построение словарей
    const { mainFolder, insertFolder, mainRecursive, insertRecursive } = merged;

    if (mainFolder) {
      try {
        this.zepbDict = await this.electronAPI.buildDict('zepb', mainFolder, !!mainRecursive);
      } catch {
        this.zepbDict = {};
      }
    } else {
      this.zepbDict = {};
    }

    if (insertFolder) {
      try {
        this.insertDict = await this.electronAPI.buildDict('insert', insertFolder, !!insertRecursive);
      } catch {
        this.insertDict = {};
      }
    } else {
      this.insertDict = {};
    }

    this.onDictsChanged?.(this.getDicts());
  }

  /** Сохранить текущие настройки. */
  async save() {
    await this.electronAPI.saveSettings(this.settings).catch(() => false);
  }

  /** Очистить настройки и словари. */
  async clearAll() {
    this.settings = {
      mainFolder: '',
      insertFolder: '',
      outputFolder: '',
      mainRecursive: true,
      insertRecursive: true,
      lastSelectedMainFolder: null,
      lastSelectedInsertFolder: null,
      lastSelectedOutputFolder: null,
      compressInputFolder: null,
      compressOutputFolder: null,
      lastSelectedCompress: null,
      lastSelectedCompressOutputFolder: null,
      compressQuality: 30,
      thumbnailsEnabled: true,
      thumbnailSize: 128,
      lastReportPath: null,
    };
    this.zepbDict = {};
    this.insertDict = {};

    this.onSettingsChanged?.(this.getSettings());
    this.onDictsChanged?.(this.getDicts());
    await this.save();
  }
}