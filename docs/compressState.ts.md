# `src/renderer/state/compressState.ts`

## Назначение

Прослойка над `SettingsState` для настроек режима сжатия:

- `compressInputFolder`, `compressOutputFolder`;
- `lastSelectedCompress`, `lastSelectedCompressOutputFolder`;
- `compressQuality`;
- `thumbnailsEnabled`, `thumbnailSize`.

## Что внутри

- `CompressSettingsSnapshot` — срез настроек, нужный compress-режиму.
- Класс `CompressState`:
  - `getSnapshot()` — читает значения из `SettingsState.getSettings()`;
  - `update(patch, { save })` — обновляет соответствующие поля в `AppSettings` через `SettingsState`.

## Как используется

- В `index.ts`:

  ```ts
  const compressState = new CompressState({ settingsState });

  initCompressMode({
    electronAPI,
    setBusy,
    log,
    getSettings: () => compressState.getSnapshot(),
    updateSettings: (patch) => compressState.update(patch, { save: true }),
  });
  ```

- В `compressMode.ts`:
  - все значения настроек читаются через `getSettings()`;
  - изменения (путь входа/выхода, качество, превью) делаются через `updateSettings`.