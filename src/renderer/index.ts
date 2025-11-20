// Тонкий entry-point — только собирает UI-рефы, вызывает контроллер приложения
// и регистрирует модалку подтверждения (модалке передаём простую callback,
// которая не знает ничего о внутренностях приложения — она просто эмитит событие).
import { getMainUiRefs } from '@pdfmanager/types/src/ui';
import { initConfirmClearModal } from './ui/confirmClear';
import { eventBus } from './app/eventBus';
import { initApp } from './app/appController';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';

(window as any).pdfjsLib = pdfjsLib;

document.addEventListener('DOMContentLoaded', async () => {
  const ui = getMainUiRefs();

  // Инициализируем контроллер приложения (внутри он создаст состояния и режимы)
  try {
    // initApp возвращает API, но index.ts ничего про содержимое не знает
    await initApp(ui, (window as any).electronAPI);
  } catch (e) {
    console.error('initApp error', e);
  }

  // Регистрируем модалку очистки и передаём ей callback,
  // который НЕ выполняет очистку напрямую — он только эмитит событие.
  // Таким образом модалка остаётся UI-only, а обработка события делегирована контроллеру.
  initConfirmClearModal({
    triggerButton: ui.btnClearAllSettings,
    onConfirm: async () => {
      // Здесь нет логики очистки настроек, только публикация события.
      eventBus.emit('settings:clear:requested');
    },
  });
});