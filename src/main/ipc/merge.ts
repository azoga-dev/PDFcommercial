import { BrowserWindow, ipcMain } from 'electron';
import { ServiceContainer } from '../services';

export function registerMergeIpc(getMainWindow: () => BrowserWindow | null) {
  const serviceContainer = ServiceContainer.getInstance();
  
  // Отмена текущего мерджа
  ipcMain.handle('cancel-merge', async () => {
    serviceContainer.pdfMergeService.cancel();
    return true;
  });

  // Основной обработчик объединения
  ipcMain.handle(
    'merge-pdfs',
    async (
      _event,
      { mainFolder, insertFolder, outputFolder, recursiveMain, recursiveInsert }: any,
    ) => {
      const mainWindow = getMainWindow();
      
      try {
        // Вызов сервиса объединения
        const result = await serviceContainer.pdfMergeService.mergePDFs({
          mainFolder,
          insertFolder,
          outputFolder,
          recursiveMain,
          recursiveInsert
        });

        // Отправка завершения операции
        mainWindow?.webContents.send('merge-complete', {
          summary: result,
          registry: result.registry,
          unmatchedNotifications: result.unmatchedNotifications || [],
          unmatchedZepb: result.unmatchedZepb || [],
        });

        // Отправка предварительных данных о несшитых
        if (result.unmatchedNotifications || result.unmatchedZepb) {
          mainWindow?.webContents.send('merge-unmatched', {
            unmatchedNotifications: result.unmatchedNotifications || [],
            unmatchedZepb: result.unmatchedZepb || [],
          });
        }

        return result;
      } catch (err) {
        const em = (err as Error).message || String(err);
        const msg = `Ошибка объединения: ${em}`;
        console.error(msg);
        
        const result = {
          processed: 0,
          skipped: 0,
          errors: [msg],
          log: [msg],
          total: 0,
          canceled: false,
          registry: null,
          unmatchedNotifications: [],
          unmatchedZepb: [],
        };
        
        const mainWindow2 = getMainWindow();
        mainWindow2?.webContents.send('merge-complete', {
          summary: result,
          registry: null,
          unmatchedNotifications: [],
          unmatchedZepb: [],
        });
        
        return result;
      }
    },
  );
}