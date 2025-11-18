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

/* DOM */
const navMode1 = document.getElementById('nav-mode1') as HTMLButtonElement | null;
const navMode2 = document.getElementById('nav-mode-compress') as HTMLButtonElement | null;
const navSettings = document.getElementById('nav-settings') as HTMLButtonElement | null;

const mode1Content = document.getElementById('mode1-content') as HTMLDivElement | null;
const mode2Content = document.getElementById('compress-content') as HTMLDivElement | null;
const settingsContent = document.getElementById('settings-content') as HTMLDivElement | null;

const btnMain = document.getElementById('btn-main') as HTMLButtonElement;
const btnInsert = document.getElementById('btn-insert') as HTMLButtonElement;
const btnOutput = document.getElementById('btn-output') as HTMLButtonElement;
const btnRun = document.getElementById('btn-run') as HTMLButtonElement;
const btnOpenOutput = document.getElementById('btn-open-output') as HTMLButtonElement;
const btnClearSettings = document.getElementById('btn-clear-settings') as HTMLButtonElement | null;

const labelMain = document.getElementById('label-main') as HTMLInputElement;
const labelInsert = document.getElementById('label-insert') as HTMLInputElement;
const labelOutput = document.getElementById('label-output') as HTMLInputElement;

const chkMainRecursive = document.getElementById('chk-main-recursive') as HTMLInputElement;
const chkInsertRecursive = document.getElementById('chk-insert-recursive') as HTMLInputElement;

const statsZepb = document.getElementById('stats-zepb') as HTMLSpanElement;
const statsNotif = document.getElementById('stats-notif') as HTMLSpanElement;
const statsOutput = document.getElementById('stats-output') as HTMLSpanElement;
const statsStatus = document.getElementById('stats-status') as HTMLSpanElement;
const statsResults = document.getElementById('stats-results') as HTMLDivElement;
const statsSuccess = document.getElementById('stats-success') as HTMLSpanElement;
const statsSkipped = document.getElementById('stats-skipped') as HTMLSpanElement;
const statsTotal = document.getElementById('stats-total') as HTMLSpanElement;

const logArea = document.getElementById('log') as HTMLTextAreaElement;

/* Settings controls */
const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox') as HTMLInputElement;
const btnCheckUpdate = document.getElementById('btn-check-update') as HTMLButtonElement;
const updateStatusSpan = document.getElementById('update-status') as HTMLSpanElement;
const btnUpdateApp = document.getElementById('btn-update-app') as HTMLButtonElement;
const settingCompressQuality = document.getElementById('setting-compress-quality') as HTMLSelectElement | null;
const settingThumbsEnabled   = document.getElementById('setting-thumbnails-enabled') as HTMLInputElement | null;
const settingThumbSize       = document.getElementById('setting-thumbnail-size') as HTMLSelectElement | null;

/* Feedback controls */
const feedbackTypeSelect = document.getElementById('feedback-type') as HTMLSelectElement;
const feedbackMessageTextarea = document.getElementById('feedback-message') as HTMLTextAreaElement;
const feedbackIncludeLogCheckbox = document.getElementById('feedback-include-log') as HTMLInputElement;
const btnSendFeedback = document.getElementById('btn-send-feedback') as HTMLButtonElement;
const feedbackStatusSpan = document.getElementById('feedback-status') as HTMLSpanElement;

/* Update notification elements */
const updateNotification = document.getElementById('update-notification') as HTMLDivElement;
const updateNotificationText = document.getElementById('update-notification-text') as HTMLParagraphElement;
const btnUpdatePopup = document.getElementById('btn-update-popup') as HTMLButtonElement;
const btnDismissPopup = document.getElementById('btn-dismiss-popup') as HTMLButtonElement;

/* Compress DOM (для синхронизации из настроек) */
const btnCompress = document.getElementById('btn-compress') as HTMLButtonElement | null;
const btnCompressRun = document.getElementById('btn-compress-run') as HTMLButtonElement | null;
const labelCompress = document.getElementById('label-compress') as HTMLInputElement | null;
const labelCompressOutput = document.getElementById('label-compress-output') as HTMLInputElement | null;

/* unmatched DOM (для очистки при сбросе настроек) */
const unmatchedBlock = document.getElementById('unmatched-block') as HTMLDivElement | null;
const unmatchedTableBody = document.querySelector('#unmatched-table tbody') as HTMLTableSectionElement | null;
const unmatchedCountBadge = document.getElementById('unmatched-count-badge') as HTMLSpanElement | null;
const unmatchedExportBtn = document.getElementById('unmatched-export') as HTMLButtonElement | null;
const unmatchedClearBtn = document.getElementById('unmatched-clear') as HTMLButtonElement | null;
const unmatchedEmpty = document.getElementById('unmatched-empty') as HTMLDivElement | null;

