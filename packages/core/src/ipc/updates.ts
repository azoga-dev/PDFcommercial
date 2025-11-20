import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

export function registerUpdatesIpc(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('check-for-updates', async () => {
    try {
      autoUpdater.checkForUpdates();
    } catch (e) {
      getMainWindow()?.webContents.send(
        'update-error',
        (e as Error).message,
      );
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('get-app-info', async () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  }));

  ipcMain.handle(
    'open-external-url',
    async (_e, url: string) => {
      const { shell } = await import('electron');
      await shell.openExternal(url);
      return true;
    },
  );

  // События autoUpdater -> renderer
  autoUpdater.on('update-available', (info) => {
    const win = getMainWindow();
    if (!win) return;
    if (info.version !== app.getVersion()) {
      win.webContents.send('update-available', info.version);
    } else {
      win.webContents.send('update-not-available');
    }
  });

  autoUpdater.on('update-not-available', () => {
    getMainWindow()?.webContents.send('update-not-available');
  });

  autoUpdater.on('error', (err) => {
    getMainWindow()?.webContents.send(
      'update-error',
      (err as Error).message,
    );
  });

  autoUpdater.on('download-progress', (p) => {
    getMainWindow()?.webContents.send(
      'update-download-progress',
      p.percent,
    );
  });

  autoUpdater.on('update-downloaded', (info) => {
    getMainWindow()?.webContents.send(
      'update-downloaded',
      info.version,
    );
  });
}