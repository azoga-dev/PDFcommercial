// Скрипт окна логов (renderer для logWindow.html).
// Теперь окно логов использует такой же подход, как main-окно: централизованный
// доступ к DOM-элементам через getLogWindowUiRefs().

import { getLogWindowUiRefs } from '@pdfmanager/types/src/ui';

(() => {
  type ElectronAPILogWindow = Pick<
    Window['electronAPI'],
    'onLogContent' | 'onLogAppend' | 'onMergeComplete' | 'onSetTheme' | 'exportLog'
  >;

  const electronAPI = window.electronAPI as ElectronAPILogWindow;

  // Берём все DOM-ссылки централизованно
  const {
    logArea,
    btnExport,
    btnClear,
    chkInfo,
    chkWarning,
    chkError,
    search,
  } = getLogWindowUiRefs();

  const lines: string[] = [];

  function formatLineForDisplay(line: string): string {
    // Сейчас просто возвращаем как есть, но можно добавить подсветку.
    return line;
  }

  function detectLevel(line: string): 'info' | 'warn' | 'error' {
    const levelMatch = line.match(/\]\s*\[?([A-ZА-Яa-z]+)\]?/);
    let level = levelMatch ? levelMatch[1].toLowerCase() : 'info';
    if (level === 'warning') level = 'warn';
    if (level !== 'warn' && level !== 'error' && level !== 'info') level = 'info';
    return level as 'info' | 'warn' | 'error';
  }

  function applyFilterAndRender() {
    const showInfo = chkInfo.checked;
    const showWarn = chkWarning.checked;
    const showErr = chkError.checked;
    const q = (search.value || '').toLowerCase();

    const filtered = lines.filter((l) => {
      const level = detectLevel(l);
      if (level === 'info' && !showInfo) return false;
      if (level === 'warn' && !showWarn) return false;
      if (level === 'error' && !showErr) return false;
      if (q && !l.toLowerCase().includes(q)) return false;
      return true;
    });

    logArea.innerText = filtered.map(formatLineForDisplay).join('\n');
    logArea.scrollTop = logArea.scrollHeight;
  }

  function appendLine(line: string) {
    lines.push(line);

    const showInfo = chkInfo.checked;
    const showWarn = chkWarning.checked;
    const showErr = chkError.checked;
    const q = (search.value || '').toLowerCase();

    const level = detectLevel(line);
    const passesLevel =
      (level === 'info' && showInfo) ||
      (level === 'warn' && showWarn) ||
      (level === 'error' && showErr);
    const passesQuery = !q || line.toLowerCase().includes(q);

    if (passesLevel && passesQuery) {
      const prev = logArea.innerText;
      const formatted = formatLineForDisplay(line);
      logArea.innerText = prev ? prev + '\n' + formatted : formatted;
      logArea.scrollTop = logArea.scrollHeight;
    }
  }

  // --- IPC события ---

  electronAPI.onLogContent((_e, content: string) => {
    lines.length = 0;
    if (content) {
      const arr = content.split(/\r?\n/).filter(Boolean);
      arr.forEach((l) => lines.push(l));
    }
    applyFilterAndRender();
  });

  electronAPI.onLogAppend((_e, line: string) => {
    appendLine(line);
  });

  electronAPI.onMergeComplete((_e, summary: any) => {
    appendLine('\n=== Merge complete ===');
    appendLine(JSON.stringify(summary, null, 2));
    appendLine('======================\n');
  });

  electronAPI.onSetTheme((_e, isDark: boolean) => {
    try {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  });

  // --- UI обработчики ---

  chkInfo.addEventListener('change', applyFilterAndRender);
  chkWarning.addEventListener('change', applyFilterAndRender);
  chkError.addEventListener('change', applyFilterAndRender);
  search.addEventListener('input', applyFilterAndRender);

  btnExport.addEventListener('click', async () => {
    btnExport.disabled = true;
    try {
      const res = await electronAPI.exportLog();
      if (res && res.ok) {
        alert('Лог сохранён: ' + res.path);
      } else {
        alert('Ошибка при сохранении лога' + (res?.error ? ': ' + res.error : ''));
      }
    } finally {
      btnExport.disabled = false;
    }
  });

  btnClear.addEventListener('click', () => {
    logArea.innerText = '';
  });
})();