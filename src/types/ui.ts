// Централизованные селекторы и типы для DOM-элементов главного окна.
//
// Идея:
// - Все getElementById для главного окна собраны здесь.
// - index.ts и другие модули не дергают document.getElementById напрямую,
//   а используют getMainUiRefs().
// Если какой-то id изменится в index.html — править нужно только здесь.

export interface NavUiRefs {
  navModeMerge: HTMLButtonElement | null;
  navModeCompress: HTMLButtonElement | null;
  navModeSettings: HTMLButtonElement | null;
}

export interface ContentUiRefs {
  modeMergeContent: HTMLDivElement | null;
  modeCompressContent: HTMLDivElement | null;
  settingsContent: HTMLDivElement | null;
}

export interface MergeUiRefs {
  btnMain: HTMLButtonElement;
  btnInsert: HTMLButtonElement;
  btnOutput: HTMLButtonElement;
  btnRun: HTMLButtonElement;
  btnOpenOutput: HTMLButtonElement;
  btnClearSettings: HTMLButtonElement | null;
  btnOpenReport: HTMLButtonElement | null;

  labelMain: HTMLInputElement;
  labelInsert: HTMLInputElement;
  labelOutput: HTMLInputElement;

  chkMainRecursive: HTMLInputElement;
  chkInsertRecursive: HTMLInputElement;

  statsZepb: HTMLSpanElement;
  statsNotif: HTMLSpanElement;
  statsOutput: HTMLSpanElement;
  statsStatus: HTMLSpanElement;
  statsResults: HTMLDivElement;
  statsSuccess: HTMLSpanElement;
  statsSkipped: HTMLSpanElement;
  statsTotal: HTMLSpanElement;
  progressBarFill: HTMLDivElement;

  unmatchedBlock: HTMLDivElement | null;
  unmatchedTableBody: HTMLTableSectionElement | null;
  unmatchedSearch: HTMLInputElement | null;
  unmatchedFilter: HTMLSelectElement | null;
  unmatchedExportBtn: HTMLButtonElement | null;
  unmatchedClearBtn: HTMLButtonElement | null;
  unmatchedCountBadge: HTMLSpanElement | null;
  unmatchedEmpty: HTMLDivElement | null;
}

export interface CompressUiRefs {
  btnCompress: HTMLButtonElement | null;
  btnCompressRun: HTMLButtonElement | null;
  btnCompressOutput: HTMLButtonElement | null;
  btnCompressClear: HTMLButtonElement | null;

  labelCompress: HTMLInputElement | null;
  labelCompressOutput: HTMLInputElement | null;

  selectCompressQuality: HTMLSelectElement | null;

  compressProgressFill: HTMLDivElement | null;
  compressProgressPercent: HTMLSpanElement | null;
  compressStatusLabel: HTMLSpanElement | null;
  compressTableBody: HTMLTableSectionElement | null;

  settingCompressQuality: HTMLSelectElement | null;
  settingThumbsEnabled: HTMLInputElement | null;
  settingThumbSize: HTMLSelectElement | null;

  cdZone: HTMLDivElement | null;
  cdCount: HTMLSpanElement | null;
  cdGallery: HTMLDivElement | null;
  cdBtnClear: HTMLButtonElement | null;
  cdBtnRun: HTMLButtonElement | null;

  compressControlsContainer: HTMLElement | null;
}

export interface SettingsUiRefs {
  themeToggleCheckbox: HTMLInputElement;
  btnCheckUpdate: HTMLButtonElement;
  updateStatusSpan: HTMLSpanElement;
  btnUpdateApp: HTMLButtonElement;

  settingCompressQuality: HTMLSelectElement | null;
  settingThumbsEnabled: HTMLInputElement | null;
  settingThumbSize: HTMLSelectElement | null;
}

export interface FeedbackUiRefs {
  feedbackTypeSelect: HTMLSelectElement;
  feedbackMessageTextarea: HTMLTextAreaElement;
  feedbackIncludeLogCheckbox: HTMLInputElement;
  btnSendFeedback: HTMLButtonElement;
  feedbackStatusSpan: HTMLSpanElement;
}

export interface UpdateNotificationUiRefs {
  updateNotification: HTMLDivElement;
  updateNotificationText: HTMLParagraphElement;
  btnUpdatePopup: HTMLButtonElement;
  btnDismissPopup: HTMLButtonElement;
}

export interface UnmatchedUiRefs {
  unmatchedBlock: HTMLDivElement | null;
  unmatchedTableBody: HTMLTableSectionElement | null;
  unmatchedCountBadge: HTMLSpanElement | null;
  unmatchedExportBtn: HTMLButtonElement | null;
  unmatchedClearBtn: HTMLButtonElement | null;
  unmatchedEmpty: HTMLDivElement | null;
}

