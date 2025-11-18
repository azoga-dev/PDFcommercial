# `src/types/global.d.ts`

## Назначение

Файл описывает глобальные типы, в первую очередь интерфейс `window.electronAPI`, который пробрасывается из `preload.ts` в renderer.

Это источник правды для всех методов, доступных в renderer через `window.electronAPI`.

## Что внутри

- Расширение `interface Window`:
  - Полное описание `electronAPI` со всеми IPC-методами (merge, compress, настройки, лог, автообновления, тема).
  - Поле `pdfjsLib?: any` для pdf.js.

У каждого метода есть короткий комментарий, поясняющий:
- что делает метод;
- какие параметры принимает;
- что возвращает.

## Как используется

- В любом renderer-файле можно получить тип:

  ```ts
  type ElectronAPI = Window['electronAPI'];
  const electronAPI: ElectronAPI = window.electronAPI;
  ```

- В режимах и UI-модулях используются подтипы через `Pick<Window['electronAPI'], ...>`, чтобы брать только нужные методы:

  ```ts
  type ElectronAPICompress = Pick<
    Window['electronAPI'],
    'selectFolder' | 'compressPDFs' | 'compressFiles' | 'onCompressProgress' | 'onCompressComplete'
  >;
  ```

Это устраняет дублирование интерфейсов и сохраняет типы синхронизированными с preload/main.