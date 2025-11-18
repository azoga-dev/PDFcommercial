import { app, ipcMain } from 'electron';
import * as path from 'path';
import fsExtra from 'fs-extra';

export function registerSettingsIpc() {
  ipcMain.handle('load-settings', async () => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
      if (await fsExtra.pathExists(settingsPath)) {
        return await fsExtra.readJson(settingsPath);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
    return {};
  });

  ipcMain.handle('save-settings', async (_e, settings) => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
      await fsExtra.writeJson(settingsPath, settings, { spaces: 2 });
      return true;
    } catch (err) {
      console.error('Error saving settings:', err);
      return false;
    }
  });
}