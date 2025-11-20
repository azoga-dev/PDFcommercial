# Утилиты (Utils)

## Обзор

Утилиты содержат вспомогательные функции и классы, которые используются по всему приложению PDFmanager. Они обеспечивают общие операции, не связанные с конкретной бизнес-логикой.

## Компоненты утилит

### Helpers
- **Назначение**: Вспомогательные функции общего назначения
- **Функции**:
  - Работа с путями файлов
  - Форматирование данных
  - Проверка условий
  - Преобразование типов
  - Работа с коллекциями

### Validators
- **Назначение**: Валидация данных
- **Функции**:
  - Проверка форматов файлов
  - Валидация настроек
  - Проверка пользовательского ввода
  - Валидация конфигурации
  - Проверка безопасности

### Formatters
- **Назначение**: Форматирование данных для отображения
- **Функции**:
  - Форматирование дат и времени
  - Форматирование размеров файлов
  - Форматирование чисел
  - Локализация данных
  - Форматирование текста

### Constants
- **Назначение**: Константы приложения
- **Функции**:
  - Определение типов файлов
  - Настройки по умолчанию
  - Коды ошибок
  - Конфигурационные значения
  - Пути к ресурсам

## Архитектурные решения

### Функциональный подход
Большинство утилит реализовано в виде чистых функций для обеспечения предсказуемости и тестируемости.

### Без состояния
Утилиты не имеют внутреннего состояния, что делает их безопасными для многопоточного использования.

### Обобщенные функции
Функции спроектированы для максимальной переиспользуемости с минимальными зависимостями.

### Типизация
Все утилиты полностью типизированы с использованием TypeScript.

## Использование

### Использование Helper функций
```typescript
import { 
  isValidPath, 
  formatFileSize, 
  debounce,
  deepClone 
} from '@utils/helpers';

// Проверка пути
if (isValidPath(userInput)) {
  console.log('Путь корректен');
}

// Форматирование размера файла
const formattedSize = formatFileSize(1024 * 1024 * 5); // "5.00 MB"

// Дебаунс функции
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

// Глубокое клонирование
const clonedObject = deepClone(originalObject);
```

### Использование Validators
```typescript
import { 
  validateSettings, 
  validatePDFFile,
  validateUserInput 
} from '@utils/validators';

// Валидация настроек
const validationResult = validateSettings(userSettings);
if (!validationResult.isValid) {
  console.error('Ошибки валидации:', validationResult.errors);
}

// Валидация PDF файла
const isPDFValid = validatePDFFile('document.pdf');

// Валидация пользовательского ввода
const isInputValid = validateUserInput(userInput, {
  minLength: 3,
  maxLength: 50,
  pattern: /^[a-zA-Z0-9_]+$/
});
```

### Использование Formatters
```typescript
import { 
  formatDate, 
  formatTime, 
  formatNumber 
} from '@utils/formatters';

// Форматирование даты
const formattedDate = formatDate(new Date(), 'DD.MM.YYYY'); // "20.11.2025"

// Форматирование времени
const formattedTime = formatTime(new Date(), 'HH:mm:ss'); // "14:30:25"

// Форматирование числа
const formattedNumber = formatNumber(1234.567, {
  decimalPlaces: 2,
  locale: 'ru-RU'
}); // "1 234,57"
```

## Лучшие практики

### Импорт только необходимого
Импортируйте только нужные функции, чтобы уменьшить размер бандла:

```typescript
// Хорошо
import { isValidPath } from '@utils/helpers';

// Избегайте
import * as helpers from '@utils/helpers';
```

### Тестирование утилит
Каждая утилита должна быть покрыта модульными тестами:

```typescript
import { formatFileSize } from '@utils/helpers';

describe('formatFileSize', () => {
  test('should format bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    expect(formatFileSize(0)).toBe('0 Bytes');
  });
});
```

### Документирование
Каждая функция должна быть документирована с использованием JSDoc:

```typescript
/**
 * Форматирует размер файла в человекочитаемый формат
 * @param bytes Размер в байтах
 * @param decimals Количество знаков после запятой (по умолчанию 2)
 * @returns Форматированная строка с размером
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  // реализация
}
```

## Безопасность

- Все утилиты проверяют входные данные на безопасность
- Предотвращение path traversal атак в работе с файлами
- Санитизация пользовательского ввода
- Ограничение на размер обрабатываемых данных