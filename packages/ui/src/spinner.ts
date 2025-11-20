export interface SpinnerDeps {
  /** Кнопки/элементы, которые нужно блокировать при busy. */
  getControls: () => Array<HTMLButtonElement | null | undefined>;
}

/**
 * Создаёт spinner-overlay, если его ещё нет.
 */
function ensureSpinnerElement() {
  if (document.getElementById('spinner-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'spinner-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(255,255,255,0.6)';
  overlay.style.display = 'none';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
    <div style="width:40px;height:40px;border:4px solid #ccc;border-top-color:#111;border-radius:50%;animation:spin 1s linear infinite;"></div>
    <div id="busy-label">Выполняется...</div>
    <div style="height:8px"></div>
    <button id="btn-cancel-op" class="btn btn-primary">Отменить</button>
  </div>`;

  document.body.appendChild(overlay);

  const style = document.createElement('style');
  style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

/**
 * Возвращает объект с методом setBusy, который:
 * - блокирует/разблокирует контролы;
 * - включает/выключает overlay.
 * Кнопка "Отменить" остаётся в ведении вызывающего кода (mergeMode/compressMode).
 */
export function createSpinnerController(deps: SpinnerDeps) {
  ensureSpinnerElement();

  const setBusy = (busy: boolean) => {
    const controls = deps.getControls();
    controls.forEach((el) => {
      if (el) el.disabled = busy;
    });
    const overlay = document.getElementById('spinner-overlay') as HTMLDivElement | null;
    if (overlay) overlay.style.display = busy ? 'flex' : 'none';
  };

  return { setBusy };
}