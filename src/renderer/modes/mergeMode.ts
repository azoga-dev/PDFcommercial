import { showPopup } from '../ui/popup';
import { initConfirmClearModal } from '../ui/confirmClear';
import type { MergeUiRefs } from '../../types/ui';

type ElectronAPIMerge = Pick<
  Window['electronAPI'],
  | 'selectFolder'
  | 'buildDict'
  | 'countFilesInFolder'
  | 'mergePDFs'
  | 'cancelMerge'
  | 'openFolder'
  | 'onMergeProgress'
  | 'onMergeUnmatched'
  | 'onMergeComplete'
>;

export interface MergeSettingsSnapshot {
  mainFolder: string;
  insertFolder: string;
  outputFolder: string;
  mainRecursive: boolean;
  insertRecursive: boolean;
  lastSelectedMainFolder: string | null;
  lastSelectedInsertFolder: string | null;
  lastSelectedOutputFolder: string | null;
  lastReportPath: string | null;
}

interface MergeModeDeps {
  electronAPI: ElectronAPIMerge;
  setBusy: (busy: boolean) => void;
  log: (msg: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
  getSettings: () => MergeSettingsSnapshot;
  updateSettings: (patch: Partial<MergeSettingsSnapshot>) => void;
  updateDicts?: (dicts: { zepbDict?: Record<string, string>; insertDict?: Record<string, string> }) => void;
  ui: MergeUiRefs;
}

interface UnmatchedItem {
  type: 'notif' | 'zepb';
  code: string;
  file: string;
  reason: string;
}

export function initMergeMode({
  electronAPI,
  setBusy,
  log,
  getSettings,
  updateSettings,
  updateDicts,
  ui,
}: MergeModeDeps) {
  const {
    btnMain,
    btnInsert,
    btnOutput,
    btnRun,
    btnOpenOutput,
    btnClearSettings,
    btnOpenReport,
    labelMain,
    labelInsert,
    labelOutput,
    chkMainRecursive,
    chkInsertRecursive,
    statsOutput,
    statsStatus,
    statsResults,
    statsSuccess,
    statsSkipped,
    statsTotal,
    progressBarFill,
    unmatchedBlock,
    unmatchedTableBody,
    unmatchedSearch,
    unmatchedFilter,
    unmatchedExportBtn,
    unmatchedClearBtn,
    unmatchedCountBadge,
    unmatchedEmpty,
  } = ui;

  // Локальное состояние только по unmatched
  let unmatchedItems: UnmatchedItem[] = [];

  // Инициализация UI из настроек
  const initFromSettings = () => {
    const s = getSettings();

    labelMain.value = s.mainFolder || 'Не выбрана';
    labelMain.style.color = s.mainFolder ? '' : '#6b7280';

    labelInsert.value = s.insertFolder || 'Не выбрана';
    labelInsert.style.color = s.insertFolder ? '' : '#6b7280';

    labelOutput.value = s.outputFolder || 'Не выбрана';
    labelOutput.style.color = s.outputFolder ? '' : '#6b7280';

    chkMainRecursive.checked = s.mainRecursive;
    chkInsertRecursive.checked = s.insertRecursive;

    if (btnOpenOutput) btnOpenOutput.disabled = !s.outputFolder;
  };

  initFromSettings();

  function updateFolderLabel(el: HTMLInputElement, folder: string | null) {
    el.value = folder || 'Не выбрана';
    el.style.color = folder ? '' : '#6b7280';
  }

  function updateStats() {
    const s = getSettings();
    if (s.outputFolder) {
      electronAPI
        .countFilesInFolder(s.outputFolder)
        .then((c) => (statsOutput.textContent = c.toString()))
        .catch(() => (statsOutput.textContent = '?'));
    } else {
      statsOutput.textContent = '0';
    }
  }

  function checkReady() {
    const s = getSettings();
    if (s.mainFolder && s.insertFolder && s.outputFolder) {
      btnRun.disabled = false;
      statsStatus.textContent = 'Готово к объединению';
      statsStatus.className = 'status-ready';
    } else {
      btnRun.disabled = true;
      statsStatus.textContent = 'Выберите все папки';
      statsStatus.className = 'status-not-ready';
    }
  }

  function renderUnmatched() {
    if (!unmatchedTableBody || !unmatchedBlock) return;
    unmatchedTableBody.innerHTML = '';
    const typeFilter = unmatchedFilter?.value || 'all';
    const term = (unmatchedSearch?.value || '').trim().toLowerCase();

    const filtered = unmatchedItems.filter((it) => {
      if (typeFilter !== 'all' && it.type !== typeFilter) return false;
      if (term) {
        const hay = `${it.code} ${it.file}`.toLowerCase();
        return hay.includes(term);
      }
      return true;
    });

    for (const it of filtered) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(0,0,0,0.04)';

      const tdType = document.createElement('td');
      tdType.textContent = it.type === 'notif' ? 'Увед.' : 'ЗЭПБ';
      tdType.style.padding = '8px 10px';
      tdType.style.width = '80px';
      tdType.style.fontWeight = '600';

      const tdCode = document.createElement('td');
      tdCode.textContent = it.code;
      tdCode.style.padding = '8px 10px';
      tdCode.style.width = '140px';

      const tdFile = document.createElement('td');
      tdFile.textContent = it.file;
      tdFile.style.padding = '8px 10px';
      tdFile.style.wordBreak = 'break-all';

      const tdReason = document.createElement('td');
      tdReason.textContent = it.reason;
      tdReason.style.padding = '8px 10px';
      tdReason.style.width = '160px';

      tr.appendChild(tdType);
      tr.appendChild(tdCode);
      tr.appendChild(tdFile);
      tr.appendChild(tdReason);
      unmatchedTableBody.appendChild(tr);
    }

    const total = unmatchedItems.length;
    if (unmatchedCountBadge) {
      unmatchedCountBadge.textContent = String(total);
      unmatchedCountBadge.style.display = total ? 'inline-block' : 'none';
    }
    if (unmatchedEmpty) unmatchedEmpty.style.display = total === 0 ? 'block' : 'none';
    if (unmatchedExportBtn) unmatchedExportBtn.disabled = total === 0;
    if (unmatchedClearBtn) unmatchedClearBtn.disabled = total === 0;
    unmatchedBlock.style.display = total === 0 ? 'none' : 'block';
  }

