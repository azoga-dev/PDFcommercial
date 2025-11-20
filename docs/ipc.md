# IPC коммуникации (Inter-Process Communication)

## Обзор

IPC (Inter-Process Communication) - это механизм взаимодействия между Main и Renderer процессами в Electron приложении PDFmanager. IPC обеспечивает безопасное выполнение операций, требующих доступа к системным ресурсам, из изолированного Renderer процесса.

## Архитектура IPC

### Основные принципы
- **Безопасность**: Renderer процесс не имеет прямого доступа к Node.js API
- **Изоляция**: Четкое разделение ответственности между процессами
- **Типизация**: Все каналы строго типизированы
- **Валидация**: Все данные валидируются перед обработкой

### Типы IPC взаимодействий

#### 1. Invoke/Handle (Запрос-Ответ)
- Используется для синхронных операций
- Renderer отправляет запрос, Main возвращает ответ
- Обработка ошибок через Promise

#### 2. Send/On (События)
- Используется для асинхронных уведомлений
- Main отправляет события в Renderer
- Renderer подписывается на события

#### 3. SendSync (Синхронный вызов)
- Используется редко из-за блокировки UI
- Блокирует выполнение до получения ответа

## Структура IPC

### Каналы
```
ipc/
├── main/
│   ├── channels/
│   │   ├── pdf.ts          # PDF операции
│   │   ├── settings.ts     # Настройки
│   │   ├── files.ts        # Файловые операции
│   │   ├── updates.ts      # Обновления
│   │   └── logging.ts      # Логирование
│   ├── validators/
│   │   ├── pdf-validator.ts
│   │   ├── settings-validator.ts
│   │   └── file-validator.ts
│   └── handlers/
│       ├── pdf-handler.ts
│       ├── settings-handler.ts
│       └── file-handler.ts
└── renderer/
    ├── api/
    │   ├── pdf-api.ts
    │   ├── settings-api.ts
    │   └── file-api.ts
    └── types/
        ├── ipc-types.ts
        └── validation-types.ts
```

## Основные IPC каналы

### PDF операции
- **Канал**: `pdf:merge`
- **Тип**: Invoke/Handle
- **Назначение**: Объединение PDF файлов
- **Параметры**: 
  ```typescript
  {
    files: string[],
    options: PDFMergeOptions
  }
  ```
- **Ответ**:
  ```typescript
  {
    success: boolean,
    resultFile?: string,
    error?: string
  }
  ```

### Сжатие PDF
- **Канал**: `pdf:compress`
- **Тип**: Invoke/Handle
- **Назначение**: Сжатие PDF файла
- **Параметры**:
  ```typescript
  {
    inputFile: string,
    outputFile: string,
    options: PDFCompressOptions
  }
  ```
- **Ответ**:
  ```typescript
  {
    success: boolean,
    sizeBefore?: number,
    sizeAfter?: number,
    error?: string
  }
  ```

### Управление настройками
- **Канал**: `settings:get`
- **Тип**: Invoke/Handle
- **Назначение**: Получение настроек
- **Ответ**:
  ```typescript
  {
    settings: AppSettings,
    error?: string
  }
  ```

- **Канал**: `settings:update`
- **Тип**: Invoke/Handle
- **Назначение**: Обновление настроек
- **Параметры**:
  ```typescript
  {
    settings: Partial<AppSettings>
  }
  ```
- **Ответ**:
  ```typescript
  {
    success: boolean,
    error?: string
  }
  ```

### Файловые диалоги
- **Канал**: `file:dialog:open`
- **Тип**: Invoke/Handle
- **Назначение**: Открытие диалога выбора файлов/папок
- **Параметры**:
  ```typescript
  {
    type: 'file' | 'directory' | 'files',
    title: string,
    filters?: FileFilter[],
    multiple?: boolean
  }
  ```
- **Ответ**:
  ```typescript
  {
    success: boolean,
    paths?: string[],
    error?: string
  }
  ```

### Прогресс-уведомления
- **Канал**: `progress:update`
- **Тип**: Send/On
- **Назначение**: Обновление прогресса операции
- **Данные**:
  ```typescript
  {
    operation: string,
    progress: number,
    message?: string
  }
  ```

## Реализация IPC

