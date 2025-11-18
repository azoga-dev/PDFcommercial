import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import { PDFDocument } from 'pdf-lib';
import os from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findGhostscript, qualityToPdfSettings } from '../services/ghostscript';

const execFileAsync = promisify(execFile);
let compressCancelRequested = false;

// Максимальное количество одновременно обрабатываемых файлов.
// Можно сделать настраиваемым через настройки, сейчас — константа.
const MAX_PARALLEL = 3;

/**
 * Выполнить функцию для списка pdf-файлов параллельно, но не более maxParallel одновременно.
 * Обеспечивает:
 * - уважение cancel-флага compressCancelRequested;
 * - последовательную отправку прогресса (index) и накопление результата.
 */
async function runInParallel<T>(
  pdfs: string[],
  worker: (fullPath: string, index: number) => Promise<T>,
): Promise<{ results: T[] }> {
  const results: T[] = [];
  let currentIndex = 0; // 1-based index для прогресса
  let active = 0;
  let resolveAll: (() => void) | null = null;

  const allDone = new Promise<void>((resolve) => {
    resolveAll = resolve;
  });

  async function spawnNext() {
    if (compressCancelRequested) {
      // если уже запрошена отмена — больше ничего не запускаем
      if (active === 0 && resolveAll) resolveAll();
      return;
    }
    const idx = pdfs.length - (pdfs.length - currentIndex);
    if (currentIndex >= pdfs.length) {
      if (active === 0 && resolveAll) resolveAll();
      return;
    }
    const myIndex = ++currentIndex;
    const fullPath = pdfs[myIndex - 1];
    active++;
    try {
      const res = await worker(fullPath, myIndex);
      results.push(res);
    } finally {
      active--;
      if (currentIndex < pdfs.length && !compressCancelRequested) {
        void spawnNext();
      } else if (active === 0 && resolveAll) {
        resolveAll();
      }
    }
  }

  const initialWorkers = Math.min(MAX_PARALLEL, pdfs.length);
  for (let i = 0; i < initialWorkers; i++) {
    void spawnNext();
  }

  await allDone;
  return { results };
}

