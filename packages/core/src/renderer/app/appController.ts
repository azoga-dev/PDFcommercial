// Контроллер приложения: инициализирует состояния и режимы, подписывается на события EventBus.
// Комментарии — на русском, чтобы соответствовать стилю проекта.

import { eventBus } from './eventBus';
import { initTheme } from '../ui/theme';
import { createSpinnerController } from '../ui/spinner';
import { showPopup } from '../ui/popup';
import { initMergeMode } from '../modes/mergeMode';
import { initCompressMode } from '../modes/compressMode';
import { initUpdates } from '../ui/updates';
import { initFeedback } from '../ui/feedback';
import { initLayout } from '../ui/layout';
import { SettingsState } from '../state/settingsState';
import { MergeState } from '../state/mergeState';
import { CompressState } from '../state/compressState';
import { LogState } from '../state/logState';
import type { MainUiRefs } from '../../types/ui';

type ElectronAPI = Window['electronAPI'];

/**
 * Инициализация приложения (вся "организационная" логика).
 * index.ts остаётся компактным — он просто вызывает initApp.
 *
 * Публичные события, на которые подписываемся:
 * - 'settings:clear:requested' — пользователь подтвердил очистку через модалку.
 *
 * Важно: appController отвечает за последовательность действий при очистке:
 *  - вызывает методы SettingsState.clearAll / clearMergeOnly / clearCompressOnly
 *  - вызывает clearXXXUi у режимов (если предоставлены)
 *  - отображает уведомления пользователю
 */
