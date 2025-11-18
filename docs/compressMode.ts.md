# `src/renderer/modes/compressMode.ts`

## Назначение

Реализация UI и логики режима сжатия PDF:

- выбор входной/выходной папки;
- настройка качества сжатия;
- drag&drop отдельных файлов с превью (миниатюрами);
- прогресс/таблица результатов;
- запуск/отмена сжатия.

## Что внутри

- Тип `ElectronAPICompress` как `Pick<Window['electronAPI'], ...>` — только методы compress/FS.
- `CompressSettingsSnapshot` — snapshot настроек compress-регима.
- `initCompressMode(deps)`:
  - принимает `electronAPI`, `setBusy`, `log`, `getSettings`, `updateSettings`;
  - настраивает:
    - выбор входной/выходной папок;
    - drag&drop-зону (`#compress-drop-hint`);
    - таблицу результатов;
    - кнопку «Очистить настройки сжатия»;
    - кнопку «Сжать добавленные» (из DnD);
  - подписывается на:
    - `onCompressProgress`;
    - `onCompressComplete`.

## Как подключен

- Инициализируется из `index.ts`:

  ```ts
  initCompressMode({
    electronAPI,
    setBusy,
    log,
    getSettings: () => compressState.getSnapshot(),
    updateSettings: (patch) => compressState.update(patch, { save: true }),
  });
  ```

- Все настройки читаются только через `getSettings`, а изменения записываются через `updateSettings`, что держит состояние в `SettingsState`.