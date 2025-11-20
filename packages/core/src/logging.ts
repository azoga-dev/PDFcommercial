import { BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fsp } from 'fs';
import { createLogWindow } from '../windows/logWindow';
import { appendLog, getLog } from '../services/loggingStore';

export function registerLoggingIpc(getMainWindow: () => BrowserWindow | null) {
  // Открыть окно логов
  ipcMain.handle('open-log-window', async () => {
    createLogWindow();
    return true;
  });

  // Экспорт логов
  ipcMain.handle('export-log', async (_e, suggestedName?: string) => {
    const defaultName =
      suggestedName ||
      `pdfmanager-log-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:.]/g, '-')}.txt`;

    const win = BrowserWindow.getFocusedWindow() || getMainWindow();
    if (!win) return { ok: false };

    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'Text', extensions: ['txt', 'log'] }],
    });

    if (canceled || !filePath) return { ok: false };
    try {
      await fsp.writeFile(filePath, getLog(), { encoding: 'utf8' });
      return { ok: true, path: filePath };
    } catch (err) {
      console.error('Export log error:', err);
      return { ok: false, error: (err as Error).message };
    }
  });

  // Приём строки лога
  ipcMain.on('append-log', (_e, message: string) => {
    const line = typeof message === 'string' ? message : JSON.stringify(message);
    appendLog(line);
    const logWin = BrowserWindow.getAllWindows().find(
      (w) => w.getTitle && w.getTitle() === 'Лог приложения',
    );
    if (logWin && !logWin.isDestroyed()) {
      logWin.webContents.send('log-append', line);
    }
  });
}