export function registerCompressIpc(getMainWindow: () => BrowserWindow | null) {
  // Отмена сжатия
  ipcMain.handle('cancel-compress', async () => {
    compressCancelRequested = true;
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
      const result: {
        processed: number;
        total: number;
        log: string[];
        used?: string;
        files?: any[];
      } = { processed: 0, total: 0, log: [], used: 'none', files: [] };

      const gsCmd = await findGhostscript();
      if (gsCmd) {
        result.used = `ghostscript (${
          gsCmd.includes('resources') ? 'bundled' : 'system'
        })`;
        result.log.push(`[INFO] Используется Ghostscript: ${gsCmd}`);
      } else {
        result.used = 'pdf-lib(fallback)';
        result.log.push('[WARN] Ghostscript не найден, fallback режим.');
      }

      try {
        if (!files || !Array.isArray(files) || files.length === 0) {
          throw new Error('Нет файлов для сжатия');
        }
        if (!outputFolder) throw new Error('Не указана папка вывода');
        await fsExtra.ensureDir(outputFolder);

        compressCancelRequested = false;

        const pdfs: string[] = [];
        for (const f of files) {
          try {
            const st = await fsp.stat(f);
            if (st.isFile() && f.toLowerCase().endsWith('.pdf')) pdfs.push(f);
          } catch {
            /* skip */
          }
        }
        result.total = pdfs.length;
        result.log.push(
          `Получено ${pdfs.length} PDF для сжатия (drag&drop)`,
        );

        const gsCmd2 = await findGhostscript();
        if (gsCmd2) result.used = `ghostscript (${gsCmd2})`;
        else result.used = 'pdf-lib(fallback)';

        // Параллельная обработка pdfs
        await runInParallel(pdfs, async (fullPath, index) => {
          if (compressCancelRequested) {
            return;
          }
          const fname = path.basename(fullPath);
          const outP = path.join(outputFolder, fname);
          const fileInfo: any = { name: fname, ok: false };
          const tmpIn = path.join(os.tmpdir(), `in-${randomUUID()}.pdf`);
          const tmpOut = path.join(os.tmpdir(), `out-${randomUUID()}.pdf`);

          try {
            const statIn = await fsp
              .stat(fullPath)
              .catch(() => ({ size: undefined as any }));
            fileInfo.inSize = statIn.size;

            if (gsCmd2) {
              await fsp.copyFile(fullPath, tmpIn);
              const pdfSetting = qualityToPdfSettings(quality);
              const args = [
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                `-dPDFSETTINGS=${pdfSetting}`,
                '-dNOPAUSE',
                '-dBATCH',
                `-sOutputFile=${tmpOut}`,
                tmpIn,
              ];
              try {
                await execFileAsync(gsCmd2, args);
                if (!(await fsExtra.pathExists(tmpOut))) {
                  throw new Error(
                    'Ghostscript не создал выходной файл',
                  );
                }
                await fsExtra.copy(tmpOut, outP, { overwrite: true });
                fileInfo.ok = true;
                fileInfo.notes = `GS:${pdfSetting}`;
                result.log.push(
                  `GS: ${fname} -> ${outP} (${pdfSetting})`,
                );
              } catch (gsErr) {
                fileInfo.ok = false;
                fileInfo.error = (gsErr as Error).message;
                result.log.push(
                  `Ошибка GS ${fname}: ${(gsErr as Error).message}`,
                );
              } finally {
                try {
                  await fsExtra.remove(tmpIn);
                } catch {}
                try {
                  await fsExtra.remove(tmpOut);
                } catch {}
              }
            } else {
              try {
                const inputBytes = await fsp.readFile(fullPath);
                const pdfDoc = await PDFDocument.load(inputBytes);
                const outBytes = await pdfDoc.save();
                await fsp.writeFile(outP, outBytes);
                fileInfo.ok = true;
                fileInfo.notes = 'fallback';
                result.log.push(`FB: ${fname} -> ${outP}`);
              } catch (fbErr) {
                fileInfo.ok = false;
                fileInfo.error = (fbErr as Error).message;
                result.log.push(
                  `Ошибка fallback ${fname}: ${(fbErr as Error).message}`,
                );
              }
            }

            const statOut = await fsp
              .stat(outP)
              .catch(() => ({ size: undefined as any }));
            fileInfo.outSize = statOut.size;
            result.files?.push(fileInfo);
            result.processed++;

            mainWindow?.webContents.send('compress-progress', {
              index,
              total: result.total,
              name: fname,
              inSize: fileInfo.inSize,
              outSize: fileInfo.outSize,
              ok: fileInfo.ok,
              error: fileInfo.error || null,
              notes: fileInfo.notes || null,
            });
          } catch (err) {
            fileInfo.ok = false;
            fileInfo.error = (err as Error).message;
            result.log.push(
              `Ошибка обработки ${fname}: ${(err as Error).message}`,
            );
            mainWindow?.webContents.send('compress-progress', {
              index,
              total: result.total,
              name: fname,
              ok: false,
              error: fileInfo.error || null,
            });
          }
        });

        mainWindow?.webContents.send('compress-complete', {
          processed: result.processed,
          total: result.total,
          log: result.log,
        });
        result.log.unshift(`Сжатие завершено. Engine: ${result.used}`);
        return result;
      } catch (err) {
        const em = `Ошибка compress-files: ${(err as Error).message}`;
        result.log.push(em);
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
      const result: {
        processed: number;
        total: number;
        log: string[];
        used?: string;
        files?: Array<{
          name: string;
          inSize?: number;
          outSize?: number;
          ok: boolean;
          error?: string;
          notes?: string;
        }>;
      } = { processed: 0, total: 0, log: [], used: 'none', files: [] };

      try {
        if (!inputFolder || !outputFolder) {
          throw new Error('Не указаны папки inputFolder/outputFolder');
        }
        if (!(await fsExtra.pathExists(inputFolder))) {
          throw new Error(`Input folder не найден: ${inputFolder}`);
        }
        await fsExtra.ensureDir(outputFolder);

        compressCancelRequested = false;

        const all = await fsp.readdir(inputFolder);
        const pdfs = all.filter((f) => f.toLowerCase().endsWith('.pdf'));
        result.total = pdfs.length;
        result.log.push(
          `Найдено ${pdfs.length} PDF в ${inputFolder}`,
        );

        const gsCmd = await findGhostscript();
        if (gsCmd) {
          result.used = `ghostscript (${
            gsCmd.includes('resources') ? 'bundled' : 'system'
          })`;
          result.log.push(`[INFO] Используется Ghostscript: ${gsCmd}`);
        } else {
          result.used = 'pdf-lib(fallback)';
          result.log.push('[WARN] Ghostscript не найден, fallback режим.');
        }

        await runInParallel(pdfs, async (fname, index) => {
          if (compressCancelRequested) {
            return;
          }

          const inP = path.join(inputFolder, fname);
          const outP = path.join(outputFolder, fname);
          const fileInfo: any = { name: fname, ok: false };
          const tmpIn = path.join(os.tmpdir(), `in-${randomUUID()}.pdf`);
          const tmpOut = path.join(os.tmpdir(), `out-${randomUUID()}.pdf`);

          try {
            const statIn = await fsp
              .stat(inP)
              .catch(() => ({ size: undefined as any }));
            fileInfo.inSize = statIn.size;

            if (gsCmd) {
              await fsp.copyFile(inP, tmpIn);
              const pdfSetting = qualityToPdfSettings(quality);
              const args = [
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                `-dPDFSETTINGS=${pdfSetting}`,
                '-dNOPAUSE',
                '-dBATCH',
                `-sOutputFile=${tmpOut}`,
                tmpIn,
              ];

              try {
                const { stdout, stderr } = await execFileAsync(
                  gsCmd,
                  args,
                );
                if (stdout)
                  result.log.push(
                    `[gs stdout] ${String(stdout).trim()}`,
                  );
                if (stderr)
                  result.log.push(
                    `[gs stderr] ${String(stderr).trim()}`,
                  );

                if (!(await fsExtra.pathExists(tmpOut))) {
                  throw new Error(
                    `Ghostscript не создал выходной файл (tmpOut отсутствует)`,
                  );
                }

                await fsExtra.copy(tmpOut, outP, { overwrite: true });

                fileInfo.ok = true;
                fileInfo.notes = `GS:${pdfSetting}`;
                result.log.push(
                  `GS: ${fname} -> ${outP} (${pdfSetting})`,
                );
              } catch (gsErr) {
                fileInfo.ok = false;
                fileInfo.error = (gsErr as Error).message;
                result.log.push(
                  `Ошибка Ghostscript для ${fname}: ${
                    (gsErr as Error).message
                  }`,
                );
              } finally {
                try {
                  await fsExtra.remove(tmpIn);
                } catch {}
                try {
                  await fsExtra.remove(tmpOut);
                } catch {}
              }
            } else {
              try {
                const inputBytes = await fsp.readFile(inP);
                const pdfDoc = await PDFDocument.load(inputBytes);
                const outBytes = await pdfDoc.save();
                await fsp.writeFile(outP, outBytes);
                fileInfo.ok = true;
                fileInfo.notes = 'fallback';
                result.log.push(`FB: ${fname} -> ${outP}`);
              } catch (fbErr) {
                fileInfo.ok = false;
                fileInfo.error = (fbErr as Error).message;
                result.log.push(
                  `Ошибка fallback для ${fname}: ${
                    (fbErr as Error).message
                  }`,
                );
              }
            }

            const statOut = await fsp
              .stat(outP)
              .catch(() => ({ size: undefined as any }));
            fileInfo.outSize = statOut.size;
            result.files?.push(fileInfo);
            result.processed++;

            mainWindow?.webContents.send('compress-progress', {
              index,
              total: result.total,
              name: fname,
              inSize: fileInfo.inSize,
              outSize: fileInfo.outSize,
              ok: fileInfo.ok,
              error: fileInfo.error || null,
              notes: fileInfo.notes || null,
            });
          } catch (errFile) {
            fileInfo.ok = false;
            fileInfo.error = (errFile as Error).message;
            result.log.push(
              `Ошибка обработки ${fname}: ${
                (errFile as Error).message
              }`,
            );

            mainWindow?.webContents.send('compress-progress', {
              index,
              total: result.total,
              name: fname,
              inSize: fileInfo.inSize,
              outSize: fileInfo.outSize,
              ok: false,
              error: fileInfo.error || null,
              notes: fileInfo.notes || null,
            });
          }

          if (compressCancelRequested) {
            const cancelMsg = 'Операция сжатия отменена пользователем';
            result.log.push(cancelMsg);
          }
        });

        mainWindow?.webContents.send('compress-complete', {
          processed: result.processed,
          total: result.total,
          log: result.log,
        });
        result.log.unshift(`Сжатие завершено. Engine: ${result.used}`);
        return result;
      } catch (err) {
        const em = `Ошибка compress-pdfs: ${(err as Error).message}`;
        result.log.push(em);
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