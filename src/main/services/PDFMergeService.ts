import { PDFDocument } from 'pdf-lib';
import * as path from 'path';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import { IPDFMergeService, IFileSystemService, ILoggingService } from './interfaces';
import { buildDict, extractNotificationCode, extractZepbCode, fileMarkedProcessed } from './dictBuilder';
import { createRegisterDocx } from './registerDocx';

export class PDFMergeService implements IPDFMergeService {
  private cancelRequested = false;

  constructor(
    private fileSystemService: IFileSystemService,
    private loggingService: ILoggingService
  ) {}

  async mergePDFs(options: {
    mainFolder: string;
    insertFolder: string;
    outputFolder: string;
    recursiveMain: boolean;
    recursiveInsert: boolean;
  }): Promise<any> {
    const { mainFolder, insertFolder, outputFolder, recursiveMain, recursiveInsert } = options;
    
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
        throw new Error('Folders not specified');
      }
      await this.fileSystemService.ensureDir(outputFolder);

      this.cancelRequested = false;

      // 1) Fast dictionary building (code -> filepath)
      const insertDict = await buildDict(
        insertFolder,
        !!recursiveInsert,
        (full, name) => {
          // Check if file is PDF
          const isPdf = full.toLowerCase().endsWith('.pdf');
          if (!isPdf) return false;
          
          // Exclude files that are ZEPB (contain ZEPB indicators)
          const lowerName = name.toLowerCase();
          const hasZepbIndicator = /зэпб|зэсб|эпб|з\s*э\s*п\s*б|з[её]пб/i.test(lowerName);
          
          // Also check if we can extract notification code from filename
          const code = extractNotificationCode(name);
          return !hasZepbIndicator && (code !== null);
        },
        extractNotificationCode,
      );

      const zepbDict = await buildDict(
        mainFolder,
        !!recursiveMain,
        (full, name) => {
          // Check if file is PDF and contains possible ZEPB indicators
          const isPdf = full.toLowerCase().endsWith('.pdf');
          if (!isPdf) return false;
          
          // Check for ZEPB indicators in filename
          const lowerName = name.toLowerCase();
          const hasZepbIndicator = /зэпб|зэсб|эпб|з\s*э\s*п\s*б|з[её]пб/i.test(lowerName);
          
          // Also check if we can extract ZEPB code from filename
          const code = extractZepbCode(name);
          return hasZepbIndicator || (code !== null);
        },
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

      const processedNames: string[] = [];

      for (let i = 0; i < insertCodes.length; i++) {
        if (this.cancelRequested) {
          const cancelMsg = 'Merge operation canceled by user';
          summary.log.push(cancelMsg);
          summary.canceled = true;
          break;
        }

        const code = insertCodes[i];
        const notifPath = insertDict[code];
        const zepbPath = zepbDict[code];
        const index = i + 1;

        if (!zepbPath) {
          const msg = `No ZEPB found for notification: ${path.basename(notifPath)} (${code})`;
          summary.log.push(msg);
          summary.skipped++;
          continue;
        }

        if (fileMarkedProcessed(path.basename(zepbPath))) {
          const msg = `Skipped already processed ZEPB: ${path.basename(zepbPath)}`;
          summary.log.push(msg);
          summary.skipped++;
          continue;
        }

        try {
          const [notifBuf, zepbBuf] = await Promise.all([
            this.fileSystemService.readFile(notifPath),
            this.fileSystemService.readFile(zepbPath),
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
            .replace(/\s*\((с увед.*?)\)\s*$/i, '')
            .replace(/\s*(с увед.*?)$/i, '');
          const outName = `${base} (с увед).pdf`;
          const outFull = path.join(outputFolder, outName);
          await this.fileSystemService.writeFile(outFull, await merged.save());

          summary.processed++;
          processedNames.push(outName);

          const msg = `Merged: ${outName}`;
          summary.log.push(msg);
        } catch (err) {
          const msg = `Error merging code ${code}: ${(err as Error).message}`;
          summary.log.push(msg);
          summary.errors.push(msg);
          summary.skipped++;
        }
      }

      const registryPath = processedNames.length
        ? await createRegisterDocx(outputFolder, processedNames)
        : null;

      return {
        ...summary,
        registry: registryPath,
        unmatchedNotifications,
        unmatchedZepb,
      };
    } catch (err) {
      const em = (err as Error).message || String(err);
      const msg = `Merge error: ${em}`;
      console.error(msg);
      summary.errors.push(msg);
      summary.log.push(msg);
      return {
        ...summary,
        registry: null,
        unmatchedNotifications: [],
        unmatchedZepb: [],
      };
    }
  }

  cancel(): void {
    this.cancelRequested = true;
  }
}