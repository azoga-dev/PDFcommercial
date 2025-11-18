import { initTheme } from './ui/theme';
import { createSpinnerController } from './ui/spinner';
import { showPopup } from './ui/popup';
import { initConfirmClearModal } from './ui/confirmClear';
import { initMergeMode } from './modes/mergeMode';
import { initCompressMode } from './modes/compressMode';
import { initUpdates } from './ui/updates';
import { initFeedback } from './ui/feedback';
import { initLayout } from './ui/layout';
import { SettingsState } from './state/settingsState';
import { MergeState } from './state/mergeState';
import { CompressState } from './state/compressState';
import { LogState } from './state/logState';
import { getMainUiRefs } from '../types/ui';

type ElectronAPI = Window['electronAPI'];

(() => {
  function ensurePdfJsWorker() {
    try {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs && pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
        console.debug('[pdfjs] workerSrc set');
      }
    } catch (e) {
      console.warn('[pdfjs] init error', e);
    }
  }

  const electronAPI: ElectronAPI = window.electronAPI;

  document.addEventListener('DOMContentLoaded', () => {
    // Собираем все ссылки на DOM в одном месте
    const ui = getMainUiRefs();

    // Лог
    const logState = new LogState({
      logArea: ui.logArea,
      electronAPI,
    });
    const log = (message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') =>
      logState.log(message, level);

    // Spinner
    const spinnerController = createSpinnerController({
      getControls: () => [
        ui.merge.btnMain,
        ui.merge.btnInsert,
        ui.merge.btnOutput,
        ui.merge.btnRun,
        ui.merge.btnOpenOutput,
        ui.merge.btnClearSettings,
        ui.compress.btnCompress,
        ui.compress.btnCompressRun,
        ui.feedback.btnSendFeedback,
        ui.settings.btnCheckUpdate,
        ui.settings.btnUpdateApp,
        document.getElementById('btn-open-log') as HTMLButtonElement | null,
      ],
    });
    const setBusy = (busy: boolean) => spinnerController.setBusy(busy);

    // SettingsState + MergeState + CompressState
    const settingsState = new SettingsState({
      electronAPI,
      onSettingsChanged: (s) => {
        // Папки merge
        ui.merge.labelMain.value = s.mainFolder || 'Не выбрана';
        ui.merge.labelMain.style.color = s.mainFolder ? '' : '#6b7280';

        ui.merge.labelInsert.value = s.insertFolder || 'Не выбрана';
        ui.merge.labelInsert.style.color = s.insertFolder ? '' : '#6b7280';

        ui.merge.labelOutput.value = s.outputFolder || 'Не выбрана';
        ui.merge.labelOutput.style.color = s.outputFolder ? '' : '#6b7280';

        // Рекурсия
        ui.merge.chkMainRecursive.checked = s.mainRecursive;
        ui.merge.chkInsertRecursive.checked = s.insertRecursive;

        // Compress
        if (ui.compress.labelCompress) {
          ui.compress.labelCompress.value = s.compressInputFolder || 'Не выбрана';
          ui.compress.labelCompress.style.color = s.compressInputFolder ? '' : '#6b7280';
        }
        if (ui.compress.labelCompressOutput) {
          ui.compress.labelCompressOutput.value = s.compressOutputFolder || 'Не выбрана';
          ui.compress.labelCompressOutput.style.color = s.compressOutputFolder ? '' : '#6b7280';
        }
        if (ui.settings.settingCompressQuality && s.compressQuality) {
          ui.settings.settingCompressQuality.value = String(s.compressQuality);
        }
        if (ui.settings.settingThumbsEnabled && typeof s.thumbnailsEnabled === 'boolean') {
          ui.settings.settingThumbsEnabled.checked = s.thumbnailsEnabled;
        }
        if (ui.settings.settingThumbSize && s.thumbnailSize) {
          ui.settings.settingThumbSize.value = String(s.thumbnailSize);
        }

        // Кнопка «Открыть папку результата»
        ui.merge.btnOpenOutput.disabled = !s.outputFolder;
      },
      onDictsChanged: (dicts) => {
        ui.merge.statsZepb.textContent = Object.keys(dicts.zepbDict).length.toString();
        ui.merge.statsNotif.textContent = Object.keys(dicts.insertDict).length.toString();
      },
    });

    const mergeState = new MergeState({ settingsState });
    const compressState = new CompressState({ settingsState });

    async function performClearSettingsAndUi() {
      await settingsState.clearAll();

      if (ui.unmatched.unmatchedTableBody) ui.unmatched.unmatchedTableBody.innerHTML = '';
      if (ui.unmatched.unmatchedBlock) ui.unmatched.unmatchedBlock.style.display = 'none';
      if (ui.unmatched.unmatchedCountBadge) ui.unmatched.unmatchedCountBadge.style.display = 'none';
      if (ui.unmatched.unmatchedExportBtn) ui.unmatched.unmatchedExportBtn.disabled = true;
      if (ui.unmatched.unmatchedClearBtn) ui.unmatched.unmatchedClearBtn.disabled = true;
      if (ui.unmatched.unmatchedEmpty) ui.unmatched.unmatchedEmpty.style.display = 'block';

      showPopup('Настройки очищены', 4000);
      log('Настройки очищены', 'warning');
    }

    // Тема
    initTheme(ui.settings.themeToggleCheckbox, electronAPI);

    // Layout (переключение режимов + resize compress-таблицы)
    const layout = initLayout({
      navModeMerge: ui.nav.navModeMerge,
      navModeCompress: ui.nav.navModeCompress,
      navModeSettings: ui.nav.navModeSettings,
      contentMerge: ui.content.modeMergeContent,
      contentCompress: ui.content.modeCompressContent,
      contentSettings: ui.content.settingsContent,
      compressControlsContainer: ui.compress.compressControlsContainer,
    });

    // Остальная инициализация
    setTimeout(() => {
      try {
        ensurePdfJsWorker();
      } catch {}
    }, 400);

    settingsState.load().catch(console.error);

    initConfirmClearModal({
      triggerButton: ui.merge.btnClearSettings,
      onConfirm: performClearSettingsAndUi,
    });

    initMergeMode({
      electronAPI,
      setBusy,
      log,
      getSettings: () => mergeState.getSnapshot(),
      updateSettings: (patch) => {
        mergeState.update(patch, { save: true });
      },
      updateDicts: (dicts) => {
        settingsState.updateDicts(dicts);
      },
    });

    initCompressMode({
      electronAPI,
      setBusy,
      log,
      getSettings: () => compressState.getSnapshot(),
      updateSettings: (patch) => {
        compressState.update(patch, { save: true });
      },
    });

    initUpdates({
      electronAPI,
      btnCheckUpdate: ui.settings.btnCheckUpdate,
      btnUpdateApp: ui.settings.btnUpdateApp,
      updateStatusSpan: ui.settings.updateStatusSpan,
      updateNotification: ui.updates.updateNotification,
      updateNotificationText: ui.updates.updateNotificationText,
      btnUpdatePopup: ui.updates.btnUpdatePopup,
      btnDismissPopup: ui.updates.btnDismissPopup,
    });

    initFeedback({
      electronAPI,
      btnSendFeedback: ui.feedback.btnSendFeedback,
      feedbackTypeSelect: ui.feedback.feedbackTypeSelect,
      feedbackMessageTextarea: ui.feedback.feedbackMessageTextarea,
      feedbackIncludeLogCheckbox: ui.feedback.feedbackIncludeLogCheckbox,
      feedbackStatusSpan: ui.feedback.feedbackStatusSpan,
      logArea: ui.logArea,
    });

    layout.showMode('merge');
  });
})();