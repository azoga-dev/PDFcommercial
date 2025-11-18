# `src/renderer/ui/layout.ts`

## Назначение

Модуль отвечает за «каркас» интерфейса:

- Переключение между режимами (`merge` / `compress` / `settings`) по клику на навигацию.
- Управление видимостью соответствующих блоков контента.
- Автоматический пересчёт высоты блока с таблицей сжатия при изменении размера окна.

Цель — убрать логику layout'а из `index.ts`, оставив там только оркестрацию модулей.

---

## Что внутри

### `LayoutDeps`

Интерфейс зависимостей, которые должен передать вызывающий код:

```ts
export interface LayoutDeps {
  navModeMerge: HTMLButtonElement | null;     // кнопка "Объединение"
  navModeCompress: HTMLButtonElement | null;  // кнопка "Сжатие"
  navModeSettings: HTMLButtonElement | null;  // кнопка "Настройки"

  contentMerge: HTMLDivElement | null;        // контейнер режима merge
  contentCompress: HTMLDivElement | null;     // контейнер режима compress
  contentSettings: HTMLDivElement | null;     // контейнер режима settings

  compressControlsContainer?: HTMLElement | null; // обёртка контролов сжатия (может скрываться, когда режим не активен)
}
```

### `initLayout(deps)`

Главная функция модуля. Принимает `LayoutDeps` и:

1. Вешает обработчики на навигационные кнопки (`navModeMerge`, `navModeCompress`, `navModeSettings`).
2. Определяет функцию `showMode(modeId)`, которая:
   - скрывает все блоки контента;
   - показывает нужный блок (`merge` / `compress` / `settings`);
   - переключает CSS-класс `active` на соответствующей кнопке;
   - по необходимости скрывает/показывает `compressControlsContainer`, если он передан.
3. Определяет функцию `layoutCompressResize()`, которая:
   - находит `#compress-table-wrap` и подбирает ему высоту в зависимости от высоты окна;
   - подписывается на `window.resize`.

Возвращает объект:

```ts
return {
  showMode,
  layoutCompressResize,
};
```

что позволяет вызывать эти функции извне (например, выбрать стартовый режим).

---

## Как используется

### В `src/renderer/index.ts`

```ts
import { initLayout } from './ui/layout';

// ...

document.addEventListener('DOMContentLoaded', () => {
  // ...

  const layout = initLayout({
    navModeMerge: navMode1,
    navModeCompress: navMode2,
    navModeSettings: navSettings,
    contentMerge: mode1Content,
    contentCompress: mode2Content,
    contentSettings: settingsContent,
    compressControlsContainer: document.getElementById('compress-controls') as HTMLElement | null,
  });

  // ...

  layout.showMode('merge'); // стартовый режим
});
```

Теперь `index.ts`:

- не содержит прямой логики переключения вкладок;
- не занимается пересчётом высоты таблицы сжатия;
- просто передаёт ссылки на DOM-элементы в `initLayout` и вызывает `layout.showMode(...)` при старте.

---

## Связи с другими частями проекта

- **Потребитель:** `src/renderer/index.ts` — точка входа, которая передаёт DOM-ссылки и вызывает `initLayout`.
- **Независим от состояния:** `layout.ts` не знает о `SettingsState`, `MergeState` или `CompressState`, работает только с DOM.
- **Работает в паре с compressMode:** функция `layoutCompressResize()` синхронизируется с тем же контейнером `#compress-table-wrap`, который использует режим сжатия для отображения таблицы.

Если нужно изменить логику навигации или адаптивного layout'а, достаточно поменять этот файл — код режимов (`mergeMode`, `compressMode`) и `index.ts` трогать не придётся.