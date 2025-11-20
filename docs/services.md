# Сервисы приложения (Services)

## Обзор

Сервисы содержат бизнес-логику приложения PDFmanager. Каждый сервис отвечает за определенную функциональность и предоставляет четкий интерфейс для взаимодействия с этой функциональностью.

## Компоненты сервисов

### PDFService
- **Назначение**: Обработка PDF файлов
- **Функции**:
  - Чтение и запись PDF файлов
  - Объединение PDF документов
  - Сжатие PDF файлов
  - Извлечение метаданных
  - Генерация миниатюр

### FileService
- **Назначение**: Работа с файловой системой
- **Функции**:
  - Чтение и запись файлов
  - Управление директориями
  - Поиск файлов по критериям
  - Мониторинг изменений файлов
  - Управление правами доступа

### UpdateService
- **Назначение**: Обновления приложения
- **Функции**:
  - Проверка наличия обновлений
  - Загрузка обновлений
  - Установка обновлений
  - Уведомления о доступных обновлениях
  - Обработка ошибок обновления

### SettingsService
- **Назначение**: Управление настройками приложения
- **Функции**:
  - Загрузка и сохранение настроек
  - Валидация настроек
  - Управление профилями настроек
  - Синхронизация настроек между сессиями
  - Обработка изменений настроек

### RegistryService
- **Назначение**: Генерация реестров
- **Функции**:
  - Создание документов реестра
  - Форматирование данных реестра
  - Сохранение в форматах DOCX/XLSX
  - Валидация данных реестра
  - Управление шаблонами реестров

## Архитектурные решения

### Единая точка ответственности
Каждый сервис отвечает за одну конкретную функциональность, что упрощает поддержку и тестирование.

### Асинхронная обработка
Все операции в сервисах асинхронны, что предотвращает блокировку пользовательского интерфейса.

### Обработка ошибок
Каждый сервис имеет встроенную обработку ошибок с подробной информацией о проблемах.

### Типизация
Все методы сервисов строго типизированы с использованием TypeScript интерфейсов.

## Использование

### Использование PDFService
```typescript
import { PDFService } from '@services/pdf-service';

const pdfService = new PDFService();

// Объединение PDF файлов
const mergedPdf = await pdfService.mergePDFs([
  'file1.pdf',
  'file2.pdf'
]);

// Сжатие PDF файла
const compressedPdf = await pdfService.compressPDF('input.pdf', {
  quality: 'ebook'
});

// Генерация миниатюры
const thumbnail = await pdfService.generateThumbnail('document.pdf', {
  page: 1,
  scale: 0.5
});
```

### Использование FileService
```typescript
import { FileService } from '@services/file-service';

const fileService = new FileService();

// Чтение файлов из директории
const files = await fileService.readDirectory('/path/to/folder', {
  recursive: true,
  pattern: '*.pdf'
});

// Копирование файлов
await fileService.copyFiles([
  { from: 'source.pdf', to: 'destination.pdf' }
]);

// Мониторинг изменений
const watcher = fileService.watchDirectory('/path/to/watch', (changes) => {
  console.log('Directory changed:', changes);
});
```

### Использование SettingsService
```typescript
import { SettingsService } from '@services/settings-service';

const settingsService = new SettingsService();

// Загрузка настроек
const settings = await settingsService.load();

// Обновление настроек
await settingsService.update({
  theme: 'dark',
  language: 'ru',
  compressQuality: 2
});

// Сброс настроек
await settingsService.reset();
```

## Обработка ошибок

Каждый сервис выбрасывает специфические ошибки с подробной информацией:

```typescript
import { PDFServiceError } from '@services/pdf-service';

try {
  const result = await pdfService.mergePDFs(['file1.pdf', 'file2.pdf']);
} catch (error) {
  if (error instanceof PDFServiceError) {
    console.error('PDF service error:', error.message, error.code);
  }
}
```

## Тестирование

Сервисы тестируются с использованием моков и заглушек:
- Моки файловой системы для FileService
- Моки PDF обработчиков для PDFService
- Моки сетевых запросов для UpdateService
- Моки файлов настроек для SettingsService

## Безопасность

- Все файловые операции валидируются на безопасность путей
- Ограничения на размер обрабатываемых файлов
- Санитизация пользовательских данных
- Защита от path traversal атак