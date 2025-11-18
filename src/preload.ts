import { contextBridge, ipcRenderer } from 'electron';

// Здесь собраны все методы, которые пробрасываются в renderer как window.electronAPI.

contextBridge.exposeInMainWorld('electronAPI', {
  // ===== Общие / FS / настройки =====

  /** Открыть диалог выбора папки. */
  selectFolder: (defaultPath?: string) =>
    ipcRenderer.invoke('select-folder', defaultPath),

  /** Получить basename пути. */
  basename: (fullPath: string) =>
    ipcRenderer.sendSync('path-basename', fullPath),

  /** Загрузить настройки из main. */
  loadSettings: () =>
    ipcRenderer.invoke('settings-load'),

  /** Сохранить настройки в main. */
  saveSettings: (settings: any) =>
    ipcRenderer.invoke('settings-save', settings),

  /** Проверить, является ли путь директорией. */
  pathIsDirectory: (p: string) =>
    ipcRenderer.invoke('fs-is-directory', p),

  /** Подсчитать количество файлов в папке. */
  countFilesInFolder: (folderPath: string) =>
    ipcRenderer.invoke('fs-count-files', folderPath),

  /** Подсчитать количество PDF-файлов в папке. */
  countPdfFilesInFolder: (folderPath: string) =>
    ipcRenderer.invoke('fs-count-pdf-files', folderPath),

  /** Открыть папку в системном проводнике. */
  openFolder: (folderPath: string) =>
    ipcRenderer.invoke('fs-open-folder', folderPath),

  /** Прочитать файл в буфер (для превью PDF). */
  readFileBuffer: (filePath: string) =>
    ipcRenderer.invoke('fs-read-file-buffer', filePath),

  // ===== Тема =====

  /** Установить тему (тёмная/светлая). */
  setTheme: (isDark: boolean) =>
    ipcRenderer.send('theme-set', isDark),

  /** Подписаться на изменение темы из main. */
  onSetTheme: (cb: (event: any, isDark: boolean) => void) => {
    const handler = (_event: any, isDark: boolean) => cb(_event, isDark);
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  },

  // ===== Merge (объединение PDF) =====

  /** Построить словарь файлов для merge (ZEPB / insert). */
  buildDict: (type: 'zepb' | 'insert', folderPath: string, recursive: boolean) =>
    ipcRenderer.invoke('merge-build-dict', { type, folderPath, recursive }),

  /** Запустить объединение PDF. */
  mergePDFs: (options: {
    mainFolder: string;
    insertFolder: string;
    outputFolder: string;
    recursiveMain: boolean;
    recursiveInsert: boolean;
  }) => ipcRenderer.invoke('merge-run', options),

  /** Запросить отмену объединения. */
  cancelMerge: () =>
    ipcRenderer.invoke('merge-cancel'),

  /** Подписаться на прогресс объединения. */
  onMergeProgress: (cb: (event: any, payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('merge-progress', handler);
    return () => ipcRenderer.removeListener('merge-progress', handler);
  },

  /** Подписаться на предварительный список несшитых. */
  onMergeUnmatched: (cb: (event: any, payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('merge-unmatched', handler);
    return () => ipcRenderer.removeListener('merge-unmatched', handler);
  },

  /** Подписаться на завершение объединения. */
  onMergeComplete: (cb: (event: any, payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('merge-complete', handler);
    return () => ipcRenderer.removeListener('merge-complete', handler);
  },

  // ===== Compress (сжатие PDF) =====

  /** Запустить сжатие папки с PDF. */
  compressPDFs: (options: { inputFolder: string; outputFolder: string; quality?: number }) =>
    ipcRenderer.invoke('compress-run-folder', options),

  /** Запустить сжатие конкретных файлов. */
  compressFiles: (opts: { files: string[]; outputFolder: string; quality?: number }) =>
    ipcRenderer.invoke('compress-run-files', opts),

  /** Запросить отмену сжатия. */
  cancelCompress: () =>
    ipcRenderer.invoke('compress-cancel'),

  /** Подписаться на прогресс сжатия. */
  onCompressProgress: (
    cb: (
      event: any,
      payload: {
        index: number;
        total: number;
        name: string;
        inSize?: number;
        outSize?: number;
        ok: boolean;
        error?: string | null;
        notes?: string | null;
      },
    ) => void,
  ) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('compress-progress', handler);
    return () => ipcRenderer.removeListener('compress-progress', handler);
  },

  /** Подписаться на завершение сжатия. */
  onCompressComplete: (
    cb: (event: any, payload: { processed: number; total: number; log: string[] }) => void,
  ) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('compress-complete', handler);
    return () => ipcRenderer.removeListener('compress-complete', handler);
  },

  // ===== Логирование / окно лога =====

  /** Добавить строку в лог. */
  appendLog: (line: string) =>
    ipcRenderer.send('log-append', line),

  /** Открыть отдельное окно лога. */
  openLogWindow: () =>
    ipcRenderer.invoke('log-open-window'),

  /** Экспортировать лог в файл. */
  exportLog: (suggestedName?: string) =>
    ipcRenderer.invoke('log-export', suggestedName),

  /** Подписаться на полную загрузку содержимого лога. */
  onLogContent: (cb: (event: any, content: string) => void) => {
    const handler = (_event: any, content: string) => cb(_event, content);
    ipcRenderer.on('log-content', handler);
    return () => ipcRenderer.removeListener('log-content', handler);
  },

  /** Подписаться на добавление строки к логу. */
  onLogAppend: (cb: (event: any, line: string) => void) => {
    const handler = (_event: any, line: string) => cb(_event, line);
    ipcRenderer.on('log-append', handler);
    return () => ipcRenderer.removeListener('log-append', handler);
  },

  // ===== Обновления =====

  /** Проверить наличие обновлений. */
  checkForUpdates: () =>
    ipcRenderer.invoke('updates-check'),

  /** Начать загрузку обновления. */
  downloadUpdate: () =>
    ipcRenderer.invoke('updates-download'),

  /** Завершить приложение и установить обновление. */
  quitAndInstall: () =>
    ipcRenderer.invoke('updates-quit-and-install'),

  /** Подписаться на событие "обновление доступно". */
  onUpdateAvailable: (cb: (event: any, version: string) => void) => {
    const handler = (_event: any, version: string) => cb(_event, version);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  /** Подписаться на событие "обновлений нет". */
  onUpdateNotAvailable: (cb: (event: any) => void) => {
    const handler = (_event: any) => cb(_event);
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },

  /** Подписаться на событие "ошибка обновления". */
  onUpdateError: (cb: (event: any, error: string) => void) => {
    const handler = (_event: any, error: string) => cb(_event, error);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },

  /** Подписаться на прогресс загрузки обновления. */
  onUpdateDownloadProgress: (cb: (event: any, percent: number) => void) => {
    const handler = (_event: any, percent: number) => cb(_event, percent);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },

  /** Подписаться на событие "обновление скачано". */
  onUpdateDownloaded: (cb: (event: any, version: string) => void) => {
    const handler = (_event: any, version: string) => cb(_event, version);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },

  // ===== Прочее =====

  /** Получить информацию о приложении. */
  getAppInfo: () =>
    ipcRenderer.invoke('app-info'),

  /** Открыть внешний URL в браузере. */
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('open-external-url', url),
});