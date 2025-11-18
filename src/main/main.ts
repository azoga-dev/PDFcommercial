import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { createMainWindow, getMainWindow } from './windows/mainWindow';
import {
  createLogWindow,
  getLogWindow,
  setCurrentThemeIsDark,
} from './windows/logWindow';
import { registerMergeIpc } from './ipc/merge';
import { registerCompressIpc } from './ipc/compress';
import { registerSettingsIpc } from './ipc/settings';
import { registerFsIpc } from './ipc/fs';
import { registerUpdatesIpc } from './ipc/updates';
import { registerLoggingIpc } from './ipc/logging';

let isQuitting = false;

// Тема: renderer сообщает, main пересылает в окно логов
ipcMain.on('theme-changed', (_e, isDark: boolean) => {
  setCurrentThemeIsDark(isDark);
  const logWindow = getLogWindow();
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.webContents.send('set-theme', isDark);
  }
});

app.whenReady().then(() => {
  const mainWindow = createMainWindow();

  // Регистрация всех IPC
  registerMergeIpc(getMainWindow);
  registerCompressIpc(getMainWindow);
  registerSettingsIpc();
  registerFsIpc(getMainWindow);
  registerUpdatesIpc(getMainWindow);
  registerLoggingIpc(getMainWindow);

  // После загрузки главного окна — проверка обновлений
  mainWindow.webContents.once('did-finish-load', () => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.error(
        'autoUpdater.checkForUpdates error:',
        (e as Error).message,
      );
    });
  });

  // macOS: открыть окно при активации, если все закрыты
  app.on('activate', () => {
    if (!getMainWindow()) {
      createMainWindow();
    }
  });

  // При закрытии главного окна закрываем окно логов, если есть
  mainWindow.on('closed', () => {
    const logWin = getLogWindow();
    if (logWin && !logWin.isDestroyed()) {
      try {
        logWin.close();
      } catch {
        /* ignore */
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (!isQuitting && process.platform !== 'darwin') {
    app.quit();
  }
});

// Выход после установки обновления (IPC)
ipcMain.handle('quit-and-install', () => {
  isQuitting = true;
  autoUpdater.quitAndInstall();
});