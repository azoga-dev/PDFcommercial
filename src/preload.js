"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Здесь собраны все методы, которые пробрасываются в renderer как window.electronAPI.
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // ===== Общие / FS / настройки =====
    /** Открыть диалог выбора папки. */
    selectFolder: (defaultPath) => electron_1.ipcRenderer.invoke('select-folder', defaultPath),
    /** Получить basename пути. */
    basename: (fullPath) => electron_1.ipcRenderer.sendSync('path-basename', fullPath),
    /** Загрузить настройки из main. */
    loadSettings: () => electron_1.ipcRenderer.invoke('settings-load'),
    /** Сохранить настройки в main. */
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('settings-save', settings),
    /** Проверить, является ли путь директорией. */
    pathIsDirectory: (p) => electron_1.ipcRenderer.invoke('fs-is-directory', p),
    /** Подсчитать количество файлов в папке. */
    countFilesInFolder: (folderPath) => electron_1.ipcRenderer.invoke('fs-count-files', folderPath),
    /** Подсчитать количество PDF-файлов в папке. */
    countPdfFilesInFolder: (folderPath) => electron_1.ipcRenderer.invoke('fs-count-pdf-files', folderPath),
    /** Открыть папку в системном проводнике. */
    openFolder: (folderPath) => electron_1.ipcRenderer.invoke('fs-open-folder', folderPath),
    /** Прочитать файл в буфер (для превью PDF). */
    readFileBuffer: (filePath) => electron_1.ipcRenderer.invoke('fs-read-file-buffer', filePath),
    // ===== Тема =====
    /** Установить тему (тёмная/светлая). */
    setTheme: (isDark) => electron_1.ipcRenderer.send('theme-set', isDark),
    /** Подписаться на изменение темы из main. */
    onSetTheme: (cb) => {
        const handler = (_event, isDark) => cb(_event, isDark);
        electron_1.ipcRenderer.on('theme-changed', handler);
        return () => electron_1.ipcRenderer.removeListener('theme-changed', handler);
    },
    // ===== Merge (объединение PDF) =====
    /** Построить словарь файлов для merge (ZEPB / insert). */
    buildDict: (type, folderPath, recursive) => electron_1.ipcRenderer.invoke('merge-build-dict', { type, folderPath, recursive }),
    /** Запустить объединение PDF. */
    mergePDFs: (options) => electron_1.ipcRenderer.invoke('merge-run', options),
    /** Запросить отмену объединения. */
    cancelMerge: () => electron_1.ipcRenderer.invoke('merge-cancel'),
    /** Подписаться на прогресс объединения. */
    onMergeProgress: (cb) => {
        const handler = (_event, payload) => cb(_event, payload);
        electron_1.ipcRenderer.on('merge-progress', handler);
        return () => electron_1.ipcRenderer.removeListener('merge-progress', handler);
    },
    /** Подписаться на предварительный список несшитых. */
    onMergeUnmatched: (cb) => {
        const handler = (_event, payload) => cb(_event, payload);
        electron_1.ipcRenderer.on('merge-unmatched', handler);
        return () => electron_1.ipcRenderer.removeListener('merge-unmatched', handler);
    },
    /** Подписаться на завершение объединения. */
    onMergeComplete: (cb) => {
        const handler = (_event, payload) => cb(_event, payload);
        electron_1.ipcRenderer.on('merge-complete', handler);
        return () => electron_1.ipcRenderer.removeListener('merge-complete', handler);
    },
    // ===== Compress (сжатие PDF) =====
    /** Запустить сжатие папки с PDF. */
    compressPDFs: (options) => electron_1.ipcRenderer.invoke('compress-run-folder', options),
    /** Запустить сжатие конкретных файлов. */
    compressFiles: (opts) => electron_1.ipcRenderer.invoke('compress-run-files', opts),
    /** Запросить отмену сжатия. */
    cancelCompress: () => electron_1.ipcRenderer.invoke('compress-cancel'),
    /** Подписаться на прогресс сжатия. */
    onCompressProgress: (cb) => {
        const handler = (_event, payload) => cb(_event, payload);
        electron_1.ipcRenderer.on('compress-progress', handler);
        return () => electron_1.ipcRenderer.removeListener('compress-progress', handler);
    },
    /** Подписаться на завершение сжатия. */
    onCompressComplete: (cb) => {
        const handler = (_event, payload) => cb(_event, payload);
        electron_1.ipcRenderer.on('compress-complete', handler);
        return () => electron_1.ipcRenderer.removeListener('compress-complete', handler);
    },
    // ===== Логирование / окно лога =====
    /** Добавить строку в лог. */
    appendLog: (line) => electron_1.ipcRenderer.send('log-append', line),
    /** Открыть отдельное окно лога. */
    openLogWindow: () => electron_1.ipcRenderer.invoke('log-open-window'),
    /** Экспортировать лог в файл. */
    exportLog: (suggestedName) => electron_1.ipcRenderer.invoke('log-export', suggestedName),
    /** Подписаться на полную загрузку содержимого лога. */
    onLogContent: (cb) => {
        const handler = (_event, content) => cb(_event, content);
        electron_1.ipcRenderer.on('log-content', handler);
        return () => electron_1.ipcRenderer.removeListener('log-content', handler);
    },
    /** Подписаться на добавление строки к логу. */
    onLogAppend: (cb) => {
        const handler = (_event, line) => cb(_event, line);
        electron_1.ipcRenderer.on('log-append', handler);
        return () => electron_1.ipcRenderer.removeListener('log-append', handler);
    },
    // ===== Обновления =====
    /** Проверить наличие обновлений. */
    checkForUpdates: () => electron_1.ipcRenderer.invoke('updates-check'),
    /** Начать загрузку обновления. */
    downloadUpdate: () => electron_1.ipcRenderer.invoke('updates-download'),
    /** Завершить приложение и установить обновление. */
    quitAndInstall: () => electron_1.ipcRenderer.invoke('updates-quit-and-install'),
    /** Подписаться на событие "обновление доступно". */
    onUpdateAvailable: (cb) => {
        const handler = (_event, version) => cb(_event, version);
        electron_1.ipcRenderer.on('update-available', handler);
        return () => electron_1.ipcRenderer.removeListener('update-available', handler);
    },
    /** Подписаться на событие "обновлений нет". */
    onUpdateNotAvailable: (cb) => {
        const handler = (_event) => cb(_event);
        electron_1.ipcRenderer.on('update-not-available', handler);
        return () => electron_1.ipcRenderer.removeListener('update-not-available', handler);
    },
    /** Подписаться на событие "ошибка обновления". */
    onUpdateError: (cb) => {
        const handler = (_event, error) => cb(_event, error);
        electron_1.ipcRenderer.on('update-error', handler);
        return () => electron_1.ipcRenderer.removeListener('update-error', handler);
    },
    /** Подписаться на прогресс загрузки обновления. */
    onUpdateDownloadProgress: (cb) => {
        const handler = (_event, percent) => cb(_event, percent);
        electron_1.ipcRenderer.on('update-download-progress', handler);
        return () => electron_1.ipcRenderer.removeListener('update-download-progress', handler);
    },
    /** Подписаться на событие "обновление скачано". */
    onUpdateDownloaded: (cb) => {
        const handler = (_event, version) => cb(_event, version);
        electron_1.ipcRenderer.on('update-downloaded', handler);
        return () => electron_1.ipcRenderer.removeListener('update-downloaded', handler);
    },
    // ===== Прочее =====
    /** Получить информацию о приложении. */
    getAppInfo: () => electron_1.ipcRenderer.invoke('app-info'),
    /** Открыть внешний URL в браузере. */
    openExternalUrl: (url) => electron_1.ipcRenderer.invoke('open-external-url', url),
});
