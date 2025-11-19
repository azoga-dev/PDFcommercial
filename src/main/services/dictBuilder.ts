import * as path from 'path';
import { promises as fsp } from 'fs';
import fs from 'fs-extra';

/** Префиксы кодов (ЗЭПБ/уведомления). */
export const PREFIXES = [
  "СК", "УА", "СППК", "СПД", "РВС", "ПУ", "П", "ГЗУ", "ПТП", "РВС", "ТТП", "НА", "ГЗУ",
];

/**
 * Регэксп для кода вида ПРЕФИКС-1234.56
 * Сделан более гибким:
 * - допускает разные типы тире/дефиса (-, – , — , − и т.п.)
 * - допускает пробелы вокруг тире
 * - нечувствителен к регистру
 */
const DASH_CLASS = `[-\\u002D\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212]?`; // разные дефисы/тире
export const CODE_REGEX = new RegExp(
  `(${PREFIXES.map((p) => p.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})\\s*${DASH_CLASS}\\s*\\d+(?:\\.\\d+)?`,
  'i',
);

/** Проверка, помечен ли файл как уже обработанный. */
export const fileMarkedProcessed = (name: string) =>
  /(\(.*?(с увед|с уведомл|with notification).*?\)|\bс увед\b|\bс уведомл\b|\bwith notification\b|\bобъединен\b|\bprocessed\b)/i.test(
    name,
  );

/** Вспомогательная функция — печать кодов символов для отладки. */
function codePointsOf(s: string, maxLen = 120) {
  const snippet = s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
  return Array.from(snippet).map((ch) => {
    const cp = ch.charCodeAt(0);
    return `${ch} (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`;
  }).join(' ');
}

/** Извлечь код уведомления из имени файла или папки. */
export const extractNotificationCode = (fullPath: string): string | null => {
  const filename = path.basename(fullPath);
  const foldername = path.basename(path.dirname(fullPath));
  const m = filename.match(CODE_REGEX);
  if (m) return m[0].toUpperCase();
  const folderPrefix = PREFIXES.find((p) => foldername.toUpperCase().includes(p));
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
 *
 * Добавлено расширенное логирование случаев, когда код не удалось извлечь,
 * включая отображение кодов символов — это поможет понять, есть ли в имени
 * "мягкие" символы, иной дефис или латинская буква вместо кириллической.
 */
export async function buildDict(
  root: string,
  recursive: boolean,
  fileFilter: (full: string, name: string) => boolean,
  extractCode: (nameOrPath: string) => string | null,
): Promise<Record<string, string>> {
  const dict: Record<string, string> = {};

  async function scan(dir: string) {
    let items: fs.Dirent[];
    try {
      items = await fsp.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.warn(`dictBuilder: cannot read dir "${dir}": ${(err as Error).message}`);
      return;
    }

    for (const it of items) {
      const full = path.join(dir, it.name);

      if (it.isDirectory()) {
        if (/^отказы$/i.test(it.name)) {
          // пропускаем специфическую папку "отказы"
          continue;
        }
        if (recursive) {
          await scan(full);
        }
        continue;
      }

      if (!it.isFile()) continue;
      if (!fileFilter(full, it.name)) continue;

      // если файл помечен как уже обработанный — пропускаем и логируем
      if (fileMarkedProcessed(it.name)) {
        console.warn(`dictBuilder: skip processed "${it.name}" in "${dir}"`);
        continue;
      }

      const rawCode = extractCode(it.name);
      if (!rawCode) {
        // файл подошёл по фильтру (pdf и пр.), но код не извлечён — логируем подробно
        console.warn(
          `dictBuilder: no code extracted for "${it.name}" in "${dir}". ` +
            `Name codepoints: ${codePointsOf(it.name)}`
        );
        continue;
      }

      const code = canonicalCode(rawCode);
      if (!code) {
        console.warn(`dictBuilder: canonicalization failed for "${rawCode}" -> "${it.name}"`);
        continue;
      }

      if (dict[code]) {
        try {
          const [s1, s2] = await Promise.all([fsp.stat(dict[code]), fsp.stat(full)]);
          if (s2.mtimeMs > s1.mtimeMs) dict[code] = full;
        } catch {
          // ignore file stat errors
        }
        continue;
      }

      dict[code] = full;
    }
  }

  await scan(root);
  return dict;
}