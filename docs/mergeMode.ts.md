# `src/renderer/modes/mergeMode.ts`

## Назначение

Реализация UI и логики режима объединения PDF (merge):

- выбор папок: ZEPB, уведомления, выходная;
- запуск объединения;
- прогрессбар, статистика;
- отображение несшитых (unmatched) файлов;
- открытие выходной папки и папки с реестром;
- обработка отмены.

## Что внутри

- Тип `ElectronAPIMerge` как `Pick<Window['electronAPI'], ...>` — только нужные методы IPC.
- `MergeSettingsSnapshot` — тип snapshot-а настроек, который приходит через `getSettings`.
- `initMergeMode(deps)`:
  - принимает `electronAPI`, `setBusy`, `log`, `getSettings`, `updateSettings`, `updateDicts`;
  - настраивает обработчики DOM:
    - кнопки выбора папок;
    - запуск/отмена;
    - открытие папок/реестра;
    - поиск/фильтр/экспорт unmatched;
  - подписывается на:
    - `onMergeProgress`;
    - `onMergeUnmatched` (если есть);
    - `onMergeComplete`.

## Как подключен

- Инициализируется из `index.ts`:

  ```ts
  initMergeMode({
    electronAPI,
    setBusy,
    log,
    getSettings: () => mergeState.getSnapshot(),
    updateSettings: (patch) => mergeState.update(patch, { save: true }),
    updateDicts: (dicts) => settingsState.updateDicts(dicts),
  });
  ```

- Настройки и словари не хранятся внутри `mergeMode` надолго, а проксируются через `MergeState`/`SettingsState`.