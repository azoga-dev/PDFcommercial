import * as path from 'path';
import { promises as fsp } from 'fs';
import fs from 'fs-extra';
import { extractNotificationCode, extractZepbCode } from './dictBuilder';

/**
 * Подсчитывает количество PDF-файлов в папке, подходящих под критерии ЗЭПБ
 */
export async function countZepbPdfFiles(folderPath: string, recursive: boolean): Promise<number> {
  let count = 0;

  async function scan(dir: string) {
    let items: fs.Dirent[];
    try {
      items = await fsp.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.warn(`countZepbPdfFiles: cannot read dir "${dir}": ${(err as Error).message}`);
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
      
      // Проверяем, что файл является PDF
      if (!it.name.toLowerCase().endsWith('.pdf')) continue;
      
      // Проверяем наличие признаков ЗЭПБ в имени файла
      const lowerName = it.name.toLowerCase();
      const hasZepbIndicator = /зэпб|зэсб|эпб|з\s*э\s*п\s*б|з[её]пб/i.test(lowerName);
      
      // Также проверяем, можно ли извлечь код ЗЭПБ из имени файла
      const code = extractZepbCode(it.name);
      if (hasZepbIndicator || (code !== null)) {
        count++;
      }
    }
  }

  await scan(folderPath);
  return count;
}

/**
 * Подсчитывает количество PDF-файлов в папке, подходящих под критерии уведомлений
 */
export async function countNotificationPdfFiles(folderPath: string, recursive: boolean): Promise<number> {
  let count = 0;

  async function scan(dir: string) {
    let items: fs.Dirent[];
    try {
      items = await fsp.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.warn(`countNotificationPdfFiles: cannot read dir "${dir}": ${(err as Error).message}`);
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
      
      // Проверяем, что файл является PDF
      if (!it.name.toLowerCase().endsWith('.pdf')) continue;
      
      // Исключаем файлы, которые являются ЗЭПБ (содержат признаки ЗЭПБ)
      const lowerName = it.name.toLowerCase();
      const hasZepbIndicator = /зэпб|зэсб|эпб|з\s*э\s*п\s*б|з[её]пб/i.test(lowerName);
      
      // Проверяем, можно ли извлечь код уведомления из имени файла
      const code = extractNotificationCode(it.name);
      if (!hasZepbIndicator && (code !== null)) {
        count++;
      }
    }
  }

  await scan(folderPath);
  return count;
}