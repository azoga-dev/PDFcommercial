import { BrowserWindow, ipcMain } from 'electron';
import { ServiceContainer } from '../services';

export function registerCompressIpc(getMainWindow: () => BrowserWindow | null) {
  const serviceContainer = ServiceContainer.getInstance();
  
  // Отмена сжатия
  ipcMain.handle('cancel-compress', async () => {
    serviceContainer.pdfCompressService.cancel();
    return true;
  });

  // Drag&drop список файлов
  ipcMain.handle(
    'compress-files',
    async (
      _e,
      {
        files,
        outputFolder,
        quality = 30,
      }: { files: string[]; outputFolder: string; quality?: number },
    ) => {
      const mainWindow = getMainWindow();
      
      try {
        // Вызов сервиса сжатия файлов
        const result = await serviceContainer.pdfCompressService.compressFiles({
          files,
          outputFolder,
          quality
        });

        // Отправка завершения операции
        mainWindow?.webContents.send('compress-complete', {
          processed: result.processed,
          total: result.total,
          log: result.log,
        });

        return result;
      } catch (err) {
        const em = `Ошибка compress-files: ${(err as Error).message}`;
        const result = {
          processed: 0,
          total: 0,
          log: [em],
          used: 'none',
          files: []
        };
        
        getMainWindow()?.webContents.send('compress-complete', {
          processed: result.processed,
          total: result.total,
          log: result.log,
        });
        
        return result;
      }
    },
  );

  // Сжатие папки
  ipcMain.handle(
    'compress-pdfs',
    async (
      _e,
      {
        inputFolder,
        outputFolder,
        quality = 30,
      }: { inputFolder: string; outputFolder: string; quality?: number },
    ) => {
      const mainWindow = getMainWindow();
      
      try {
        // Вызов сервиса сжатия папки
        const result = await serviceContainer.pdfCompressService.compressPDFs({
          inputFolder,
          outputFolder,
          quality
        });

        // Отправка завершения операции
        mainWindow?.webContents.send('compress-complete', {
          processed: result.processed,
          total: result.total,
          log: result.log,
        });

        return result;
      } catch (err) {
        const em = `Ошибка compress-pdfs: ${(err as Error).message}`;
        const result = {
          processed: 0,
          total: 0,
          log: [em],
          used: 'none',
          files: []
        };
        
        getMainWindow()?.webContents.send('compress-complete', {
          processed: result.processed,
          total: result.total,
          log: result.log,
        });
        
        return result;
      }
    },
  );
}