/* Лог через LogState */
const logState = new LogState({
  logArea,
  electronAPI,
});

const log = (message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') =>
  logState.log(message, level);

/* Spinner */
const spinnerController = createSpinnerController({
  getControls: () => [
    btnMain,
    btnInsert,
    btnOutput,
    btnRun,
    btnOpenOutput,
    btnClearSettings,
    btnCompress,
    btnCompressRun,
    btnSendFeedback,
    btnCheckUpdate,
    btnUpdateApp,
    document.getElementById('btn-open-log') as HTMLButtonElement | null,
  ],
});
const setBusy = (busy: boolean) => spinnerController.setBusy(busy);

/* SettingsState + MergeState + CompressState */
const settingsState = new SettingsState({
  electronAPI,
  onSettingsChanged: (s) => {
    // Папки
    labelMain.value = s.mainFolder || 'Не выбрана';
    labelMain.style.color = s.mainFolder ? '' : '#6b7280';

    labelInsert.value = s.insertFolder || 'Не выбрана';
    labelInsert.style.color = s.insertFolder ? '' : '#6b7280';

    labelOutput.value = s.outputFolder || 'Не выбрана';
    labelOutput.style.color = s.outputFolder ? '' : '#6b7280';

    // Рекурсия
    chkMainRecursive.checked = s.mainRecursive;
    chkInsertRecursive.checked = s.insertRecursive;

    // Compress
    if (labelCompress) {
      labelCompress.value = s.compressInputFolder || 'Не выбрана';
      labelCompress.style.color = s.compressInputFolder ? '' : '#6b7280';
    }
    if (labelCompressOutput) {
      labelCompressOutput.value = s.compressOutputFolder || 'Не выбрана';
      labelCompressOutput.style.color = s.compressOutputFolder ? '' : '#6b7280';
    }
    if (settingCompressQuality && s.compressQuality) {
      settingCompressQuality.value = String(s.compressQuality);
    }
    if (settingThumbsEnabled && typeof s.thumbnailsEnabled === 'boolean') {
      settingThumbsEnabled.checked = s.thumbnailsEnabled;
    }
    if (settingThumbSize && s.thumbnailSize) {
      settingThumbSize.value = String(s.thumbnailSize);
    }

    // Кнопка «Открыть папку результата»
    btnOpenOutput.disabled = !s.outputFolder;
  },
  onDictsChanged: (dicts) => {
    statsZepb.textContent = Object.keys(dicts.zepbDict).length.toString();
    statsNotif.textContent = Object.keys(dicts.insertDict).length.toString();
  },
});

const mergeState = new MergeState({ settingsState });
const compressState = new CompressState({ settingsState });

/* Очистка настроек (onConfirm для модалки) */
async function performClearSettingsAndUi() {
  await settingsState.clearAll();

  if (unmatchedTableBody) unmatchedTableBody.innerHTML = '';
  if (unmatchedBlock) unmatchedBlock.style.display = 'none';
  if (unmatchedCountBadge) unmatchedCountBadge.style.display = 'none';
  if (unmatchedExportBtn) unmatchedExportBtn.disabled = true;
  if (unmatchedClearBtn) unmatchedClearBtn.disabled = true;
  if (unmatchedEmpty) unmatchedEmpty.style.display = 'block';

  showPopup('Настройки очищены', 4000);
  log('Настройки очищены', 'warning');
}

/* Тема */
initTheme(themeToggleCheckbox, electronAPI);

/* DOMContentLoaded */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { try { ensurePdfJsWorker(); } catch {} }, 400);

  settingsState.load().catch(console.error);

  const layout = initLayout({
    navModeMerge: navMode1,
    navModeCompress: navMode2,
    navModeSettings: navSettings,
    contentMerge: mode1Content,
    contentCompress: mode2Content,
    contentSettings: settingsContent,
    compressControlsContainer: document.getElementById('compress-controls') as HTMLElement | null,
  });

  initConfirmClearModal({
    triggerButton: btnClearSettings,
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
    btnCheckUpdate,
    btnUpdateApp,
    updateStatusSpan,
    updateNotification,
    updateNotificationText,
    btnUpdatePopup,
    btnDismissPopup,
  });

  initFeedback({
    electronAPI,
    btnSendFeedback,
    feedbackTypeSelect,
    feedbackMessageTextarea,
    feedbackIncludeLogCheckbox,
    feedbackStatusSpan,
    logArea,
  });

  layout.showMode('merge');
});

})();