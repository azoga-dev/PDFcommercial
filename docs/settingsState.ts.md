# `src/renderer/state/settingsState.ts`

## Назначение

Централизованное хранилище настроек приложения на стороне renderer:

- пути папок (main/insert/output, compress input/output);
- флаги рекурсии;
- параметры сжатия (качество, превью, размер миниатюр);
- последнее местоположение реестра (`lastReportPath`);
- словари ЗЭПБ/уведомлений (`zepbDict`, `insertDict`).

Это «единый источник правды» для настроек и словарей.

## Что внутри

- Интерфейс `AppSettings` — структура всех поддерживаемых настроек.
- Тип `ElectronAPISettings` — подмножество `Window['electronAPI']`, нужное для load/save/buildDict/countFiles.
- Класс `SettingsState`:
  - хранит `settings`, `zepbDict`, `insertDict`;
  - `getSettings()`, `getDicts()` — читающие методы;
  - `updateSettings(patch)` — частичное обновление настроек + вызов `onSettingsChanged`;
  - `updateDicts(dicts)` — обновление словарей + вызов `onDictsChanged`;
  - `load()` — загрузка настроек из main, построение словарей;
  - `save()` — сохранение текущих настроек;
  - `clearAll()` — сброс настроек и словарей.

## Как используется

- Создаётся в `index.ts`:

  ```ts
  const settingsState = new SettingsState({
    electronAPI,
    onSettingsChanged: (s) => { /* синхронизация UI */ },
    onDictsChanged: (dicts) => { /* обновление statsZepb/statsNotif */ },
  });
  ```

- Используется через обёртки `MergeState` / `CompressState` для режимов:

  ```ts
  const mergeState = new MergeState({ settingsState });
  const compressState = new CompressState({ settingsState });
  ```

- Режимы (`mergeMode`, `compressMode`) не знают про `AppSettings`, работают только с `getSnapshot()/update()` соответствующего state.