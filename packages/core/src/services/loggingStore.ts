/** Хранилище строк лога main-процесса. */
const logStore: string[] = [];

/** Добавить строку в лог. */
export function appendLog(line: string): void {
  logStore.push(line);
}

/** Получить весь лог одной строкой (для передачи в окно логов / экспорт). */
export function getLog(): string {
  return logStore.join('\n');
}

/** Получить копию массива строк. */
export function getLogLines(): string[] {
  return [...logStore];
}

/** Прямой доступ, если нужен массив (напр. для JSON.stringify в событиях). */
export function getLogStoreRef(): string[] {
  return logStore;
}