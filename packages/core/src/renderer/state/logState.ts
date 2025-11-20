export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogStateDeps {
  logArea: HTMLTextAreaElement | null;
  electronAPI: Pick<Window['electronAPI'], 'appendLog'>;
}

/**
 * Сервис логирования: пишет в textarea и прокидывает в main (appendLog).
 */
export class LogState {
  private logArea: HTMLTextAreaElement | null;
  private electronAPI: LogStateDeps['electronAPI'];

  constructor({ logArea, electronAPI }: LogStateDeps) {
    this.logArea = logArea;
    this.electronAPI = electronAPI;
  }

  log(message: string, level: LogLevel = 'info') {
    const ts = new Date().toLocaleTimeString();
    const lvl = level === 'warning' ? 'WARN' : level === 'success' ? 'INFO' : level.toUpperCase();
    const line = `[${ts}] [${lvl}] ${message}`;

    if (this.logArea) {
      this.logArea.value += line + '\n';
      this.logArea.scrollTop = this.logArea.scrollHeight;
    }

    try {
      this.electronAPI.appendLog?.(line);
    } catch {
      // ignore
    }
  }
}