export interface MainUiRefs {
  nav: NavUiRefs;
  content: ContentUiRefs;
  merge: MergeUiRefs;
  compress: CompressUiRefs;
  settings: SettingsUiRefs;
  feedback: FeedbackUiRefs;
  updates: UpdateNotificationUiRefs;
  unmatched: UnmatchedUiRefs;
  logArea: HTMLTextAreaElement | null;
}

/**
 * Хелпер: достать все основные DOM-элементы главного окна.
 * Если какой-то критичный элемент не найден — бросаем исключение.
 */
export function getMainUiRefs(): MainUiRefs {
  const navModeMerge = document.getElementById('nav-mode1') as HTMLButtonElement | null;
  const navModeCompress = document.getElementById('nav-mode-compress') as HTMLButtonElement | null;
  const navModeSettings = document.getElementById('nav-settings') as HTMLButtonElement | null;

  const modeMergeContent = document.getElementById('mode1-content') as HTMLDivElement | null;
  const modeCompressContent = document.getElementById('compress-content') as HTMLDivElement | null;
  const settingsContent = document.getElementById('settings-content') as HTMLDivElement | null;

  const btnMain = mustGet<HTMLButtonElement>('btn-main');
  const btnInsert = mustGet<HTMLButtonElement>('btn-insert');
  const btnOutput = mustGet<HTMLButtonElement>('btn-output');
  const btnRun = mustGet<HTMLButtonElement>('btn-run');
  const btnOpenOutput = mustGet<HTMLButtonElement>('btn-open-output');
  const btnClearSettings = document.getElementById('btn-clear-settings') as HTMLButtonElement | null;
  const btnOpenReport = document.getElementById('btn-open-report') as HTMLButtonElement | null;

  const labelMain = mustGet<HTMLInputElement>('label-main');
  const labelInsert = mustGet<HTMLInputElement>('label-insert');
  const labelOutput = mustGet<HTMLInputElement>('label-output');

  const chkMainRecursive = mustGet<HTMLInputElement>('chk-main-recursive');
  const chkInsertRecursive = mustGet<HTMLInputElement>('chk-insert-recursive');

  const statsZepb = mustGet<HTMLSpanElement>('stats-zepb');
  const statsNotif = mustGet<HTMLSpanElement>('stats-notif');
  const statsOutput = mustGet<HTMLSpanElement>('stats-output');
  const statsStatus = mustGet<HTMLSpanElement>('stats-status');
  const statsResults = mustGet<HTMLDivElement>('stats-results');
  const statsSuccess = mustGet<HTMLSpanElement>('stats-success');
  const statsSkipped = mustGet<HTMLSpanElement>('stats-skipped');
  const statsTotal = mustGet<HTMLSpanElement>('stats-total');
  const progressBarFill = mustGet<HTMLDivElement>('progress-bar-fill');

  const logArea = document.getElementById('log') as HTMLTextAreaElement | null;

  const themeToggleCheckbox = mustGet<HTMLInputElement>('theme-toggle-checkbox');
  const btnCheckUpdate = mustGet<HTMLButtonElement>('btn-check-update');
  const updateStatusSpan = mustGet<HTMLSpanElement>('update-status');
  const btnUpdateApp = mustGet<HTMLButtonElement>('btn-update-app');

  const settingCompressQuality = document.getElementById('setting-compress-quality') as HTMLSelectElement | null;
  const settingThumbsEnabled = document.getElementById('setting-thumbnails-enabled') as HTMLInputElement | null;
  const settingThumbSize = document.getElementById('setting-thumbnail-size') as HTMLSelectElement | null;

  const feedbackTypeSelect = mustGet<HTMLSelectElement>('feedback-type');
  const feedbackMessageTextarea = mustGet<HTMLTextAreaElement>('feedback-message');
  const feedbackIncludeLogCheckbox = mustGet<HTMLInputElement>('feedback-include-log');
  const btnSendFeedback = mustGet<HTMLButtonElement>('btn-send-feedback');
  const feedbackStatusSpan = mustGet<HTMLSpanElement>('feedback-status');

  const updateNotification = mustGet<HTMLDivElement>('update-notification');
  const updateNotificationText = mustGet<HTMLParagraphElement>('update-notification-text');
  const btnUpdatePopup = mustGet<HTMLButtonElement>('btn-update-popup');
  const btnDismissPopup = mustGet<HTMLButtonElement>('btn-dismiss-popup');

  const btnCompress = document.getElementById('btn-compress') as HTMLButtonElement | null;
  const btnCompressRun = document.getElementById('btn-compress-run') as HTMLButtonElement | null;
  const btnCompressOutput = document.getElementById('btn-compress-output') as HTMLButtonElement | null;
  const btnCompressClear = document.getElementById('btn-compress-clear') as HTMLButtonElement | null;

  const labelCompress = document.getElementById('label-compress') as HTMLInputElement | null;
  const labelCompressOutput = document.getElementById('label-compress-output') as HTMLInputElement | null;
  const compressControlsContainer = document.getElementById('compress-controls') as HTMLElement | null;

  const selectCompressQuality = document.getElementById('compress-quality') as HTMLSelectElement | null;
  const compressProgressFill = document.getElementById('compress-progress-fill') as HTMLDivElement | null;
  const compressProgressPercent = document.getElementById('compress-progress-percent') as HTMLSpanElement | null;
  const compressStatusLabel = document.getElementById('compress-status-label') as HTMLSpanElement | null;
  const compressTableBody = document.querySelector('#compress-table tbody') as HTMLTableSectionElement | null;

  const cdZone = document.getElementById('compress-drop-hint') as HTMLDivElement | null;
  const cdCount = document.getElementById('compress-drop-count') as HTMLSpanElement | null;
  const cdGallery = document.getElementById('compress-dd-gallery') as HTMLDivElement | null;
  const cdBtnClear = document.getElementById('compress-dd-clear') as HTMLButtonElement | null;
  const cdBtnRun = document.getElementById('compress-dd-run') as HTMLButtonElement | null;

  const unmatchedBlock = document.getElementById('unmatched-block') as HTMLDivElement | null;
  const unmatchedTableBody = document.querySelector('#unmatched-table tbody') as HTMLTableSectionElement | null;
  const unmatchedCountBadge = document.getElementById('unmatched-count-badge') as HTMLSpanElement | null;
  const unmatchedExportBtn = document.getElementById('unmatched-export') as HTMLButtonElement | null;
  const unmatchedClearBtn = document.getElementById('unmatched-clear') as HTMLButtonElement | null;
  const unmatchedEmpty = document.getElementById('unmatched-empty') as HTMLDivElement | null;

  // поля поиска/фильтра несшитых в merge‑режиме
  const unmatchedSearch = document.getElementById('unmatched-search') as HTMLInputElement | null;
  const unmatchedFilter = document.getElementById('unmatched-filter-type') as HTMLSelectElement | null;

  return {
    nav: {
      navModeMerge,
      navModeCompress,
      navModeSettings,
    },
    content: {
      modeMergeContent,
      modeCompressContent,
      settingsContent,
    },
    merge: {
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
      statsZepb,
      statsNotif,
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
    },
    compress: {
      btnCompress,
      btnCompressRun,
      btnCompressOutput,
      btnCompressClear,
      labelCompress,
      labelCompressOutput,
      selectCompressQuality,
      compressProgressFill,
      compressProgressPercent,
      compressStatusLabel,
      compressTableBody,
      settingCompressQuality,
      settingThumbsEnabled,
      settingThumbSize,
      cdZone,
      cdCount,
      cdGallery,
      cdBtnClear,
      cdBtnRun,
      compressControlsContainer,
    },
    settings: {
      themeToggleCheckbox,
      btnCheckUpdate,
      updateStatusSpan,
      btnUpdateApp,
      settingCompressQuality,
      settingThumbsEnabled,
      settingThumbSize,
    },
    feedback: {
      feedbackTypeSelect,
      feedbackMessageTextarea,
      feedbackIncludeLogCheckbox,
      btnSendFeedback,
      feedbackStatusSpan,
    },
    updates: {
      updateNotification,
      updateNotificationText,
      btnUpdatePopup,
      btnDismissPopup,
    },
    unmatched: {
      unmatchedBlock,
      unmatchedTableBody,
      unmatchedCountBadge,
      unmatchedExportBtn,
      unmatchedClearBtn,
      unmatchedEmpty,
    },
    logArea,
  };
}