### Main процесс - Обработчики
```typescript
// ipc/main/handlers/pdf-handler.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PDFService } from '@services/pdf-service';
import { validateMergeParams } from '../validators/pdf-validator';

export class PDFHandler {
  static register() {
    ipcMain.handle('pdf:merge', async (event: IpcMainInvokeEvent, params: any) => {
      try {
        // Валидация параметров
        const validatedParams = validateMergeParams(params);
        
        // Выполнение операции
        const pdfService = new PDFService();
        const result = await pdfService.mergePDFs(validatedParams.files, validatedParams.options);
        
        return {
          success: true,
          resultFile: result
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });
    
    ipcMain.handle('pdf:compress', async (event: IpcMainInvokeEvent, params: any) => {
      try {
        // Валидация параметров
        const validatedParams = validateCompressParams(params);
        
        // Выполнение операции
        const pdfService = new PDFService();
        const result = await pdfService.compressPDF(
          validatedParams.inputFile,
          validatedParams.outputFile,
          validatedParams.options
        );
        
        return {
          success: true,
          sizeBefore: result.sizeBefore,
          sizeAfter: result.sizeAfter
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });
  }
}
```

### Renderer процесс - API
```typescript
// ipc/renderer/api/pdf-api.ts
export class PDFAPI {
  static async mergePDFs(files: string[], options: PDFMergeOptions) {
    return await window.electronAPI.invoke('pdf:merge', { files, options });
  }
  
  static async compressPDF(inputFile: string, outputFile: string, options: PDFCompressOptions) {
    return await window.electronAPI.invoke('pdf:compress', { 
      inputFile, 
      outputFile, 
      options 
    });
  }
  
  static onProgress(callback: (data: ProgressData) => void) {
    window.electronAPI.on('progress:update', (event, data) => {
      callback(data);
    });
  }
}
```

### Preload скрипт - Безопасный интерфейс
```typescript
// preload/ipc.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../types/ipc-types';

const validInvokeChannels = Object.values(IPC_CHANNELS.INVOKE);
const validSendChannels = Object.values(IPC_CHANNELS.SEND);
const validOnChannels = Object.values(IPC_CHANNELS.ON);

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid invoke channel: ${channel}`);
  },
  
  send: (channel: string, ...args: any[]) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Invalid send channel: ${channel}`);
    }
  },
  
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    if (validOnChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      throw new Error(`Invalid on channel: ${channel}`);
    }
  }
});
```

## Валидация данных

### Валидаторы
```typescript
// ipc/main/validators/pdf-validator.ts
import { PDFMergeParams, PDFCompressParams } from '../../types/pdf-types';

export function validateMergeParams(params: any): PDFMergeParams {
  if (!Array.isArray(params.files) || params.files.length === 0) {
    throw new Error('Files array is required and cannot be empty');
  }
  
  if (!params.files.every(file => typeof file === 'string' && file.endsWith('.pdf'))) {
    throw new Error('All files must be valid PDF file paths');
  }
  
  return {
    files: params.files,
    options: params.options || {}
  };
}

export function validateCompressParams(params: any): PDFCompressParams {
  if (typeof params.inputFile !== 'string' || !params.inputFile.endsWith('.pdf')) {
    throw new Error('Input file must be a valid PDF file path');
  }
  
  if (typeof params.outputFile !== 'string') {
    throw new Error('Output file path is required');
  }
  
  return {
    inputFile: params.inputFile,
    outputFile: params.outputFile,
    options: params.options || {}
  };
}
```

## Обработка ошибок

### Обработка в Main процессе
```typescript
// В обработчике IPC
try {
  // выполнение операции
  const result = await someOperation(params);
  return { success: true, data: result };
} catch (error) {
  console.error('IPC handler error:', error);
  return { 
    success: false, 
    error: (error as Error).message 
  };
}
```

### Обработка в Renderer процессе
```typescript
// В вызывающем коде
try {
  const result = await PDFAPI.mergePDFs(files, options);
  if (result.success) {
    console.log('Merge completed:', result.resultFile);
  } else {
    console.error('Merge failed:', result.error);
  }
} catch (error) {
  console.error('IPC call failed:', error);
}
```

## Безопасность

### Защита от нежелательного доступа
- Ограничение списка разрешенных каналов
- Валидация всех входных данных
- Проверка типов и структуры данных
- Ограничение размера передаваемых данных

### Защита от path traversal
```typescript
// Валидация путей файлов
function isValidPath(path: string): boolean {
  // Проверка на наличие '..' в пути
  if (path.includes('..')) {
    return false;
  }
  
  // Проверка на абсолютный путь в разрешенных директориях
  const normalizedPath = path.normalize();
  const allowedBasePath = app.getPath('documents');
  
  return normalizedPath.startsWith(allowedBasePath);
}
```

## Лучшие практики

### Организация каналов
- Группировка каналов по функциональности
- Использование префиксов для каналов (например, 'pdf:', 'settings:', 'file:')
- Единое место определения всех каналов

### Типизация
- Определение типов для каждого канала
- Использование TypeScript интерфейсов
- Проверка типов на этапе компиляции

### Мониторинг
- Логирование IPC вызовов
- Отслеживание производительности
- Мониторинг ошибок