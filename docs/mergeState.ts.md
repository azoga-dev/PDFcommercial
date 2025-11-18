# `src/renderer/state/mergeState.ts`

## Назначение

Тонкая прослойка над `SettingsState` для настроек режима объединения (merge):

- `mainFolder`, `insertFolder`, `outputFolder`;
- `mainRecursive`, `insertRecursive`;
- `lastSelectedMainFolder`, `lastSelectedInsertFolder`, `lastSelectedOutputFolder`;
- `lastReportPath`.

## Что внутри

- `MergeSettingsSnapshot` — срез настроек, который нужен только merge-режиму.
- Класс `MergeState`:
  - `getSnapshot()` — собрать snapshot из `SettingsState.getSettings()`;
  - `update(patch, { save })` — маппить `MergeSettingsSnapshot` в `AppSettings` и вызывать `settingsState.updateSettings()` + `save()`.

## Как используется

- В `index.ts`:

  ```ts
  const mergeState = new MergeState({ settingsState });

  initMergeMode({
    electronAPI,
    setBusy,
    log,
    getSettings: () => mergeState.getSnapshot(),
    updateSettings: (patch) => mergeState.update(patch, { save: true }),
    updateDicts: (dicts) => settingsState.updateDicts(dicts),
  });
  ```

- В `mergeMode.ts`:
  - все текущие пути/флаги берутся через `getSettings()`;
  - любые изменения (`mainFolder`, `insertFolder`, `outputFolder`, `lastReportPath`, рекурсивные флаги) идут через `updateSettings`.