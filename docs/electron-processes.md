# Процессы Electron (Electron Processes)

## Обзор

Приложение PDFmanager использует архитектуру Electron с тремя основными процессами: Main, Renderer и Preload. Каждый процесс имеет свои обязанности и уровень доступа к системным ресурсам.

## Main процесс

### Назначение
- Управление жизненным циклом приложения
- Создание и управление окнами
- Обработка IPC вызовов
- Работа с файловой системой
- Обработка автообновлений

### Основные файлы
- `apps/main/main/main.ts` - точка входа Main процесса
- `apps/main/main/ipc/` - обработчики IPC вызовов
- `apps/main/main/services/` - сервисы Main процесса
- `apps/main/main/windows/` - управление окнами

### Пример структуры Main процесса
```typescript
// apps/main/main/main.ts
import { app, ipcMain } from 'electron';
import { createMainWindow } from './windows/mainWindow';
import { registerIPCHandlers } from './ipc/handlers';

app.whenReady().then(() => {
  const mainWindow = createMainWindow();
  
  // Регистрация IPC обработчиков
  registerIPCHandlers(mainWindow);
  
  // Дополнительная инициализация
  initializeApp();
});
```

### IPC обработчики
```typescript
// apps/main/main/ipc/pdf.ts
import { ipcMain } from 'electron';
import { PDFService } from '@services/pdf-service';

ipcMain.handle('pdf:merge', async (event, files, options) => {
  const pdfService = new PDFService();
  return await pdfService.mergePDFs(files, options);
});

ipcMain.handle('pdf:compress', async (event, file, options) => {
  const pdfService = new PDFService();
  return await pdfService.compressPDF(file, options);
});
```

## Renderer процесс

### Назначение
- Отображение пользовательского интерфейса
- Обработка пользовательских действий
- Взаимодействие с Main процессом через IPC
- Управление состоянием UI

### Основные файлы
- `apps/main/renderer/index.ts` - точка входа Renderer процесса
- `apps/main/renderer/app/` - контроллеры приложения
- `apps/main/renderer/modes/` - режимы работы (объединение, сжатие)
- `apps/main/renderer/state/` - управление состоянием
- `apps/main/renderer/ui/` - UI компоненты

### Пример структуры Renderer процесса
```typescript
// apps/main/renderer/index.ts
import { initApp } from './app/appController';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initApp();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
```

### Взаимодействие с Main процессом
```typescript
// apps/main/renderer/services/pdf-service.ts
export class PDFService {
  async mergePDFs(files: string[], options: any) {
    return await window.electronAPI.invoke('pdf:merge', files, options);
  }
  
  async compressPDF(file: string, options: any) {
    return await window.electronAPI.invoke('pdf:compress', file, options);
  }
}
```

## Preload скрипты

### Назначение
- Безопасное предоставление API из Main в Renderer
- Ограничение доступа к Node.js API
- Определение IPC интерфейса

### Основные файлы
- `apps/main/preload/index.ts` - основной preload скрипт

### Пример структуры Preload скрипта
```typescript
// apps/main/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

// Безопасный API для Renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => {
    // Список разрешенных каналов
    const validChannels = [
      'pdf:merge',
      'pdf:compress',
      'settings:get',
      'settings:update',
      'file:dialog'
    ];
    
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  
  send: (channel: string, ...args: any[]) => {
    const validChannels = [
      'log:append',
      'progress:update'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }
  },
  
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    const validChannels = [
      'update:available',
      'theme:changed'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }
  }
});
```

## Архитектурные решения

### Безопасность
- Renderer процесс не имеет прямого доступа к Node.js API
- Все IPC вызовы валидируются в Preload скриптах
- Ограничение на список разрешенных каналов

### Изоляция
- Main процесс изолирован от UI логики
- Renderer процесс изолирован от файловых операций
- Четкое разделение ответственности между процессами

### Производительность
- Асинхронные IPC вызовы для предотвращения блокировки UI
- Оптимизация передачи данных между процессами
- Использование потоков для тяжелых операций

## IPC коммуникации

### Типы взаимодействия
1. **Invoke/Handle** - запрос с ответом
2. **Send/On** - односторонняя отправка
3. **SendSync** - синхронный вызов (используется осторожно)

### Примеры IPC шаблонов
```typescript
// Асинхронный вызов с обработкой ошибок
try {
  const result = await window.electronAPI.invoke('pdf:merge', files, options);
  console.log('Merge completed:', result);
} catch (error) {
  console.error('Merge failed:', error);
}

// Подписка на события
window.electronAPI.on('progress:update', (event, progress) => {
  updateProgressBar(progress);
});
```

## Лучшие практики

### Обработка ошибок
- Все IPC вызовы должны обрабатывать ошибки
- Использование специфичных типов ошибок
- Логирование ошибок в обоих процессах

### Валидация данных
- Валидация входных данных в Main процессе
- Проверка типов и структуры данных
- Ограничение размера передаваемых данных

### Типизация
- Использование TypeScript для IPC интерфейсов
- Определение типов для каждого канала
- Проверка типов на этапе компиляции

## Безопасность

- Все пользовательские данные валидируются перед обработкой
- Ограничение на доступ к системным ресурсам
- Защита от path traversal атак
- Санитизация пользовательского ввода