// Глобальное описание window.electronAPI.
// Все методы пробрасываются из preload.ts через contextBridge.

declare global {
  interface Window {
    electronAPI: {
      /** Открыть диалог выбора папки, вернуть путь или null если отменено. */
      selectFolder: (defaultPath?: string) => Promise<string | null>;

      /** Получить имя файла/папки без пути. */
      basename: (fullPath: string) => string;

      /** Загрузить сохранённые настройки приложения. */
      loadSettings: () => Promise<any>;

      /** Сохранить настройки приложения. Возвращает true при успехе. */
      saveSettings: (settings: any) => Promise<boolean>;

      /** Запустить объединение PDF по ЗЭПБ/уведомлениям. */
      mergePDFs: (options: {
        mainFolder: string;
        insertFolder: string;
        outputFolder: string;
        recursiveMain: boolean;
        recursiveInsert: boolean;
      }) => Promise<{
        processed: number;
        skipped: number;
        errors: string[];
        log: string[];
        total: number;
      }>;

      /** Запросить отмену операции объединения. */
      cancelMerge: () => Promise<boolean>;

      /** Установить тему (true — тёмная, false — светлая). */
      setTheme: (isDark: boolean) => void;

      /** Построить словарь файлов (ZEPB/insert) по папке. */
      buildDict: (type: 'zepb' | 'insert', folderPath: string, recursive: boolean) => Promise<Record<string, string>>;

      /** Подсчитать количество файлов в папке (любых). */
      countFilesInFolder: (folderPath: string) => Promise<number>;

      /** Открыть папку в системном файловом менеджере. */
      openFolder: (folderPath: string) => Promise<boolean>;

      /** Сжать PDF-файлы в папке. */
      compressPDFs: (options: {
        inputFolder: string;
        outputFolder: string;
        quality?: number;
      }) => Promise<{
        processed: number;
        total: number;
        log: string[];
        used?: string;
      }>;

      /** Сжать список конкретных файлов. */
      compressFiles: (opts: {
        files: string[];
        outputFolder: string;
        quality?: number;
      }) => Promise<{
        processed: number;
        total: number;
        log: string[];
        used?: string;
        files?: Array<{
          name: string;
          inSize?: number;
          outSize?: number;
          ok: boolean;
          error?: string;
          notes?: string;
        }>;
      }>;

      /** Прочитать файл целиком в виде массива байт (используется для превью PDF). */
      readFileBuffer: (filePath: string) => Promise<{ ok: boolean; data?: number[]; error?: string }>;

      /** Проверить, является ли путь директорией. */
      pathIsDirectory: (p: string) => Promise<boolean>;

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
      ) => () => void;

      /** Подписаться на завершение операции сжатия PDF. */
      onCompressComplete: (
        cb: (event: any, payload: { processed: number; total: number; log: string[] }) => void,
      ) => () => void;

      /** Запросить отмену операции сжатия PDF. */
      cancelCompress: () => Promise<boolean>;

      /** Получить информацию о приложении (версия, платформа, архитектура). */
      getAppInfo: () => Promise<{ version: string; platform: string; arch: string }>;

      /** Открыть внешний URL в браузере/обработчике по умолчанию. */
      openExternalUrl: (url: string) => Promise<void>;

      /** Запустить проверку обновлений приложения. */
      checkForUpdates: () => Promise<null>;

      /** Начать загрузку обновления приложения. */
      downloadUpdate: () => Promise<boolean>;

      /** Завершить приложение и установить обновление. */
      quitAndInstall: () => Promise<void>;

      /** Подсчитать количество PDF-файлов в папке.
       *  По умолчанию рекурсивно. Второй аргумент recursive?: boolean позволяет
       *  запросить нерекурсивный подсчёт.
       */
      countPdfFilesInFolder: (folderPath: string, recursive?: boolean) => Promise<number>;

      /** Добавить строку в лог (и, возможно, отправить main-процессу). */
      appendLog: (line: string) => void;

      /** Открыть отдельное окно лога. */
      openLogWindow: () => Promise<boolean>;

      /** Экспортировать лог в файл. */
      exportLog: (suggestedName?: string) => Promise<{ ok: boolean; path?: string; error?: string }>;

      /** Подписаться на полную загрузку контента лога. */
      onLogContent: (cb: (event: any, content: string) => void) => () => void;

      /** Подписаться на добавление строки к логу. */
      onLogAppend: (cb: (event: any, line: string) => void) => () => void;

      /** Подписаться на изменение темы из main-процесса. */
      onSetTheme: (cb: (event: any, isDark: boolean) => void) => () => void;

      /** Событие: найдено доступное обновление (указана версия). */
      onUpdateAvailable: (cb: (event: any, version: string) => void) => () => void;

      /** Событие: обновлений нет. */
      onUpdateNotAvailable: (cb: (event: any) => void) => () => void;

      /** Событие: ошибка при обновлении. */
      onUpdateError: (cb: (event: any, error: string) => void) => () => void;

      /** Событие: прогресс загрузки обновления. */
      onUpdateDownloadProgress: (cb: (event: any, percent: number) => void) => () => void;

      /** Событие: обновление скачано. */
      onUpdateDownloaded: (cb: (event: any, version: string) => void) => () => void;

      /** Событие: прогресс объединения PDF. */
      onMergeProgress: (cb: (event: any, payload: any) => void) => () => void;

      /** Событие: завершение объединения PDF. */
      onMergeComplete: (cb: (event: any, payload: any) => void) => () => void;

      /** Событие: предварительный список несшитых (уведомления/ЗЭПБ без пары). */
      onMergeUnmatched?: (cb: (event: any, payload: any) => void) => () => void;
    };

    /** pdf.js библиотека, проброшенная в window. */
    pdfjsLib?: any;
  }
}

export {};