import { PDFDocument } from 'pdf-lib';
import * as path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import { IPDFCompressService, IGhostscriptService, IFileSystemService, ILoggingService } from './interfaces';

export class PDFCompressService implements IPDFCompressService {
  private cancelRequested = false;
  private readonly maxParallel: number = 3;

  constructor(
    private ghostscriptService: IGhostscriptService,
    private fileSystemService: IFileSystemService,
    private loggingService: ILoggingService
  ) {}

  async compressFiles(options: {
    files: string[];
    outputFolder: string;
    quality?: number;
  }): Promise<any> {
    const { files, outputFolder, quality = 30 } = options;
    
    const result: any = {
      processed: 0,
      total: 0,
      log: [],
      used: 'none',
      files: []
    };

    try {
      const gsCmd = await this.ghostscriptService.findGhostscript();
      if (gsCmd) {
        result.used = `ghostscript (${gsCmd.includes('resources') ? 'bundled' : 'system'})`;
        result.log.push(`[INFO] Using Ghostscript: ${gsCmd}`);
      } else {
        result.used = 'pdf-lib(fallback)';
        result.log.push('[WARN] Ghostscript not found, fallback mode.');
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new Error('No files for compression');
      }
      if (!outputFolder) throw new Error('Output folder not specified');
      await this.fileSystemService.ensureDir(outputFolder);

      this.cancelRequested = false;

      const pdfs: string[] = [];
      for (const f of files) {
        try {
          const stat = await this.fileSystemService.stat(f);
          if (stat.isFile() && f.toLowerCase().endsWith('.pdf')) {
            pdfs.push(f);
          }
        } catch {
          /* skip */
        }
      }
      result.total = pdfs.length;
      result.log.push(`Received ${pdfs.length} PDF for compression (drag&drop)`);

      // Параллельная обработка PDF
      await this.runInParallel(pdfs, async (fullPath, index) => {
        if (this.cancelRequested) return;

        const fname = path.basename(fullPath);
        const outP = path.join(outputFolder, fname);
        const fileInfo: any = { name: fname, ok: false };
        const tmpIn = path.join(os.tmpdir(), `in-${randomUUID()}.pdf`);
        const tmpOut = path.join(os.tmpdir(), `out-${randomUUID()}.pdf`);

        try {
          const statIn = await this.fileSystemService.stat(fullPath).catch(() => ({ size: undefined as any }));
          fileInfo.inSize = statIn.size;

          if (gsCmd) {
            await this.fileSystemService.copyFile(fullPath, tmpIn);
            
            try {
              await this.ghostscriptService.compressPDF(tmpIn, tmpOut, quality);
              await this.fileSystemService.copyFile(tmpOut, outP);
              fileInfo.ok = true;
              fileInfo.notes = `GS:${this.ghostscriptService.qualityToPdfSettings(quality)}`;
              result.log.push(`GS: ${fname} -> ${outP} (${this.ghostscriptService.qualityToPdfSettings(quality)})`);
            } catch (gsErr) {
              fileInfo.ok = false;
              fileInfo.error = (gsErr as Error).message;
              result.log.push(`GS error ${fname}: ${(gsErr as Error).message}`);
            } finally {
              try { await this.fileSystemService.remove(tmpIn); } catch {}
              try { await this.fileSystemService.remove(tmpOut); } catch {}
            }
          } else {
            // Резервный метод сжатия через pdf-lib
            try {
              const inputBytes = await this.fileSystemService.readFile(fullPath);
              const pdfDoc = await PDFDocument.load(inputBytes);
              const outBytes = await pdfDoc.save();
              await this.fileSystemService.writeFile(outP, outBytes);
              fileInfo.ok = true;
              fileInfo.notes = 'fallback';
              result.log.push(`FB: ${fname} -> ${outP}`);
            } catch (fbErr) {
              fileInfo.ok = false;
              fileInfo.error = (fbErr as Error).message;
              result.log.push(`Fallback error ${fname}: ${(fbErr as Error).message}`);
            }
          }

          const statOut = await this.fileSystemService.stat(outP).catch(() => ({ size: undefined as any }));
          fileInfo.outSize = statOut.size;
          result.files?.push(fileInfo);
          result.processed++;

        } catch (err) {
          fileInfo.ok = false;
          fileInfo.error = (err as Error).message;
          result.log.push(`Error processing ${fname}: ${(err as Error).message}`);
        }
      });

      result.log.unshift(`Compression completed. Engine: ${result.used}`);
      return result;
    } catch (err) {
      const em = `Error compressing files: ${(err as Error).message}`;
      result.log.push(em);
      return result;
    }
  }

