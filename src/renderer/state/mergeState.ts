import type { SettingsState, AppSettings } from './settingsState';

export interface MergeSettingsSnapshot {
  mainFolder: string;
  insertFolder: string;
  outputFolder: string;
  mainRecursive: boolean;
  insertRecursive: boolean;
  lastSelectedMainFolder: string | null;
  lastSelectedInsertFolder: string | null;
  lastSelectedOutputFolder: string | null;
  lastReportPath: string | null;
}

export interface MergeStateDeps {
  settingsState: SettingsState;
}

/**
 * Прослойка над SettingsState для merge-настроек.
 * index.ts и mergeMode работают только с MergeState, не зная структуру AppSettings.
 */
export class MergeState {
  private settingsState: SettingsState;

  constructor({ settingsState }: MergeStateDeps) {
    this.settingsState = settingsState;
  }

  /** Актуальный снимок merge-настроек. */
  getSnapshot(): MergeSettingsSnapshot {
    const s = this.settingsState.getSettings();
    return {
      mainFolder: s.mainFolder,
      insertFolder: s.insertFolder,
      outputFolder: s.outputFolder,
      mainRecursive: s.mainRecursive,
      insertRecursive: s.insertRecursive,
      lastSelectedMainFolder: s.lastSelectedMainFolder,
      lastSelectedInsertFolder: s.lastSelectedInsertFolder,
      lastSelectedOutputFolder: s.lastSelectedOutputFolder,
      lastReportPath: s.lastReportPath ?? null,
    };
  }

  /** Частичное обновление merge-настроек. */
  update(patch: Partial<MergeSettingsSnapshot>, { save } = { save: true }) {
    const s = this.settingsState.getSettings();

    const next: Partial<AppSettings> = {
      ...s,
      mainFolder:
        patch.mainFolder !== undefined ? patch.mainFolder : s.mainFolder,
      insertFolder:
        patch.insertFolder !== undefined ? patch.insertFolder : s.insertFolder,
      outputFolder:
        patch.outputFolder !== undefined ? patch.outputFolder : s.outputFolder,
      mainRecursive:
        patch.mainRecursive !== undefined ? patch.mainRecursive : s.mainRecursive,
      insertRecursive:
        patch.insertRecursive !== undefined ? patch.insertRecursive : s.insertRecursive,
      lastSelectedMainFolder:
        patch.lastSelectedMainFolder !== undefined
          ? patch.lastSelectedMainFolder
          : s.lastSelectedMainFolder,
      lastSelectedInsertFolder:
        patch.lastSelectedInsertFolder !== undefined
          ? patch.lastSelectedInsertFolder
          : s.lastSelectedInsertFolder,
      lastSelectedOutputFolder:
        patch.lastSelectedOutputFolder !== undefined
          ? patch.lastSelectedOutputFolder
          : s.lastSelectedOutputFolder,
      lastReportPath:
        patch.lastReportPath !== undefined ? patch.lastReportPath : s.lastReportPath,
    };

    this.settingsState.updateSettings(next);
    if (save) {
      this.settingsState.save().catch(() => {});
    }
  }
}