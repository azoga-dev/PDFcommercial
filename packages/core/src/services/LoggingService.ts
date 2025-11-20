import { ILoggingService } from './interfaces';
import { loggingStore } from './loggingStore';

export class LoggingService implements ILoggingService {
  log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
        break;
    }
    
    this.appendLog(logMessage);
  }

  logInfo(message: string): void {
    this.log(message, 'info');
  }

  logWarn(message: string): void {
    this.log(message, 'warn');
  }

  logError(message: string): void {
    this.log(message, 'error');
  }

  logDebug(message: string): void {
    this.log(message, 'debug');
  }

  appendLog(message: string): void {
    loggingStore.appendLog(message);
  }
}