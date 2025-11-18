interface ConfirmClearDeps {
  /** Кнопка, по нажатию которой нужно показать модалку. */
  triggerButton: HTMLButtonElement | null;
  /** Функция, которую надо выполнить при подтверждении очистки. */
  onConfirm: () => Promise<void> | void;
}

/**
 * Инициализация модального окна подтверждения очистки настроек.
 * Создаёт DOM модалки и вешает обработчики на:
 * - кнопку "Очистить" (внутри модалки) -> вызывает onConfirm()
 * - кнопку "Отмена" / клик по backdrop / Escape -> просто закрывают модалку.
 */
export function initConfirmClearModal({ triggerButton, onConfirm }: ConfirmClearDeps) {
  if (!triggerButton) return;

  // Если старая версия модалки уже есть — убираем, чтобы не дублировать
  const existing = document.getElementById('confirm-clear-modal');
  if (existing) existing.remove();

  // Стили модалки (максимально локальные, с !important, чтобы не конфликтовать)
  const style = document.createElement('style');
  style.id = 'confirm-clear-modal-styles';
  style.textContent = `
  #confirm-clear-modal {
    position: fixed !important;
    inset: 0 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
  }
  #confirm-clear-modal.confirm-visible {
    display: flex !important;
  }
  #confirm-clear-modal .confirm-backdrop {
    position: absolute !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.55) !important;
    backdrop-filter: blur(2px) !important;
    -webkit-backdrop-filter: blur(2px) !important;
  }
  #confirm-clear-modal .confirm-panel {
    position: relative !important;
    z-index: 100000 !important;
    width: 560px !important;
    max-width: calc(100% - 40px) !important;
    background: var(--main-bg, #fff) !important;
    border-radius: 12px !important;
    border: 1px solid var(--sidebar-border, #e5e7eb) !important;
    padding: 16px 18px 14px !important;
    box-shadow: 0 20px 45px rgba(15,23,42,0.40) !important;
  }
  #confirm-clear-modal .confirm-header {
    font-weight:600;
    margin-bottom:6px;
    font-size:15px;
  }
  #confirm-clear-modal .confirm-body {
    font-size:13px;
    line-height:1.4;
    color:var(--text-color, #111827);
  }
  #confirm-clear-modal .confirm-actions {
    display:flex;
    gap:8px;
    justify-content:flex-end;
    margin-top:12px;
  }
  #confirm-clear-modal .btn {
    padding:8px 12px;
    border-radius:8px;
    cursor:pointer;
  }
  #confirm-clear-modal .btn.btn-outline {
    background: transparent;
    border:1px solid var(--sidebar-border, #e5e7eb);
    color:var(--text-color, #111827);
  }
  #confirm-clear-modal .btn.btn-primary {
    background:#ef4444;
    color:#fff;
    border:none;
  }
  #confirm-clear-modal .btn:focus {
    outline: 2px solid rgba(59,130,246,0.18);
    outline-offset: 2px;
  }
  `;
  document.head.appendChild(style);

  // DOM модалки
  const modal = document.createElement('div');
  modal.id = 'confirm-clear-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'confirm-backdrop';
  backdrop.tabIndex = -1;

  const panel = document.createElement('div');
  panel.className = 'confirm-panel';
  panel.setAttribute('role', 'document');
  panel.tabIndex = -1;

  const header = document.createElement('div');
  header.className = 'confirm-header';
  header.textContent = 'Подтвердите очистку настроек';

  const body = document.createElement('div');
  body.className = 'confirm-body';
  body.innerHTML = `Вы уверены, что хотите сбросить все настройки приложения? <br>
    Это действие удалит выбранные папки, параметры сжатия и очистит список несшитых файлов в интерфейсе.`;

  const actions = document.createElement('div');
  actions.className = 'confirm-actions';

  const btnNo = document.createElement('button');
  btnNo.type = 'button';
  btnNo.className = 'btn btn-outline';
  btnNo.id = 'confirm-clear-no';
  btnNo.textContent = 'Отмена';

  const btnYes = document.createElement('button');
  btnYes.type = 'button';
  btnYes.className = 'btn btn-primary';
  btnYes.id = 'confirm-clear-yes';
  btnYes.textContent = 'Очистить';

  actions.appendChild(btnNo);
  actions.appendChild(btnYes);

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(actions);

  modal.appendChild(backdrop);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  function openModal() {
    modal.classList.add('confirm-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    btnNo.focus();
  }

  function closeModal() {
    modal.classList.remove('confirm-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Обработчики модалки
  backdrop.addEventListener('click', () => closeModal());
  btnNo.addEventListener('click', () => closeModal());

  document.addEventListener('keydown', (ev) => {
    if (!modal.classList.contains('confirm-visible')) return;
    if (ev.key === 'Escape') closeModal();
  });

  btnYes.addEventListener('click', async () => {
    try {
      await onConfirm();
    } catch (e) {
      console.error('Error in confirm clear handler', e);
    } finally {
      closeModal();
    }
  });

  // Перехватываем кнопку "Очистить настройки"
  // Удаляем старые слушатели (если были) и вешаем новый
  const fresh = triggerButton.cloneNode(true) as HTMLButtonElement;
  triggerButton.parentElement?.replaceChild(fresh, triggerButton);
  fresh.addEventListener('click', (ev) => {
    ev.preventDefault();
    openModal();
  });
}