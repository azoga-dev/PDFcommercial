import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import { ServiceContainer } from '../services';
import { buildDict, extractNotificationCode, extractZepbCode } from '../services/dictBuilder';
import { countZepbPdfFiles, countNotificationPdfFiles } from '../services/fileCounter';

export function registerFsIpc(getMainWindow: () => BrowserWindow | null) {
  const serviceContainer = ServiceContainer.getInstance();
  
  // Диалог выбора папки
  let lastSelectedFolder: string | null = null;

  ipcMain.handle('select-folder', async (_event, defaultPath?: string) => {
    const mainWindow = getMainWindow();
    const startPath =
      defaultPath && (await serviceContainer.fileSystemService.pathExists(defaultPath))
        ? defaultPath
        : lastSelectedFolder && (await serviceContainer.fileSystemService.pathExists(lastSelectedFolder))
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
      const stat = await serviceContainer.fileSystemService.stat(p);
      return stat.isDirectory();
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
            (f, n) => {
              // Проверяем, что файл является PDF и содержит один из возможных признаков ЗЭПБ
              const isPdf = f.toLowerCase().endsWith('.pdf');
              if (!isPdf) return false;
              
              // Проверяем наличие признаков ЗЭПБ в имени файла
              const lowerName = n.toLowerCase();
              const hasZepbIndicator = /зэпб|зэсб|эпб|з\s*э\s*п\s*б|з[её]пб/i.test(lowerName);
              
              // Также проверяем, можно ли извлечь код ЗЭПБ из имени файла
              const code = extractZepbCode(n);
              return hasZepbIndicator || (code !== null);
            },
            extractZepbCode,
          );
        }
        return await buildDict(
          folderPath,
          recursive,
          (f, n) => {
            // Проверяем, что файл является PDF
            const isPdf = f.toLowerCase().endsWith('.pdf');
            if (!isPdf) return false;
            
            // Исключаем файлы, которые являются ЗЭПБ (содержат признаки ЗЭПБ)
            const lowerName = n.toLowerCase();
            const hasZepbIndicator = /зэпб|зэсб|эпб|з\s*э\s*п\s*б|з[её]пб/i.test(lowerName);
            
            // Также проверяем, можно ли извлечь код уведомления из имени файла
            const code = extractNotificationCode(n);
            return !hasZepbIndicator && (code !== null);
          },
          extractNotificationCode,
        );
      } catch {
        return {};
      }
    },
  );

  // Кол-во файлов в папке (не рекурсивно)
  ipcMain.handle('count-files-in-folder', async (_e, folderPath: string) => {
    const items = await serviceContainer.fileSystemService.readdir(folderPath);
    return items.filter((item) => {
      // Проверяем, является ли элемент файлом
      const fullPath = path.join(folderPath, item);
      const stat = serviceContainer.fileSystemService.stat(fullPath);
      return (stat as any).isFile(); // Временное решение, в продакшене нужно улучшить
    }).length;
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

  // Прочитать файл в буфер (для превью PDF / миниатюр)
  ipcMain.handle('fs-read-file-buffer', async (_e, filePath: string) => {
    try {
      const buf = await serviceContainer.fileSystemService.readFile(filePath);
      return buf;
    } catch {
      return null;
    }
  });

  // Подсчитать количество PDF-файлов в папке
  // теперь поддерживается необязательный флаг recursive (по умолчанию true),
  // чтобы UI мог запрашивать как рекурсивный, так и нерекурсивный подсчёт.
  ipcMain.handle(
    'count-pdf-files-in-folder',
    async (_e, folderPath: string, recursive = true, type: 'zepb' | 'notification' | 'all' = 'all') => {
      if (!folderPath) return 0;
      try {
        const st = await serviceContainer.fileSystemService.stat(folderPath).catch(() => null);
        if (!st || !st.isDirectory()) return 0;

        if (type === 'zepb') {
          return await countZepbPdfFiles(folderPath, recursive);
        } else if (type === 'notification') {
          return await countNotificationPdfFiles(folderPath, recursive);
        } else {
          // Подсчет всех PDF-файлов (для обратной совместимости)
          if (!recursive) {
            // Нерекурсивный подсчёт: только файлы в указанной папке
            const entries = await serviceContainer.fileSystemService.readdir(folderPath);
            let count = 0;
            for (const entry of entries) {
              const fullPath = path.join(folderPath, entry);
              const stat = await serviceContainer.fileSystemService.stat(fullPath);
              if (stat.isFile() && entry.toLowerCase().endsWith('.pdf')) {
                count++;
              }
            }
            return count;
          }

          // Рекурсивный подсчёт
          const countPdf = async (dir: string): Promise<number> => {
            let total = 0;
            try {
              const entries = await serviceContainer.fileSystemService.readdir(dir);
              for (const entry of entries) {
                const full = path.join(dir, entry);
                const stat = await serviceContainer.fileSystemService.stat(full);
                if (stat.isFile()) {
                  if (entry.toLowerCase().endsWith('.pdf')) total++;
                } else if (stat.isDirectory()) {
                  total += await countPdf(full);
                }
              }
            } catch {
              return 0;
            }
            return total;
          };

          return await countPdf(folderPath);
        }
      } catch {
        return 0;
      }
    },
  );
}