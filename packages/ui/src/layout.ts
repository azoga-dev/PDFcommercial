// Управление общим layout интерфейса: переключение режимов и resize-компресс-блока.

export interface LayoutDeps {
  navModeMerge: HTMLButtonElement | null;
  navModeCompress: HTMLButtonElement | null;
  navModeSettings: HTMLButtonElement | null;
  contentMerge: HTMLDivElement | null;
  contentCompress: HTMLDivElement | null;
  contentSettings: HTMLDivElement | null;
  compressControlsContainer?: HTMLElement | null;
}

/**
 * Инициализация управления layout:
 * - showMode(modeId) переключает вкладки/контент.
 * - initLayoutResize() настраивает resize для блока с таблицей сжатия.
 */
export function initLayout({
  navModeMerge,
  navModeCompress,
  navModeSettings,
  contentMerge,
  contentCompress,
  contentSettings,
  compressControlsContainer,
}: LayoutDeps) {
  if (!contentMerge || !contentCompress || !contentSettings) {
    console.warn('[layout] Один из контейнеров режимов не найден');
  }

  function showMode(modeId: 'merge' | 'compress' | 'settings') {
    if (contentMerge) contentMerge.style.display = 'none';
    if (contentCompress) contentCompress.style.display = 'none';
    if (contentSettings) contentSettings.style.display = 'none';

    if (modeId === 'merge' && contentMerge) contentMerge.style.display = 'block';
    if (modeId === 'compress' && contentCompress) contentCompress.style.display = 'block';
    if (modeId === 'settings' && contentSettings) contentSettings.style.display = 'block';

    navModeMerge?.classList.toggle('active', modeId === 'merge');
    navModeCompress?.classList.toggle('active', modeId === 'compress');
    navModeSettings?.classList.toggle('active', modeId === 'settings');

    if (compressControlsContainer) {
      compressControlsContainer.style.display = modeId === 'compress' ? '' : 'none';
    }
  }

  function layoutCompressResize() {
    try {
      const wrap = document.getElementById('compress-table-wrap') as HTMLDivElement | null;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const bottomPadding = 24;
      const avail = Math.max(220, Math.floor(window.innerHeight - rect.top - bottomPadding));
      wrap.style.height = `${avail}px`;
      wrap.style.maxHeight = `${avail}px`;
    } catch (e) {
      console.error('[layout] layoutCompressResize error', e);
    }
  }

  // Навигация по вкладкам
  navModeMerge?.addEventListener('click', () => showMode('merge'));
  navModeCompress?.addEventListener('click', () => showMode('compress'));
  navModeSettings?.addEventListener('click', () => showMode('settings'));

  // Первоначальный resize + обработчик ресайза окна
  try {
    layoutCompressResize();
  } catch {}
  window.addEventListener('resize', () => {
    try {
      layoutCompressResize();
    } catch {}
  });

  return {
    showMode,
    layoutCompressResize,
  };
}