  unmatchedSearch?.addEventListener('input', renderUnmatched);
  unmatchedFilter?.addEventListener('change', renderUnmatched);
  unmatchedClearBtn?.addEventListener('click', () => {
    unmatchedItems = [];
    renderUnmatched();
    if (unmatchedBlock) unmatchedBlock.style.display = 'none';
  });

  unmatchedExportBtn?.addEventListener('click', () => {
    if (!unmatchedItems.length) return;
    const lines = unmatchedItems.map((it) => `${it.type};${it.code};${it.file};${it.reason}`);
    const content = ['type;code;file;reason', ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unmatched_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  electronAPI.onMergeUnmatched?.((_, payload: any) => {
    try {
      const { unmatchedNotifications = [], unmatchedZepb = [] } = payload || {};
      unmatchedItems = [];
      for (const n of unmatchedNotifications) {
        unmatchedItems.push({ type: 'notif', code: n.code, file: n.file, reason: 'Нет ЗЭПБ' });
      }
      for (const z of unmatchedZepb) {
        unmatchedItems.push({ type: 'zepb', code: z.code, file: z.file, reason: 'Нет уведомления' });
      }
      renderUnmatched();
    } catch (err) {
      console.error('onMergeUnmatched handler error', err);
    }
  });

  electronAPI.onMergeProgress((_, payload: any) => {
    const { processed, skipped, total, message } = payload;
    progressBarFill.style.width = total > 0 ? `${Math.round(((processed + skipped) / total) * 100)}%` : '0%';
    if (message) {
      if (message.includes('Объединено') || message.includes('Сшито')) log(message, 'success');
      else if (message.includes('Не найден') || message.includes('Пропущен')) log(message, 'warning');
      else if (message.includes('Ошибка')) log(message, 'error');
      else log(message, 'info');
    }
    statsSuccess.textContent = processed.toString();
    statsSkipped.textContent = skipped.toString();
    statsTotal.textContent = total.toString();
    statsResults.style.display = 'flex';
    updateStats();
  });

  electronAPI.onMergeComplete((_, payload: any) => {
    try {
      const { unmatchedNotifications = [], unmatchedZepb = [] } = payload || {};
      const map = new Map<string, UnmatchedItem>();
      for (const it of unmatchedItems) {
        map.set(`${it.type}:${it.code}:${it.file}`, it);
      }
      for (const n of unmatchedNotifications) {
        map.set(`notif:${n.code}:${n.file}`, { type: 'notif', code: n.code, file: n.file, reason: 'Нет ЗЭПБ' });
      }
      for (const z of unmatchedZepb) {
        map.set(`zepb:${z.code}:${z.file}`, { type: 'zepb', code: z.code, file: z.file, reason: 'Нет уведомления' });
      }
      unmatchedItems = Array.from(map.values());
      renderUnmatched();
    } catch (err) {
      console.error('onMergeComplete (unmatched) handler error', err);
    }
  });

  electronAPI.onMergeComplete((_, payload: any) => {
    try {
      const { processed, skipped, total, errors, log: logs, registry, canceled } = payload as any;

      log('\n=== Обработка завершена ===', 'info');
      log(`Успешно: ${processed}`, 'info');
      log(`Пропущено: ${skipped}`, 'info');
      log(`Всего: ${total}`, 'info');
      if (Array.isArray(logs)) {
        logs.forEach((m: string) =>
          log(m, m.includes('Ошибка') ? 'error' : m.includes('Объединено') ? 'success' : 'info'),
        );
      }

      if (registry) {
        updateSettings({ lastReportPath: registry });
        if (btnOpenReport) btnOpenReport.disabled = false;
        log(`Реестр сформирован: ${registry}`, 'info');
      }

      if (canceled) {
        log('Операция была отменена пользователем', 'warning');
        showPopup('Объединение отменено пользователем', 8000);
      } else if (errors && errors.length) {
        log(`Ошибки: ${errors.length}`, 'error');
        showPopup(`Объединение завершено с ошибками (${errors.length}). Проверьте лог.`, 12000);
      } else {
        showPopup('Объединение завершено успешно.', 8000);
      }

      statsSuccess.textContent = processed.toString();
      statsSkipped.textContent = skipped.toString();
      statsTotal.textContent = total.toString();
      statsResults.style.display = 'flex';
      updateStats();
    } catch (err) {
      console.error('onMergeComplete handler error', err);
    } finally {
      setBusy(false);
    }
  });

  const selectFolder = (last: string | null) => electronAPI.selectFolder(last ?? undefined);

  btnMain.addEventListener('click', async () => {
    const orig = btnMain.innerHTML;
    btnMain.innerHTML = '<i data-lucide="loader" class="loader"></i> Сканирование...';
    btnMain.disabled = true;
    try {
      const s0 = getSettings();
      const folder = await selectFolder(s0.lastSelectedMainFolder);
      if (folder) {
        updateFolderLabel(labelMain, folder);

        try {
          const dict = await electronAPI.buildDict('zepb', folder, chkMainRecursive.checked);
          updateDicts?.({ zepbDict: dict });
        } catch {
          updateDicts?.({ zepbDict: {} });
        }

        updateSettings({
          mainFolder: folder,
          lastSelectedMainFolder: folder,
          mainRecursive: chkMainRecursive.checked,
        });
      }
      updateStats();
      checkReady();
    } finally {
      btnMain.innerHTML = orig;
      btnMain.disabled = false;
    }
  });

  btnInsert.addEventListener('click', async () => {
    const orig = btnInsert.innerHTML;
    btnInsert.innerHTML = '<i data-lucide="loader" class="loader"></i> Сканирование...';
    btnInsert.disabled = true;
    try {
      const s0 = getSettings();
      const folder = await selectFolder(s0.lastSelectedInsertFolder);
      if (folder) {
        updateFolderLabel(labelInsert, folder);

        try {
          const dict = await electronAPI.buildDict('insert', folder, chkInsertRecursive.checked);
          updateDicts?.({ insertDict: dict });
        } catch {
          updateDicts?.({ insertDict: {} });
        }

        updateSettings({
          insertFolder: folder,
          lastSelectedInsertFolder: folder,
          insertRecursive: chkInsertRecursive.checked,
        });
      }
      updateStats();
      checkReady();
    } finally {
      btnInsert.innerHTML = orig;
      btnInsert.disabled = false;
    }
  });

  btnOutput.addEventListener('click', async () => {
    const s0 = getSettings();
    const folder = await selectFolder(s0.lastSelectedOutputFolder);
    if (folder) {
      updateFolderLabel(labelOutput, folder);
      if (btnOpenOutput) btnOpenOutput.disabled = false;
      updateStats();
      checkReady();

      updateSettings({
        outputFolder: folder,
        lastSelectedOutputFolder: folder,
      });
    }
  });

  if (btnOpenOutput) {
    btnOpenOutput.addEventListener('click', async () => {
      const s = getSettings();
      if (!s.outputFolder) {
        showPopup('Папка результатов не выбрана');
        return;
      }
      const ok = await electronAPI.openFolder(s.outputFolder);
      if (!ok) alert(`Не удалось открыть папку:\n${s.outputFolder}`);
    });
  }

  if (btnOpenReport) {
    btnOpenReport.addEventListener('click', async () => {
      const s = getSettings();
      if (!s.lastReportPath) {
        showPopup('Реестр ещё не сформирован');
        return;
      }
      const folder = s.lastReportPath.replace(/[/\\][^/\\]+$/, '');
      await electronAPI.openFolder(folder);
    });
  }

  btnRun.addEventListener('click', async () => {
    const s0 = getSettings();
    if (!s0.mainFolder || !s0.insertFolder || !s0.outputFolder) {
      log('Не все папки выбраны', 'error');
      return;
    }
    log('Начало объединения', 'info');
    setBusy(true);
    const logArea = document.getElementById('log') as HTMLTextAreaElement | null;
    if (logArea) logArea.value = '';
    try {
      const result = await electronAPI.mergePDFs({
        mainFolder: s0.mainFolder,
        insertFolder: s0.insertFolder,
        outputFolder: s0.outputFolder,
        recursiveMain: chkMainRecursive.checked,
        recursiveInsert: chkInsertRecursive.checked,
      });
      if (result && Array.isArray(result.log)) {
        result.log.forEach((m: string) =>
          log(m, m.includes('Ошибка') ? 'error' : m.includes('Объединено') ? 'success' : 'info'),
        );
      }
      statsSuccess.textContent = (result.processed || 0).toString();
      statsSkipped.textContent = (result.skipped || 0).toString();
      statsTotal.textContent = (result.total || 0).toString();
      statsResults.style.display = 'flex';
      updateStats();
    } catch (err) {
      log(`Ошибка выполнения: ${(err as Error).message}`, 'error');
      showPopup(`Ошибка: ${(err as Error).message}`, 10000);
    } finally {
      // setBusy(false) — в onMergeComplete
    }
  });

  const cancelBtn = document.getElementById('btn-cancel-op') as HTMLButtonElement | null;
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      btn.disabled = true;
      try {
        await electronAPI.cancelMerge();
        log('Запрошена отмена объединения', 'warning');
        showPopup('Запрос отмены объединения отправлен', 4000);
      } catch {
        showPopup('Ошибка отправки запроса отмены', 6000);
      } finally {
        setTimeout(() => {
          btn.disabled = false;
        }, 1500);
      }
    });
  }