/**
 * Хелпер: DOM-элементы окна логов (logWindow.html).
 */
export interface LogWindowUiRefs {
  logArea: HTMLDivElement;
  btnExport: HTMLButtonElement;
  btnClear: HTMLButtonElement;
  chkInfo: HTMLInputElement;
  chkWarning: HTMLInputElement;
  chkError: HTMLInputElement;
  search: HTMLInputElement;
}

/**
 * Получить ссылки на основные элементы окна логов.
 * Бросает ошибку, если что-то отсутствует в верстке.
 */
export function getLogWindowUiRefs(): LogWindowUiRefs {
  return {
    logArea: mustGet<HTMLDivElement>('log-area'),
    btnExport: mustGet<HTMLButtonElement>('btn-export'),
    btnClear: mustGet<HTMLButtonElement>('btn-clear'),
    chkInfo: mustGet<HTMLInputElement>('chk-info'),
    chkWarning: mustGet<HTMLInputElement>('chk-warning'),
    chkError: mustGet<HTMLInputElement>('chk-error'),
    search: mustGet<HTMLInputElement>('search'),
  };
}

/**
 * Хелпер: получить элемент по id и кинуть читаемую ошибку,
 * если в верстке он отсутствует.
 */
function mustGet<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`[ui.ts] Не найден элемент с id="${id}"`);
  }
  return el as T;
}