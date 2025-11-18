# `src/preload.ts`

## Назначение

Preload-скрипт для окна renderer в Electron.

Отвечает за:
- безопасное пробрасывание API из `main` в renderer через `contextBridge.exposeInMainWorld('electronAPI', ...)`;
- регистрацию всех IPC-обработчиков (`ipcRenderer.invoke`, `ipcRenderer.on` и т.д.), которые затем используются в UI.

## Что внутри

- Объект `electronAPI`, который включает:
  - методы работы с ФС: выбор папки, чтение файла, открытие папки, подсчёт файлов;
  - методы настроек: `loadSettings`, `saveSettings`;
  - методы merge (объединение PDF): `buildDict`, `mergePDFs`, `cancelMerge`, `onMergeProgress`, `onMergeUnmatched`, `onMergeComplete`;
  - методы compress (сжатие PDF): `compressPDFs`, `compressFiles`, `cancelCompress`, `onCompressProgress`, `onCompressComplete`, `readFileBuffer`;
  - логирование: `appendLog`, `openLogWindow`, `exportLog`, `onLogContent`, `onLogAppend`;
  - тема: `setTheme`, `onSetTheme`;
  - автообновления: `checkForUpdates`, `downloadUpdate`, `quitAndInstall`, `onUpdateAvailable`, `onUpdateNotAvailable`, `onUpdateError`, `onUpdateDownloadProgress`, `onUpdateDownloaded`;
  - прочее: `getAppInfo`, `openExternalUrl`.

У каждого метода есть краткий комментарий, объясняющий, какой IPC-канал он дергает и для чего.

## Как используется

- В renderer (например, `src/renderer/index.ts`):

  ```ts
  type ElectronAPI = Window['electronAPI'];
  const electronAPI: ElectronAPI = window.electronAPI;
  ```

- Затем `electronAPI` передаётся дальше в:
  - `SettingsState` (для load/save настроек);
  - `initMergeMode` / `initCompressMode`;
  - `initUpdates`, `initFeedback`, `initTheme`;
  - `LogState`, чтобы отправлять строки лога в main.