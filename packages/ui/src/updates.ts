import { showPopup } from './popup';

type ElectronAPIUpdates = Pick<
  Window['electronAPI'],
  | 'checkForUpdates'
  | 'downloadUpdate'
  | 'quitAndInstall'
  | 'onUpdateAvailable'
  | 'onUpdateNotAvailable'
  | 'onUpdateError'
  | 'onUpdateDownloadProgress'
  | 'onUpdateDownloaded'
>;

interface UpdatesDeps {
  electronAPI: ElectronAPIUpdates;
  btnCheckUpdate: HTMLButtonElement | null;
  btnUpdateApp: HTMLButtonElement | null;
  updateStatusSpan: HTMLSpanElement | null;
  updateNotification: HTMLDivElement | null;
  updateNotificationText: HTMLParagraphElement | null;
  btnUpdatePopup: HTMLButtonElement | null;
  btnDismissPopup: HTMLButtonElement | null;
}

/**
 * Инициализация логики автообновлений (UI + подписки на события autoUpdater).
 */
export function initUpdates({
  electronAPI,
  btnCheckUpdate,
  btnUpdateApp,
  updateStatusSpan,
  updateNotification,
  updateNotificationText,
  btnUpdatePopup,
  btnDismissPopup,
}: UpdatesDeps) {
  let latestVersion: string | null = null;
  let updateDownloaded = false;

  const setStatus = (text: string) => {
    if (updateStatusSpan) updateStatusSpan.textContent = text;
  };

  const showToast = (version: string) => {
    if (!updateNotification || !updateNotificationText) return;
    updateNotificationText.textContent = `Доступна новая версия: v${version}. Вы можете установить обновление.`;
    updateNotification.classList.remove('hidden');
  };

  const hideToast = () => {
    updateNotification?.classList.add('hidden');
  };

  // Кнопка "Проверить обновления"
  btnCheckUpdate?.addEventListener('click', async () => {
    btnCheckUpdate.disabled = true;
    setStatus('Проверка обновлений…');
    try {
      await electronAPI.checkForUpdates();
    } catch (err) {
      setStatus('Ошибка при проверке обновлений');
      showPopup('Ошибка при проверке обновлений. Подробности в логе.', 8000);
    } finally {
      btnCheckUpdate.disabled = false;
    }
  });

  // Кнопка "Обновить приложение" (в блоке настроек)
  btnUpdateApp?.addEventListener('click', async () => {
    if (!updateDownloaded) {
      // если ещё не скачано — запускаем downloadUpdate
      btnUpdateApp.disabled = true;
      setStatus('Загрузка обновления…');
      try {
        const ok = await electronAPI.downloadUpdate();
        if (!ok) {
          setStatus('Не удалось начать загрузку обновления');
          showPopup('Не удалось начать загрузку обновления.', 8000);
        }
      } catch (err) {
        setStatus('Ошибка загрузки обновления');
        showPopup('Ошибка загрузки обновления. Подробности в логе.', 8000);
      } finally {
        btnUpdateApp.disabled = false;
      }
    } else {
      // если уже скачано — запускаем quitAndInstall
      try {
        setStatus('Установка обновления…');
        await electronAPI.quitAndInstall();
      } catch (err) {
        setStatus('Ошибка установки обновления');
        showPopup('Ошибка установки обновления. Подробности в логе.', 8000);
      }
    }
  });

  // Кнопки toast'а
  btnUpdatePopup?.addEventListener('click', async () => {
    if (!updateDownloaded) {
      try {
        setStatus('Загрузка обновления…');
        const ok = await electronAPI.downloadUpdate();
        if (!ok) {
          setStatus('Не удалось начать загрузку обновления');
          showPopup('Не удалось начать загрузку обновления.', 8000);
        }
      } catch (err) {
        setStatus('Ошибка загрузки обновления');
        showPopup('Ошибка загрузки обновления. Подробности в логе.', 8000);
      }
    } else {
      try {
        setStatus('Установка обновления…');
        await electronAPI.quitAndInstall();
      } catch (err) {
        setStatus('Ошибка установки обновления');
        showPopup('Ошибка установки обновления. Подробности в логе.', 8000);
      }
    }
  });

  btnDismissPopup?.addEventListener('click', () => {
    hideToast();
  });

  // Подписки на события autoUpdater
  electronAPI.onUpdateAvailable((_e, version) => {
    latestVersion = version;
    updateDownloaded = false;
    setStatus(`Доступна новая версия: v${version}`);
    btnUpdateApp && (btnUpdateApp.disabled = false);
    showToast(version);
  });

  electronAPI.onUpdateNotAvailable(() => {
    setStatus('Установлена актуальная версия');
  });

  electronAPI.onUpdateError((_e, error) => {
    setStatus('Ошибка обновления');
    showPopup(`Ошибка обновления: ${error}`, 10000);
  });

  electronAPI.onUpdateDownloadProgress((_e, percent) => {
    const p = Math.round(percent);
    setStatus(`Загрузка обновления: ${p}%`);
  });

  electronAPI.onUpdateDownloaded((_e, version) => {
    latestVersion = version;
    updateDownloaded = true;
    setStatus(`Обновление скачано: v${version}. Нажмите "Обновить приложение".`);
    btnUpdateApp && (btnUpdateApp.disabled = false);
    showToast(version);
  });
}