  async compressPDFs(options: {
    inputFolder: string;
    outputFolder: string;
    quality?: number;
  }): Promise<any> {
    const { inputFolder, outputFolder, quality = 30 } = options;
    
    const result: any = {
      processed: 0,
      total: 0,
      log: [],
      used: 'none',
      files: []
    };

    try {
      if (!inputFolder || !outputFolder) {
        throw new Error('Input/output folders not specified');
      }
      if (!(await this.fileSystemService.pathExists(inputFolder))) {
        throw new Error(`Input folder not found: ${inputFolder}`);
      }
      await this.fileSystemService.ensureDir(outputFolder);

      this.cancelRequested = false;

      const all = await this.fileSystemService.readdir(inputFolder);
      const pdfs = all.filter((f) => f.toLowerCase().endsWith('.pdf'));
      result.total = pdfs.length;
      result.log.push(`Found ${pdfs.length} PDF in ${inputFolder}`);

      const gsCmd = await this.ghostscriptService.findGhostscript();
      if (gsCmd) {
        result.used = `ghostscript (${gsCmd.includes('resources') ? 'bundled' : 'system'})`;
        result.log.push(`[INFO] Using Ghostscript: ${gsCmd}`);
      } else {
        result.used = 'pdf-lib(fallback)';
        result.log.push('[WARN] Ghostscript not found, fallback mode.');
      }

      await this.runInParallel(pdfs, async (fname, index) => {
        if (this.cancelRequested) return;

        const inP = path.join(inputFolder, fname);
        const outP = path.join(outputFolder, fname);
        const fileInfo: any = { name: fname, ok: false };
        const tmpIn = path.join(os.tmpdir(), `in-${randomUUID()}.pdf`);
        const tmpOut = path.join(os.tmpdir(), `out-${randomUUID()}.pdf`);

        try {
          const statIn = await this.fileSystemService.stat(inP).catch(() => ({ size: undefined as any }));
          fileInfo.inSize = statIn.size;

          if (gsCmd) {
            await this.fileSystemService.copyFile(inP, tmpIn);
            
            try {
              await this.ghostscriptService.compressPDF(tmpIn, tmpOut, quality);
              await this.fileSystemService.copyFile(tmpOut, outP);
              fileInfo.ok = true;
              fileInfo.notes = `GS:${this.ghostscriptService.qualityToPdfSettings(quality)}`;
              result.log.push(`GS: ${fname} -> ${outP} (${this.ghostscriptService.qualityToPdfSettings(quality)})`);
            } catch (gsErr) {
              fileInfo.ok = false;
              fileInfo.error = (gsErr as Error).message;
              result.log.push(`Ghostscript error for ${fname}: ${(gsErr as Error).message}`);
            } finally {
              try { await this.fileSystemService.remove(tmpIn); } catch {}
              try { await this.fileSystemService.remove(tmpOut); } catch {}
            }
          } else {
            // Резервный метод сжатия через pdf-lib
            try {
              const inputBytes = await this.fileSystemService.readFile(inP);
              const pdfDoc = await PDFDocument.load(inputBytes);
              const outBytes = await pdfDoc.save();
              await this.fileSystemService.writeFile(outP, outBytes);
              fileInfo.ok = true;
              fileInfo.notes = 'fallback';
              result.log.push(`FB: ${fname} -> ${outP}`);
            } catch (fbErr) {
              fileInfo.ok = false;
              fileInfo.error = (fbErr as Error).message;
              result.log.push(`Fallback error for ${fname}: ${(fbErr as Error).message}`);
            }
          }

          const statOut = await this.fileSystemService.stat(outP).catch(() => ({ size: undefined as any }));
          fileInfo.outSize = statOut.size;
          result.files?.push(fileInfo);
          result.processed++;

          if (this.cancelRequested) {
            const cancelMsg = 'Compression operation canceled by user';
            result.log.push(cancelMsg);
          }
        } catch (errFile) {
          fileInfo.ok = false;
          fileInfo.error = (errFile as Error).message;
          result.log.push(`Error processing ${fname}: ${(errFile as Error).message}`);
        }
      });

      result.log.unshift(`Compression completed. Engine: ${result.used}`);
      return result;
    } catch (err) {
      const em = `Error compressing PDFs: ${(err as Error).message}`;
      result.log.push(em);
      return result;
    }
  }

  cancel(): void {
    this.cancelRequested = true;
  }

  /**
   * Выполнить функцию для списка pdf-файлов параллельно, но не более maxParallel одновременно.
   */
  private async runInParallel<T>(
    pdfs: string[],
    worker: (fullPath: string, index: number) => Promise<T>,
  ): Promise<void> {
    const results: T[] = [];
    let currentIndex = 0; // 1-based index for progress
    let active = 0;
    let resolveAll: (() => void) | null = null;

    const allDone = new Promise<void>((resolve) => {
      resolveAll = resolve;
    });

    async function spawnNext() {
      if (this.cancelRequested) {
        // if cancel already requested - don't start new tasks
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
        if (currentIndex < pdfs.length && !this.cancelRequested) {
          void spawnNext();
        } else if (active === 0 && resolveAll) {
          resolveAll();
        }
      }
    }

    const initialWorkers = Math.min(this.maxParallel, pdfs.length);
    for (let i = 0; i < initialWorkers; i++) {
      void spawnNext.call(this);
    }

    await allDone;
  }
}