import { showPopup } from './popup';

interface ElectronAPIFeedback {
  openExternalUrl: (url: string) => Promise<boolean | void>;
}

interface FeedbackDeps {
  electronAPI: ElectronAPIFeedback;
  btnSendFeedback: HTMLButtonElement | null;
  feedbackTypeSelect: HTMLSelectElement | null;
  feedbackMessageTextarea: HTMLTextAreaElement | null;
  feedbackIncludeLogCheckbox: HTMLInputElement | null;
  feedbackStatusSpan: HTMLSpanElement | null;
  logArea: HTMLTextAreaElement | null;
}

/**
 * Инициализация формы обратной связи.
 * Логика: собирает тип, сообщение, при желании прикладывает лог и открывает форму/URL с предзаполненными данными.
 */
export function initFeedback({
  electronAPI,
  btnSendFeedback,
  feedbackTypeSelect,
  feedbackMessageTextarea,
  feedbackIncludeLogCheckbox,
  feedbackStatusSpan,
  logArea,
}: FeedbackDeps) {
  if (!btnSendFeedback || !feedbackTypeSelect || !feedbackMessageTextarea || !feedbackStatusSpan) return;

  const setStatus = (text: string, color: 'info' | 'error' | 'success' = 'info') => {
    feedbackStatusSpan.textContent = text;
    feedbackStatusSpan.classList.remove('text-red-500', 'text-green-500');
    if (color === 'error') feedbackStatusSpan.classList.add('text-red-500');
    if (color === 'success') feedbackStatusSpan.classList.add('text-green-500');
  };

  btnSendFeedback.addEventListener('click', async () => {
    const type = feedbackTypeSelect.value || 'general';
    const message = (feedbackMessageTextarea.value || '').trim();
    const includeLog = feedbackIncludeLogCheckbox?.checked ?? false;

    if (!message) {
      setStatus('Пожалуйста, опишите проблему или ваше предложение.', 'error');
      return;
    }

    btnSendFeedback.disabled = true;
    setStatus('Подготовка письма…', 'info');

    try {
      let body = `Тип: ${type}\n\nСообщение:\n${message}\n\n`;

      if (includeLog && logArea && logArea.value) {
        body += '\n--- Лог приложения ---\n';
        body += logArea.value.slice(-15000); // не отправляем бесконечный лог
      }

      const email = 'support@example.com'; // сюда подставь реальный адрес или URL формы
      const subject = encodeURIComponent('[PDF Мультитул] Обратная связь');
      const bodyEncoded = encodeURIComponent(body);

      const mailto = `mailto:${email}?subject=${subject}&body=${bodyEncoded}`;
      await electronAPI.openExternalUrl(mailto);

      setStatus('Открылось приложение почты. Вы можете отправить письмо.', 'success');
      showPopup('Открылось приложение почты с черновиком письма.', 8000);

      feedbackMessageTextarea.value = '';
      if (feedbackIncludeLogCheckbox) feedbackIncludeLogCheckbox.checked = false;
    } catch (err) {
      setStatus('Не удалось подготовить письмо.', 'error');
      showPopup('Ошибка при подготовке письма. Попробуйте скопировать текст вручную.', 10000);
    } finally {
      btnSendFeedback.disabled = false;
    }
  });
}