  // Модалка очистки настроек merge — аналогично compressMode
  if (btnClearSettings) {
    initConfirmClearModal({
      triggerButton: btnClearSettings,
      async onConfirm() {
        // очистка unmatched
        unmatchedItems = [];
        if (unmatchedTableBody) unmatchedTableBody.innerHTML = '';
        if (unmatchedBlock) unmatchedBlock.style.display = 'none';
        if (unmatchedCountBadge) unmatchedCountBadge.style.display = 'none';
        if (unmatchedExportBtn) unmatchedExportBtn.disabled = true;
        if (unmatchedClearBtn) unmatchedClearBtn.disabled = true;
        if (unmatchedEmpty) unmatchedEmpty.style.display = 'block';

        // сброс UI
        labelMain.value = 'Не выбрана';
        labelMain.style.color = '#6b7280';
        labelInsert.value = 'Не выбрана';
        labelInsert.style.color = '#6b7280';
        labelOutput.value = 'Не выбрана';
        labelOutput.style.color = '#6b7280';

        chkMainRecursive.checked = true;
        chkInsertRecursive.checked = true;

        statsOutput.textContent = '0';
        statsSuccess.textContent = '0';
        statsSkipped.textContent = '0';
        statsTotal.textContent = '0';
        statsResults.style.display = 'none';
        statsStatus.textContent = 'Выберите все папки';
        statsStatus.className = 'status-not-ready';
        progressBarFill.style.width = '0%';

        // сброс настроек
        updateSettings({
          mainFolder: '',
          insertFolder: '',
          outputFolder: '',
          mainRecursive: true,
          insertRecursive: true,
          lastSelectedMainFolder: null,
          lastSelectedInsertFolder: null,
          lastSelectedOutputFolder: null,
          lastReportPath: null,
        });

        showPopup('Настройки сшивания очищены', 4000);
        log('Настройки сшивания очищены', 'warning');
        updateStats();
        checkReady();
      },
    });
  }

  updateStats();
  checkReady();
}