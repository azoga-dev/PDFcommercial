import { contextBridge, ipcRenderer } from 'electron';

// Здесь собраны все методы, которые пробрасываются в renderer как window.electronAPI.
// Имена каналов строго соответствуют:
// - src/main/ipc/*.ts
// - src/types/global.d.ts
// - src/renderer/* (mergeMode, compressMode, settingsState и т.п.)

contextBridge.exposeInMainWorld('electronAPI', {
  // ===== Общие / FS / настройки =====

  /** Открыть диалог выбора папки, вернуть путь или null если отменено. */
  selectFolder: (defaultPath?: string) =>
    ipcRenderer.invoke('select-folder', defaultPath),

  /** Получить имя файла/папки без пути. */
  basename: (fullPath: string) =>
    ipcRenderer.sendSync('path-basename', fullPath),

  /** Загрузить сохранённые настройки приложения. */
  loadSettings: () =>
    ipcRenderer.invoke('load-settings'),

  /** Сохранить настройки приложения. Возвращает true при успехе. */
  saveSettings: (settings: any) =>
    ipcRenderer.invoke('save-settings', settings),

  /** Проверить, является ли путь директорией. */
  pathIsDirectory: (p: string) =>
    ipcRenderer.invoke('path-is-directory', p),

  /** Подсчитать количество файлов в папке (любых). */
  countFilesInFolder: (folderPath: string) =>
    ipcRenderer.invoke('count-files-in-folder', folderPath),

  /** Подсчитать количество PDF-файлов в папке (рекурсивно по умолчанию).
   *  Можно передать второй аргумент recursive=false для нерекурсивного подсчёта.
   */
  countPdfFilesInFolder: (folderPath: string, recursive = true) =>
    ipcRenderer.invoke('count-pdf-files-in-folder', folderPath, recursive),

  /** Открыть папку в системном файловом менеджере. */
  openFolder: (folderPath: string) =>
    ipcRenderer.invoke('open-folder', folderPath),

  /** Прочитать файл целиком в виде массива байт (используется для превью PDF). */
  readFileBuffer: async (filePath: string) => {
    try {
      const buf: Uint8Array | Buffer | null = await ipcRenderer.invoke(
        'fs-read-file-buffer',
        filePath,
      );
      if (!buf) return { ok: false, error: 'empty' };
      const arr = Array.from(buf as Uint8Array);
      return { ok: true, data: arr };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  // ===== Merge (объединение PDF) =====

  /** Построить словарь файлов (ZEPB/insert) по папке. */
  buildDict: (
    type: 'zepb' | 'insert',
    folderPath: string,
    recursive: boolean,
  ) =>
    ipcRenderer.invoke('build-dict', type, folderPath, recursive),

  /** Запустить объединение PDF по ЗЭПБ/уведомлениям. */
  mergePDFs: (options: {
    mainFolder: string;
    insertFolder: string;
    outputFolder: string;
    recursiveMain: boolean;
    recursiveInsert: boolean;
  }) =>
    ipcRenderer.invoke('merge-pdfs', options),

  /** Запросить отмену операции объединения. */
  cancelMerge: () =>
    ipcRenderer.invoke('cancel-merge'),

  /** Событие: прогресс объединения PDF. */
  onMergeProgress: (cb: (event: any, payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('merge-progress', handler);
    return () => ipcRenderer.removeListener('merge-progress', handler);
  },

  /** Событие: завершение объединения PDF. */
  onMergeComplete: (cb: (event: any, payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('merge-complete', handler);
    return () => ipcRenderer.removeListener('merge-complete', handler);
  },

  /** Событие: предварительный список несшитых (уведомления/ЗЭПБ без пары). */
  onMergeUnmatched: (cb: (event: any, payload: any) => void) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('merge-unmatched', handler);
    return () => ipcRenderer.removeListener('merge-unmatched', handler);
  },

  // ===== Сжатие PDF =====

  /** Сжать PDF-файлы в папке. */
  compressPDFs: (options: {
    inputFolder: string;
    outputFolder: string;
    quality?: number;
  }) =>
    ipcRenderer.invoke('compress-pdfs', options),

  /** Сжать список конкретных файлов. */
  compressFiles: (opts: {
    files: string[];
    outputFolder: string;
    quality?: number;
  }) =>
    ipcRenderer.invoke('compress-files', opts),

  /** Запросить отмену операции сжатия PDF. */
  cancelCompress: () =>
    ipcRenderer.invoke('cancel-compress'),

  /** Подписаться на прогресс сжатия PDF. */
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

  /** Подписаться на завершение операции сжатия PDF. */
  onCompressComplete: (
    cb: (event: any, payload: { processed: number; total: number; log: string[] }) => void,
  ) => {
    const handler = (_event: any, payload: any) => cb(_event, payload);
    ipcRenderer.on('compress-complete', handler);
    return () => ipcRenderer.removeListener('compress-complete', handler);
  },

  // ===== Тема =====

  /** Установить тему (true — тёмная, false — светлая). */
  setTheme: (isDark: boolean) =>
    ipcRenderer.send('theme-changed', isDark),

  /** Подписаться на изменение темы из main-процесса. */
  onSetTheme: (cb: (event: any, isDark: boolean) => void) => {
    const handler = (_event: any, isDark: boolean) => cb(_event, isDark);
    ipcRenderer.on('set-theme', handler);
    return () => ipcRenderer.removeListener('set-theme', handler);
  },

  // ===== Обновления =====

  /** Получить информацию о приложении (версия, платформа, архитектура). */
  getAppInfo: () =>
    ipcRenderer.invoke('get-app-info'),

  /** Открыть внешний URL в браузере/обработчике по умолчанию. */
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('open-external-url', url),

  /** Запустить проверку обновлений приложения. */
  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),

  /** Начать загрузку обновления приложения. */
  downloadUpdate: () =>
    ipcRenderer.invoke('download-update'),

  /** Завершить приложение и установить обновление. */
  quitAndInstall: () =>
    ipcRenderer.invoke('quit-and-install'),

  /** Событие: найдено доступное обновление (указана версия). */
  onUpdateAvailable: (cb: (event: any, version: string) => void) => {
    const handler = (_event: any, version: string) => cb(_event, version);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  /** Событие: обновлений нет. */
  onUpdateNotAvailable: (cb: (event: any) => void) => {
    const handler = (_event: any) => cb(_event);
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },

  /** Событие: ошибка при обновлении. */
  onUpdateError: (cb: (event: any, error: string) => void) => {
    const handler = (_event: any, error: string) => cb(_event, error);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },

  /** Событие: прогресс загрузки обновления. */
  onUpdateDownloadProgress: (cb: (event: any, percent: number) => void) => {
    const handler = (_event: any, percent: number) => cb(_event, percent);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },

  /** Событие: обновление скачано. */
  onUpdateDownloaded: (cb: (event: any, version: string) => void) => {
    const handler = (_event: any, version: string) => cb(_event, version);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },

  // ===== Логирование / окно лога =====

  /** Добавить строку в лог (и, возможно, отправить main-процессу). */
  appendLog: (line: string) =>
    ipcRenderer.send('append-log', line),

  /** Открыть отдельное окно лога. */
  openLogWindow: () =>
    ipcRenderer.invoke('open-log-window'),

  /** Экспортировать лог в файл. */
  exportLog: (suggestedName?: string) =>
    ipcRenderer.invoke('export-log', suggestedName),

  /** Подписаться на полную загрузку контента лога. */
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
});