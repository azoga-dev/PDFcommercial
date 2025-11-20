import type { SettingsState, AppSettings } from './settingsState';

export interface CompressSettingsSnapshot {
  compressInputFolder: string | null;
  compressOutputFolder: string | null;
  lastSelectedCompress: string | null;
  lastSelectedCompressOutputFolder: string | null;
  compressQuality?: number;
  thumbnailsEnabled?: boolean;
  thumbnailSize?: number;
}

export interface CompressStateDeps {
  settingsState: SettingsState;
}

/**
 * Прослойка над SettingsState для compress-настроек.
 * Index.ts и compressMode работают только с CompressState, не зная структуру AppSettings.
 */
export class CompressState {
  private settingsState: SettingsState;

  constructor({ settingsState }: CompressStateDeps) {
    this.settingsState = settingsState;
  }

  /** Снимок compress-настроек для передачи в initCompressMode. */
  getSnapshot(): CompressSettingsSnapshot {
    const s = this.settingsState.getSettings();
    return {
      compressInputFolder: s.compressInputFolder ?? null,
      compressOutputFolder: s.compressOutputFolder ?? null,
      lastSelectedCompress: s.lastSelectedCompress ?? null,
      lastSelectedCompressOutputFolder: s.lastSelectedCompressOutputFolder ?? null,
      compressQuality: s.compressQuality,
      thumbnailsEnabled: s.thumbnailsEnabled,
      thumbnailSize: s.thumbnailSize,
    };
  }

  /** Частичное обновление compress-настроек. */
  update(patch: Partial<CompressSettingsSnapshot>, { save } = { save: true }) {
    const s = this.settingsState.getSettings();

    const next: Partial<AppSettings> = {
      ...s,
      compressInputFolder:
        patch.compressInputFolder !== undefined ? patch.compressInputFolder : s.compressInputFolder,
      compressOutputFolder:
        patch.compressOutputFolder !== undefined ? patch.compressOutputFolder : s.compressOutputFolder,
      lastSelectedCompress:
        patch.lastSelectedCompress !== undefined ? patch.lastSelectedCompress : s.lastSelectedCompress,
      lastSelectedCompressOutputFolder:
        patch.lastSelectedCompressOutputFolder !== undefined
          ? patch.lastSelectedCompressOutputFolder
          : s.lastSelectedCompressOutputFolder,
      compressQuality:
        patch.compressQuality !== undefined ? patch.compressQuality : s.compressQuality,
      thumbnailsEnabled:
        patch.thumbnailsEnabled !== undefined ? patch.thumbnailsEnabled : s.thumbnailsEnabled,
      thumbnailSize:
        patch.thumbnailSize !== undefined ? patch.thumbnailSize : s.thumbnailSize,
    };

    this.settingsState.updateSettings(next);
    if (save) {
      this.settingsState.save().catch(() => {});
    }
  }
}