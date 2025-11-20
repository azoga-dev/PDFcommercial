import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Найти Ghostscript: сначала бандл в resources, потом системный PATH. */
export async function findGhostscript(): Promise<string | null> {
  const path = await import('path');
  const fsExtra = await import('fs-extra');

  // 1) Бандл в resources
  try {
    const bundled = path.join(process.resourcesPath, 'ghostscript', 'bin', 'gswin64c.exe');
    if (await fsExtra.default.pathExists(bundled)) {
      try {
        await execFileAsync(bundled, ['--version']);
        return bundled;
      } catch {
        // игнорируем и пробуем дальше
      }
    }
  } catch {
    // ignore
  }

  // 2) PATH
  const candidates = ['gswin64c', 'gswin32c', 'gs'];
  for (const c of candidates) {
    try {
      await execFileAsync(c, ['--version']);
      return c;
    } catch {
      // ignore
    }
  }
  return null;
}

/** Преобразование "качества" (0–100) в PDFSETTINGS Ghostscript. */
export function qualityToPdfSettings(q: number): '/screen' | '/ebook' | '/printer' | '/prepress' {
  if (q <= 12) return '/screen';
  if (q <= 25) return '/ebook';
  if (q <= 40) return '/printer';
  return '/prepress';
}