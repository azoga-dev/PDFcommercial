# `src/renderer/state/logState.ts`

## Назначение

Единая точка для логирования в renderer.

- Пишет строки в `textarea#log`.
- Автоматически скроллит лог вниз.
- Проксирует строки в `electronAPI.appendLog` для main-процесса.

## Что внутри

- Тип `LogLevel` (`'info' | 'success' | 'warning' | 'error'`).
- Класс `LogState`:
  - конструктор принимает `logArea` и `electronAPI.appendLog`;
  - метод `log(message, level)` формирует строку `[HH:MM:SS] [LEVEL] message` и:
    - добавляет её в textarea;
    - отправляет в main через `appendLog`.

## Как используется

- В `src/renderer/index.ts`:

  ```ts
  const logState = new LogState({
    logArea,
    electronAPI,
  });

  const log = (message: string, level: LogLevel = 'info') =>
    logState.log(message, level);
  ```

- В остальных модулях (`mergeMode`, `compressMode`, `updates`, `feedback` и т.п.) логирование идёт через этот `log(...)`, а не напрямую.