export async function initApp(ui: MainUiRefs, electronAPI: ElectronAPI) {
  // Логирование
  const logState = new LogState({ logArea: ui.logArea, electronAPI });
  const log = (msg: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') =>
    logState.log(msg, level);

  // Spinner — общий контроллер блокировки контролов
  const spinnerController = createSpinnerController({
    getControls: () => [
      ui.merge.btnMain,
      ui.merge.btnInsert,
      ui.merge.btnOutput,
      ui.merge.btnRun,
      ui.merge.btnOpenOutput,
      ui.btnClearAllSettings,
      ui.compress.btnCompress,
      ui.compress.btnCompressRun,
      ui.feedback.btnSendFeedback,
      ui.settings.btnCheckUpdate,
      ui.settings.btnUpdateApp,
      document.getElementById('btn-open-log') as HTMLButtonElement | null,
    ],
  });
  const setBusy = (busy: boolean) => spinnerController.setBusy(busy);

  // SettingsState — единый источник правды для настроек и словарей
  const settingsState = new SettingsState({
    electronAPI,
    onSettingsChanged: (s) => {
      // Применяем настройки к UI (взаимодействие через MainUiRefs)
      try {
        ui.merge.labelMain.value = s.mainFolder || 'Не выбрана';
        ui.merge.labelMain.style.color = s.mainFolder ? '' : '#6b7280';

        ui.merge.labelInsert.value = s.insertFolder || 'Не выбрана';
        ui.merge.labelInsert.style.color = s.insertFolder ? '' : '#6b7280';

        ui.merge.labelOutput.value = s.outputFolder || 'Не выбрана';
        ui.merge.labelOutput.style.color = s.outputFolder ? '' : '#6b7280';

        ui.merge.chkMainRecursive.checked = s.mainRecursive;
        ui.merge.chkInsertRecursive.checked = s.insertRecursive;

        if (ui.compress.labelCompress) {
          ui.compress.labelCompress.value = s.compressInputFolder || 'Не выбрана';
          ui.compress.labelCompress.style.color = s.compressInputFolder ? '' : '#6b7280';
        }
        if (ui.compress.labelCompressOutput) {
          ui.compress.labelCompressOutput.value = s.compressOutputFolder || 'Не выбрана';
          ui.compress.labelCompressOutput.style.color = s.compressOutputFolder ? '' : '#6b7280';
        }

        if (ui.settings.settingCompressQuality && s.compressQuality !== undefined) {
          ui.settings.settingCompressQuality.value = String(s.compressQuality);
        }
        if (ui.settings.settingThumbsEnabled && typeof s.thumbnailsEnabled === 'boolean') {
          ui.settings.settingThumbsEnabled.checked = s.thumbnailsEnabled;
        }
        if (ui.settings.settingThumbSize && s.thumbnailSize) {
          ui.settings.settingThumbSize.value = String(s.thumbnailSize);
        }

        ui.merge.btnOpenOutput.disabled = !s.outputFolder;
      } catch (e) {
        console.warn('[appController] apply settings to UI failed', e);
      }
    },
    onDictsChanged: (dicts) => {
      try {
        ui.merge.statsZepb.textContent = Object.keys(dicts.zepbDict).length.toString();
        ui.merge.statsNotif.textContent = Object.keys(dicts.insertDict).length.toString();
      } catch (e) {
        console.warn('[appController] apply dicts to UI failed', e);
      }
    },
  });

  // Другие состояния-адаптеры
  const mergeState = new MergeState({ settingsState });
  const compressState = new CompressState({ settingsState });

  // Инициализация theme/layout
  initTheme(ui.settings.themeToggleCheckbox, electronAPI);
  const layout = initLayout({
    navModeMerge: ui.nav.navModeMerge,
    navModeCompress: ui.nav.navModeCompress,
    navModeSettings: ui.nav.navModeSettings,
    contentMerge: ui.content.modeMergeContent,
    contentCompress: ui.content.modeCompressContent,
    contentSettings: ui.content.settingsContent,
    compressControlsContainer: ui.compress.compressControlsContainer,
  });

  // Загружаем настройки и словари
  await settingsState.load().catch((e) => {
    console.error('[appController] settingsState.load failed', e);
  });

  // Инициализируем режимы — получаем их публичные API
  const mergeApi = initMergeMode({
    electronAPI,
    setBusy,
    log,
    getSettings: () => mergeState.getSnapshot(),
    updateSettings: (patch) => mergeState.update(patch, { save: true }),
    ui: ui.merge,
  });

  const compressApi = initCompressMode({
    electronAPI,
    setBusy,
    log,
    getSettings: () => compressState.getSnapshot(),
    updateSettings: (patch) => compressState.update(patch, { save: true }),
    ui: ui.compress,
  });

  // Если mergeApi эмитит dicts (onDicts) — перекидываем в settingsState
  if (mergeApi && typeof (mergeApi as any).onDicts === 'function') {
    try {
      (mergeApi as any).onDicts((dicts: any) => {
        try {
          settingsState.updateDicts(dicts);
        } catch (e) {
          console.error('[appController] settingsState.updateDicts failed', e);
        }
      });
    } catch (e) {
      console.warn('[appController] subscribe mergeApi.onDicts failed', e);
    }
  }

  // Инициализируем вспомогательные UI-модули
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

  // Подписка на событие очистки настроек, которое триггерит модалка (index.ts)
  eventBus.on('settings:clear:requested', async () => {
    // Блокируем кнопку и показываем спиннер при необходимости
    const triggerBtn = ui.btnClearAllSettings;
    if (triggerBtn) triggerBtn.disabled = true;
    setBusy(true);
    try {
      // В SettingsState уже есть метод clearAll — он обновит UI через onSettingsChanged и onDictsChanged
      await settingsState.clearAll();

      // Кроме того, сбросим UI режимов (локально) — если режимы предоставляют API
      try {
        mergeApi?.clearMergeUi?.();
      } catch (e) {
        console.warn('[appController] mergeApi.clearMergeUi failed', e);
      }
      try {
        compressApi?.clearCompressUi?.();
      } catch (e) {
        console.warn('[appController] compressApi.clearCompressUi failed', e);
      }

      // Пара визуальных гарантий
      try {
        ui.merge.statsZepb.textContent = '0';
        ui.merge.statsNotif.textContent = '0';
        ui.merge.statsOutput.textContent = '0';
        ui.merge.statsResults.style.display = 'none';
        ui.merge.progressBarFill.style.width = '0%';
      } catch {}

      showPopup('Настройки сброшены', 3000);
      log('Настройки сброшены пользователем', 'info');
    } catch (e) {
      console.error('[appController] error clearing settings', e);
      showPopup('Ошибка при сбросе настроек — см. консоль', 6000);
    } finally {
      setBusy(false);
      if (triggerBtn) triggerBtn.disabled = false;
    }
  });

  // Показать merge-режим по умолчанию
  layout.showMode('merge');

  // Возвращаем API контроллера (если нужно внешне управлять)
  return {
    settingsState,
    mergeApi,
    compressApi,
    eventBus,
  };
}