import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import { buildDict, extractNotificationCode, extractZepbCode } from '../services/dictBuilder';

export function registerFsIpc(getMainWindow: () => BrowserWindow | null) {
  // Диалог выбора папки
  let lastSelectedFolder: string | null = null;

  ipcMain.handle('select-folder', async (_event, defaultPath?: string) => {
    const mainWindow = getMainWindow();
    const startPath =
      defaultPath && (await fsExtra.pathExists(defaultPath))
        ? defaultPath
        : lastSelectedFolder && (await fsExtra.pathExists(lastSelectedFolder))
        ? lastSelectedFolder
        : undefined;

    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      defaultPath: startPath,
    });

    if (!result.canceled && result.filePaths.length) {
      lastSelectedFolder = result.filePaths[0];
      return lastSelectedFolder;
    }
    return null;
  });

  // Проверка — является ли путь директорией
  ipcMain.handle('path-is-directory', async (_e, p: string) => {
    try {
      const st = await fsp.stat(p);
      return st.isDirectory();
    } catch {
      return false;
    }
  });

  // Построение словаря
  ipcMain.handle(
    'build-dict',
    async (
      _e,
      type: 'zepb' | 'insert',
      folderPath: string,
      recursive: boolean,
    ) => {
      try {
        if (type === 'zepb') {
          return await buildDict(
            folderPath,
            recursive,
            (f, n) =>
              f.toLowerCase().endsWith('.pdf') &&
              n.toLowerCase().includes('зэпб'),
            extractZepbCode,
          );
        }
        return await buildDict(
          folderPath,
          recursive,
          (f) => f.toLowerCase().endsWith('.pdf'),
          extractNotificationCode,
        );
      } catch {
        return {};
      }
    },
  );

  // Кол-во файлов в папке (не рекурсивно)
  ipcMain.handle('count-files-in-folder', async (_e, folderPath: string) => {
    const items = await fsp.readdir(folderPath, { withFileTypes: true });
    return items.filter((i) => i.isFile()).length;
  });

  // Открыть папку
  ipcMain.handle('open-folder', async (_e, folderPath: string) => {
    try {
      await shell.openPath(folderPath);
      return true;
    } catch {
      return false;
    }
  });

  // Подсчитать количество PDF-файлов в папке (рекурсивно)
  ipcMain.handle(
    'count-pdf-files-in-folder',
    async (_e, folderPath: string) => {
      const countPdf = async (dir: string): Promise<number> => {
        let total = 0;
        try {
          const entries = await fsp.readdir(dir, { withFileTypes: true });
          for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isFile()) {
              if (ent.name.toLowerCase().endsWith('.pdf')) total++;
            } else if (ent.isDirectory()) {
              total += await countPdf(full);
            }
          }
        } catch {
          return 0;
        }
        return total;
      };

      try {
        if (!folderPath) return 0;
        const st = await fsp.stat(folderPath).catch(() => null);
        if (!st || !st.isDirectory()) return 0;
        return await countPdf(folderPath);
      } catch {
        return 0;
      }
    },
  );
}