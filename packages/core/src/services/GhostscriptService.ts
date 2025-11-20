import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import fsExtra from 'fs-extra';
import { IGhostscriptService, IFileSystemService, ILoggingService } from './interfaces';
import { findGhostscript as originalFindGhostscript, qualityToPdfSettings as originalQualityToPdfSettings } from './ghostscript';

const execFileAsync = promisify(execFile);

export class GhostscriptService implements IGhostscriptService {
  constructor(
    private fileSystemService: IFileSystemService,
    private loggingService: ILoggingService
  ) {}

  async findGhostscript(): Promise<string | null> {
    try {
      const gsPath = await originalFindGhostscript();
      if (gsPath) {
        this.loggingService.logDebug(`Found Ghostscript at: ${gsPath}`);
        return gsPath;
      } else {
        this.loggingService.logWarn('Ghostscript not found, fallback mode will be used');
        return null;
      }
    } catch (error) {
      this.loggingService.logError(`Error finding Ghostscript: ${error}`);
      return null;
    }
  }

  qualityToPdfSettings(quality: number): string {
    // Используем оригинальную функцию
    return originalQualityToPdfSettings(quality);
  }

  async compressPDF(inputPath: string, outputPath: string, quality: number): Promise<void> {
    const gsCmd = await this.findGhostscript();
    if (!gsCmd) {
      throw new Error('Ghostscript not available');
    }

    const pdfSetting = this.qualityToPdfSettings(quality);
    const tmpIn = path.join(os.tmpdir(), `in-${randomUUID()}.pdf`);
    const tmpOut = path.join(os.tmpdir(), `out-${randomUUID()}.pdf`);

    try {
      // Копируем входной файл во временный файл
      await this.fileSystemService.copyFile(inputPath, tmpIn);

      const args = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=${pdfSetting}`,
        '-dNOPAUSE',
        '-dBATCH',
        `-sOutputFile=${tmpOut}`,
        tmpIn,
      ];

      const { stdout, stderr } = await execFileAsync(gsCmd, args);

      if (stdout) {
        this.loggingService.logDebug(`[gs stdout] ${String(stdout).trim()}`);
      }
      if (stderr) {
        this.loggingService.logDebug(`[gs stderr] ${String(stderr).trim()}`);
      }

      if (!(await this.fileSystemService.pathExists(tmpOut))) {
        throw new Error(`Ghostscript did not create output file (tmpOut missing)`);
      }

      await this.fileSystemService.copyFile(tmpOut, outputPath);
      this.loggingService.logDebug(`Compressed PDF using Ghostscript: ${inputPath} -> ${outputPath} (${pdfSetting})`);
    } catch (error) {
      this.loggingService.logError(`Ghostscript compression failed: ${error}`);
      throw error;
    } finally {
      // Удаляем временные файлы
      try {
        await this.fileSystemService.remove(tmpIn);
      } catch {}
      try {
        await this.fileSystemService.remove(tmpOut);
      } catch {}
    }
  }
}