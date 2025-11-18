import * as path from 'path';
import { promises as fsp } from 'fs';
import fs from 'fs-extra';

/** Префиксы кодов (ЗЭПБ/уведомления). */
export const PREFIXES = ["СК", "УА", "СППК", "СПД", "РВС", "ПУ", "П", "ГЗУ", "ПТП", "РВС", "ТТП", "НА", "ГЗУ"];

/** Регэксп для кода вида ПРЕФИКС-1234.56 */
export const CODE_REGEX = new RegExp(
  `(${PREFIXES.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})-\\d+(?:\\.\\d+)?`,
  'i'
);

/** Проверка, помечен ли файл как уже обработанный. */
export const fileMarkedProcessed = (name: string) =>
  /(\(.*?(с увед|с уведомл|with notification).*?\)|\bс увед\b|\bс уведомл\b|\bwith notification\b|\bобъединен\b|\bprocessed\b)/i.test(
    name
  );

/** Извлечь код уведомления из имени файла или папки. */
export const extractNotificationCode = (fullPath: string): string | null => {
  const filename = path.basename(fullPath);
  const foldername = path.basename(path.dirname(fullPath));
  const m = filename.match(CODE_REGEX);
  if (m) return m[0].toUpperCase();
  const folderPrefix = PREFIXES.find(p => foldername.toUpperCase().includes(p));
  if (folderPrefix) {
    const nm = filename.match(/\d+(?:\.\d+)?/);
    if (nm) return `${folderPrefix}-${nm[0]}`.toUpperCase();
  }
  return null;
};

/** Извлечь код ЗЭПБ из имени файла. */
export const extractZepbCode = (filename: string): string | null => {
  const m = filename.match(CODE_REGEX);
  return m ? m[0].toUpperCase() : null;
};

/**
 * Привести код к канонической форме для сопоставления.
 * Удаляет дробную часть после точки (СПД-1245.25 -> СПД-1245).
 */
export function canonicalCode(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = String(raw).replace(/\.\d{1,4}$/i, '');
  return stripped.toUpperCase();
}

/**
 * Сканирование папки и построение словаря код -> путь.
 * fileFilter — отфильтровать нужные файлы (например, только PDF).
 * extractCode — функция извлечения кода из имени/пути.
 */
export async function buildDict(
  root: string,
  recursive: boolean,
  fileFilter: (full: string, name: string) => boolean,
  extractCode: (nameOrPath: string) => string | null
): Promise<Record<string, string>> {
  const dict: Record<string, string> = {};

  async function scan(dir: string) {
    let items: fs.Dirent[];
    try {
      items = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const it of items) {
      const full = path.join(dir, it.name);

      if (it.isDirectory()) {
        if (/^отказы$/i.test(it.name)) {
          continue;
        }
        if (recursive) {
          await scan(full);
        }
        continue;
      }

      if (!it.isFile()) continue;
      if (!fileFilter(full, it.name)) continue;
      if (fileMarkedProcessed(it.name)) continue;

      const rawCode = extractCode(it.name);
      if (!rawCode) continue;

      const code = canonicalCode(rawCode);
      if (!code) continue;

      if (dict[code]) {
        try {
          const [s1, s2] = await Promise.all([fsp.stat(dict[code]), fsp.stat(full)]);
          if (s2.mtimeMs > s1.mtimeMs) dict[code] = full;
        } catch {
          // ignore
        }
        continue;
      }

      dict[code] = full;
    }
  }

  await scan(root);
  return dict;
}