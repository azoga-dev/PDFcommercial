# Типы (Types)

## Обзор

Типы содержат определения TypeScript интерфейсов, типов и перечислений, используемых по всему приложению PDFmanager. Они обеспечивают строгую типизацию и улучшают качество кода.

## Категории типов

### Common Types
- **Назначение**: Общие типы, используемые во всем приложении
- **Содержит**:
  - Базовые интерфейсы
  - Общие перечисления
  - Утилитарные типы
  - Типы ошибок

### Settings Types
- **Назначение**: Типы, связанные с настройками приложения
- **Содержит**:
  - Интерфейсы настроек
  - Типы конфигурации
  - Валидационные схемы
  - Типы профилей

### UI Types
- **Назначение**: Типы, связанные с пользовательским интерфейсом
- **Содержит**:
  - Типы компонентов
  - Типы событий
  - Типы состояний
  - Типы представлений

### Service Types
- **Назначение**: Типы, связанные с сервисами
- **Содержит**:
  - Типы запросов и ответов
  - Типы параметров
  - Типы результатов
  - Типы конфигурации сервисов

### IPC Types
- **Назначение**: Типы, связанные с IPC коммуникациями
- **Содержит**:
  - Типы сообщений
  - Типы каналов
  - Типы ошибок
  - Типы валидации

## Архитектурные решения

### Единое определение
Каждый тип определяется в одном месте и импортируется везде, где используется.

### Структурная типизация
Типы спроектированы с использованием структурной типизации TypeScript для гибкости.

### Совместимость
Типы спроектированы для обеспечения совместимости между версиями приложения.

### Документация
Каждый тип документирован с использованием JSDoc комментариев.

## Использование

### Определение общих типов
```typescript
// types/common.ts
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export type Nullable<T> = T | null | undefined;
```

### Определение типов настроек
```typescript
// types/settings.ts
export interface AppSettings {
  theme: 'light' | 'dark';
  language: string;
  compressQuality: number;
  thumbnailsEnabled: boolean;
  thumbnailSize: number;
  mainFolder?: string;
  insertFolder?: string;
  outputFolder?: string;
  mainRecursive: boolean;
  insertRecursive: boolean;
  compressInputFolder?: string;
  compressOutputFolder?: string;
  lastReportPath?: string;
  lastSelectedMainFolder?: string;
  lastSelectedInsertFolder?: string;
  lastSelectedOutputFolder?: string;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### Определение типов UI
```typescript
// types/ui.ts
export interface ComponentProps {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  children?: HTMLElement[];
}

export interface ModalOptions {
  title: string;
  content: string | HTMLElement;
  buttons: ModalButton[];
  onClose?: () => void;
}

export interface ModalButton {
  text: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}
```

### Определение типов сервисов
```typescript
// types/services.ts
export interface PDFMergeOptions {
  quality?: 'screen' | 'ebook' | 'printer' | 'prepress';
  preserveMetadata?: boolean;
  flatten?: boolean;
}

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  sizeBefore?: number;
  sizeAfter?: number;
}

export interface ProgressCallback {
  (progress: number, message?: string): void;
}
```

### Определение типов IPC
```typescript
// types/ipc.ts
export interface IPCRequest {
  id: string;
  method: string;
  params: any;
}

export interface IPCResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export enum IPCChannels {
  SETTINGS_GET = 'settings:get',
  SETTINGS_UPDATE = 'settings:update',
  PDF_MERGE = 'pdf:merge',
  PDF_COMPRESS = 'pdf:compress',
  FILE_DIALOG = 'file:dialog',
  UPDATE_CHECK = 'update:check'
}
```

## Утилитарные типы

### Conditional Types
```typescript
// types/utils.ts
export type NonNullableProperties<T> = {
  [P in keyof T]: NonNullable<T[P]>
};

export type RequiredProperties<T> = {
  [P in keyof T]-?: T[P]
};

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

### Mapped Types
```typescript
// types/utils.ts
export type ReadOnly<T> = {
  readonly [P in keyof T]: T[P]
};

export type NullableFields<T> = {
  [P in keyof T]: T[P] | null
};
```

## Лучшие практики

### Использование интерфейсов
Предпочтительно использовать интерфейсы вместо типов для объектов:

```typescript
// Хорошо
export interface User {
  name: string;
  email: string;
}

// Избегайте для объектов
export type User = {
  name: string;
  email: string;
}
```

### Расширение интерфейсов
Используйте наследование интерфейсов для расширения функциональности:

```typescript
export interface BaseSettings {
  theme: 'light' | 'dark';
  language: string;
}

export interface AdvancedSettings extends BaseSettings {
  compressQuality: number;
  thumbnailsEnabled: boolean;
}
```

### Дженерики
Используйте дженерики для создания гибких типов:

```typescript
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

## Безопасность

- Все типы валидируют структуру данных на этапе компиляции
- Предотвращение передачи неправильных данных между компонентами
- Обеспечение согласованности API между процессами