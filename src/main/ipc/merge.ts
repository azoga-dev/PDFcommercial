import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { promises as fsp } from 'fs';
import { PDFDocument } from 'pdf-lib';
import fsExtra from 'fs-extra';
import { buildDict, extractNotificationCode, extractZepbCode, fileMarkedProcessed } from '../services/dictBuilder';
import { createRegisterDocx } from '../services/registerDocx';
import { appendLog } from '../services/loggingStore';

let mergeCancelRequested = false;

export function registerMergeIpc(getMainWindow: () => BrowserWindow | null) {
  // Отмена текущего мерджа
  ipcMain.handle('cancel-merge', async () => {
    mergeCancelRequested = true;
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
      const summary = {
        processed: 0,
        skipped: 0,
        errors: [] as string[],
        log: [] as string[],
        total: 0,
        canceled: false as boolean,
      };

      try {
        if (!mainFolder || !insertFolder || !outputFolder) {
          throw new Error('Не указаны папки');
        }
        await fsExtra.ensureDir(outputFolder);

        mergeCancelRequested = false;

        // 1) Быстрое построение словарей (code -> filepath)
        const insertDict = await buildDict(
          insertFolder,
          !!recursiveInsert,
          (full) => full.toLowerCase().endsWith('.pdf'),
          extractNotificationCode,
        );

        const zepbDict = await buildDict(
          mainFolder,
          !!recursiveMain,
          (full, name) =>
            full.toLowerCase().endsWith('.pdf') &&
            name.toLowerCase().includes('зэпб'),
          extractZepbCode,
        );

        const insertCodes = Object.keys(insertDict);
        const zepbCodes = Object.keys(zepbDict);

        summary.total = insertCodes.length;

        const zepbSet = new Set(zepbCodes);
        const insertSet = new Set(insertCodes);

        const unmatchedNotifications = insertCodes
          .filter((code) => !zepbSet.has(code))
          .map((code) => ({ code, file: path.basename(insertDict[code]) }));

        const unmatchedZepb = zepbCodes
          .filter((code) => !insertSet.has(code))
          .map((code) => ({ code, file: path.basename(zepbDict[code]) }));

        // Предварительное событие
        mainWindow?.webContents.send('merge-unmatched', {
          unmatchedNotifications,
          unmatchedZepb,
        });

        const processedNames: string[] = [];

        for (let i = 0; i < insertCodes.length; i++) {
          if (mergeCancelRequested) {
            const cancelMsg = 'Операция объединения отменена пользователем';
            summary.log.push(cancelMsg);
            summary.canceled = true;
            mainWindow?.webContents.send('merge-progress', {
              processed: summary.processed,
              skipped: summary.skipped,
              total: summary.total,
              current: i + 1,
              message: cancelMsg,
            });
            appendLog(cancelMsg);
            break;
          }

          const code = insertCodes[i];
          const notifPath = insertDict[code];
          const zepbPath = zepbDict[code];
          const index = i + 1;

          if (!zepbPath) {
            const msg = `Не найден ЗЭПБ для уведомления: ${path.basename(
              notifPath,
            )} (${code})`;
            summary.log.push(msg);
            summary.skipped++;
            mainWindow?.webContents.send('merge-progress', {
              processed: summary.processed,
              skipped: summary.skipped,
              total: summary.total,
              current: index,
              code,
              message: msg,
            });
            appendLog(msg);
            continue;
          }

          if (fileMarkedProcessed(path.basename(zepbPath))) {
            const msg = `Пропущен уже обработанный ЗЭПБ: ${path.basename(
              zepbPath,
            )}`;
            summary.log.push(msg);
            summary.skipped++;
            mainWindow?.webContents.send('merge-progress', {
              processed: summary.processed,
              skipped: summary.skipped,
              total: summary.total,
              current: index,
              code,
              message: msg,
            });
            appendLog(msg);
            continue;
          }

          try {
            const [notifBuf, zepbBuf] = await Promise.all([
              fsp.readFile(notifPath),
              fsp.readFile(zepbPath),
            ]);
            const [notifDoc, zepbDoc] = await Promise.all([
              PDFDocument.load(notifBuf),
              PDFDocument.load(zepbBuf),
            ]);
            const merged = await PDFDocument.create();

            const notifPages = await merged.copyPages(
              notifDoc,
              notifDoc.getPageIndices(),
            );
            notifPages.forEach((p) => merged.addPage(p));

            const zepbPages = await merged.copyPages(
              zepbDoc,
              zepbDoc.getPageIndices(),
            );
            zepbPages.forEach((p) => merged.addPage(p));

            const base = path
              .basename(zepbPath, '.pdf')
              .replace(/\s*\(с увед.*?\)\s*$/i, '')
              .replace(/\s*с увед.*?$/i, '');
            const outName = `${base} (с увед).pdf`;
            const outFull = path.join(outputFolder, outName);
            await fsp.writeFile(outFull, await merged.save());

            summary.processed++;
            processedNames.push(outName);

            const msg = `Сшито: ${outName}`;
            summary.log.push(msg);
            mainWindow?.webContents.send('merge-progress', {
              processed: summary.processed,
              skipped: summary.skipped,
              total: summary.total,
              current: index,
              code,
              message: msg,
            });
            appendLog(msg);
          } catch (err) {
            const msg = `Ошибка при объединении кода ${code}: ${
              (err as Error).message
            }`;
            summary.log.push(msg);
            summary.errors.push(msg);
            summary.skipped++;
            mainWindow?.webContents.send('merge-progress', {
              processed: summary.processed,
              skipped: summary.skipped,
              total: summary.total,
              current: index,
              code,
              message: msg,
            });
            appendLog(msg);
          }
        }

        const registryPath = processedNames.length
          ? await createRegisterDocx(outputFolder, processedNames)
          : null;

        mainWindow?.webContents.send('merge-complete', {
          summary,
          registry: registryPath,
          unmatchedNotifications,
          unmatchedZepb,
        });

        return {
          ...summary,
          registry: registryPath,
          unmatchedNotifications,
          unmatchedZepb,
        };
      } catch (err) {
        const em = (err as Error).message || String(err);
        const msg = `Ошибка объединения: ${em}`;
        console.error(msg);
        summary.errors.push(msg);
        summary.log.push(msg);
        const mainWindow2 = getMainWindow();
        mainWindow2?.webContents.send('merge-complete', {
          summary,
          registry: null,
          unmatchedNotifications: [],
          unmatchedZepb: [],
        });
        return {
          ...summary,
          registry: null,
          unmatchedNotifications: [],
          unmatchedZepb: [],
        };
      }
    },
  );
}