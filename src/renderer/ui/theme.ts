interface ElectronAPIForTheme {
  setTheme: (isDark: boolean) => void;
}

/**
 * Инициализация темы:
 * - читает сохранённую тему из localStorage;
 * - если не сохранена — берёт системную (prefers-color-scheme);
 * - применяет data-theme на <html>;
 * - синхронизирует с main через electronAPI.setTheme;
 * - вешает обработчик на чекбокс.
 */
export function initTheme(
  toggleCheckbox: HTMLInputElement,
  electronAPI: ElectronAPIForTheme
) {
  const THEME_KEY = 'theme';

  const applyTheme = (dark: boolean) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    try {
      electronAPI.setTheme(dark);
    } catch {
      // ignore
    }
  };

  const saved = localStorage.getItem(THEME_KEY);
  const dark =
    saved === 'dark' ||
    (saved === null &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  toggleCheckbox.checked = dark;
  applyTheme(dark);

  toggleCheckbox.addEventListener('change', (e) => {
    const isDark = (e.target as HTMLInputElement).checked;
    applyTheme(isDark);
  });
}