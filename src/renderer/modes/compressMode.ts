import { showPopup } from '../ui/popup';

interface ElectronAPICompress {
  selectFolder: (defaultPath?: string) => Promise<string | null>;
  countFilesInFolder: (folderPath: string) => Promise<number>;
  countPdfFilesInFolder: (folderPath: string) => Promise<number>;
  pathIsDirectory: (p: string) => Promise<boolean>;
  compressPDFs: (opts: { inputFolder: string; outputFolder: string; quality?: number }) => Promise<any>;
  compressFiles: (opts: { files: string[]; outputFolder: string; quality?: number }) => Promise<any>;
  cancelCompress: () => Promise<boolean>;
  readFileBuffer: (filePath: string) => Promise<{ ok: boolean; data?: number[]; error?: string }>;
  onCompressProgress: (cb: (event: any, payload: any) => void) => () => void;
  onCompressComplete: (cb: (event: any, payload: any) => void) => () => void;
}

export interface CompressSettingsSnapshot {
  compressInputFolder: string | null;
  compressOutputFolder: string | null;
  lastSelectedCompress: string | null;
  lastSelectedCompressOutputFolder: string | null;
  compressQuality?: number;
  thumbnailsEnabled?: boolean;
  thumbnailSize?: number;
}

interface CompressModeDeps {
  electronAPI: ElectronAPICompress;
  setBusy: (busy: boolean) => void;
  log: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void;

  /** Получить актуальный снимок compress-настроек. */
  getSettings: () => CompressSettingsSnapshot;

  /**
   * Обновление compress-настроек через SettingsState/CompressState.
   * В index.ts делегирует в compressState.update(patch, { save: true }).
   */
  updateSettings: (patch: Partial<CompressSettingsSnapshot>) => void;
}

interface CompressDroppedFile {
  path: string;
  name: string;
  type: string;
  thumb?: string;
  error?: string;
}

export function initCompressMode({ electronAPI, setBusy, log, getSettings, updateSettings }: CompressModeDeps) {
  // --- DOM элементы ---
  const btnCompress = document.getElementById('btn-compress') as HTMLButtonElement | null;
  const btnCompressOutput = document.getElementById('btn-compress-output') as HTMLButtonElement | null;
  const btnCompressRun = document.getElementById('btn-compress-run') as HTMLButtonElement | null;
  const btnCompressClear = document.getElementById('btn-compress-clear') as HTMLButtonElement | null;

  const labelCompress = document.getElementById('label-compress') as HTMLInputElement | null;
  const labelCompressOutput = document.getElementById('label-compress-output') as HTMLInputElement | null;
  const selectCompressQuality = document.getElementById('compress-quality') as HTMLSelectElement | null;

  const compressProgressFill = document.getElementById('compress-progress-fill') as HTMLDivElement | null;
  const compressProgressPercent = document.getElementById('compress-progress-percent') as HTMLSpanElement | null;
  const compressStatusLabel = document.getElementById('compress-status-label') as HTMLSpanElement | null;
  const compressTableBody = document.querySelector('#compress-table tbody') as HTMLTableSectionElement | null;

  const settingCompressQuality = document.getElementById('setting-compress-quality') as HTMLSelectElement | null;
  const settingThumbsEnabled = document.getElementById('setting-thumbnails-enabled') as HTMLInputElement | null;
  const settingThumbSize = document.getElementById('setting-thumbnail-size') as HTMLSelectElement | null;

  // Drag & Drop UI
  const cdZone = document.getElementById('compress-drop-hint') as HTMLDivElement | null;
  const cdCount = document.getElementById('compress-drop-count') as HTMLSpanElement | null;
  const cdGallery = document.getElementById('compress-dd-gallery') as HTMLDivElement | null;
  const cdBtnClear = document.getElementById('compress-dd-clear') as HTMLButtonElement | null;
  const cdBtnRun = document.getElementById('compress-dd-run') as HTMLButtonElement | null;

  // --- Локальное состояние только для UI ---
  let droppedFiles: string[] = [];
  let isCompressRunning = false;
  let cancelCompressRequested = false;
  let compressDropped: CompressDroppedFile[] = [];

  // --- Инициализация UI из настроек ---
  const applySettingsToUi = () => {
    const s = getSettings();

    if (labelCompress) {
      labelCompress.value = s.compressInputFolder || 'Не выбрана';
      labelCompress.style.color = s.compressInputFolder ? '' : '#6b7280';
    }
    if (labelCompressOutput) {
      labelCompressOutput.value = s.compressOutputFolder || 'Не выбрана';
      labelCompressOutput.style.color = s.compressOutputFolder ? '' : '#6b7280';
    }

    const q = s.compressQuality ?? 30;
    if (settingCompressQuality) {
      settingCompressQuality.value = String(q);
    } else if (selectCompressQuality) {
      selectCompressQuality.value = String(q);
    }

    if (settingThumbsEnabled && typeof s.thumbnailsEnabled === 'boolean') {
      settingThumbsEnabled.checked = s.thumbnailsEnabled;
    }
    if (settingThumbSize && s.thumbnailSize) {
      settingThumbSize.value = String(s.thumbnailSize);
    }
  };

  applySettingsToUi();

  // --- helpers ---

  function updateFolderLabel(el: HTMLInputElement | null, folder: string | null) {
    if (!el) return;
    el.value = folder || 'Не выбрана';
    el.style.color = folder ? '' : '#6b7280';
  }

  function getCompressQuality(): number {
    const src = settingCompressQuality || selectCompressQuality;
    const s = getSettings();
    const v = src ? parseInt(src.value, 10) : (s.compressQuality ?? 30);
    return Number.isFinite(v) ? v : 30;
  }

  function getThumbsEnabled(): boolean {
    if (settingThumbsEnabled) return !!settingThumbsEnabled.checked;
    const s = getSettings();
    return s.thumbnailsEnabled ?? true;
  }

  function getThumbSize(): number {
    const src = settingThumbSize;
    const s = getSettings();
    const v = src ? parseInt(src.value, 10) : (s.thumbnailSize ?? 128);
    return Number.isFinite(v) ? v : 128;
  }

  function setCompressStatus(state: 'idle' | 'running' | 'cancel' | 'done', text: string) {
    if (!compressStatusLabel) return;
    compressStatusLabel.removeAttribute('style');
    compressStatusLabel.classList.remove('status--idle', 'status--running', 'status--cancel', 'status--done');
    compressStatusLabel.classList.add(`status--${state}`);
    compressStatusLabel.textContent = text;
  }

  function clearCompressTable() {
    try {
      if (compressTableBody) compressTableBody.innerHTML = '';
      if (compressProgressFill) {
        compressProgressFill.style.width = '0%';
        compressProgressFill.classList.remove('is-cancel');
      }
      if (compressProgressPercent) compressProgressPercent.textContent = '0%';
      setCompressStatus('idle', 'Ожидание');
    } catch (e) {
      console.error('clearCompressTable error', e);
    }
  }

  function computePercent(inSize?: number, outSize?: number) {
    if (!inSize || !outSize) return '';
    const diff = inSize - outSize;
    const pct = Math.round((diff / inSize) * 100);
    return pct >= 0 ? `-${pct}%` : `+${-pct}%`;
  }

  function formatBytes(bytes?: number) {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }

  // --- Drag & Drop миниатюры ---

  async function buildPdfThumb(target: CompressDroppedFile): Promise<void> {
    const pdfjs = (window as any).pdfjsLib;
    if (!pdfjs) return;

    try {
      const resp = await electronAPI.readFileBuffer(target.path);
      if (!resp.ok || !resp.data || !resp.data.length) {
        target.error = resp.error || 'empty file';
        return;
      }

      const bytes = new Uint8Array(resp.data);
      const loadingTask = pdfjs.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        target.error = 'canvas context null';
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      target.thumb = canvas.toDataURL('image/png');
    } catch (e) {
      target.error = (e as Error).message;
    }
  }

  function updateCompressDnDState(): void {
    if (!cdGallery) return;
    cdGallery.innerHTML = '';
    if (compressDropped.length === 0) {
      cdGallery.classList.add('empty');
      if (cdCount) cdCount.style.display = 'none';
      if (cdBtnClear) cdBtnClear.disabled = true;
      if (cdBtnRun) cdBtnRun.disabled = true;
      updateCompressReady();
      return;
    }
    cdGallery.classList.remove('empty');
    if (cdCount) {
      cdCount.style.display = 'inline-block';
      cdCount.textContent = String(compressDropped.length);
    }
    if (cdBtnClear) cdBtnClear.disabled = false;
    if (cdBtnRun) cdBtnRun.disabled = false;

    const size = getThumbSize();
    const showThumbs = getThumbsEnabled();

    compressDropped.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'compress-dd-item';
      item.style.minHeight = size + 'px';

      const thumb = document.createElement('div');
      thumb.className = 'compress-dd-thumb';
      thumb.style.height = size + 'px';

      if (showThumbs) {
        if (file.thumb) {
          const img = document.createElement('img');
          img.src = file.thumb;
          img.alt = file.name;
          thumb.appendChild(img);
        } else {
          const span = document.createElement('span');
          span.style.fontSize = '11px';
          span.style.color = 'var(--text-muted,#666)';
          span.textContent = file.error
            ? 'Ошибка'
            : file.type === 'application/pdf'
            ? 'PDF'
            : 'Нет превью';
          thumb.appendChild(span);
        }
      } else {
        const span = document.createElement('span');
        span.style.fontSize = '11px';
        span.style.color = 'var(--text-muted,#666)';
        span.textContent = file.name;
        thumb.appendChild(span);
      }

      const meta = document.createElement('div');
      meta.className = 'compress-dd-meta';
      meta.textContent = file.name;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'compress-dd-remove';
      removeBtn.type = 'button';
      removeBtn.innerHTML = '×';
      removeBtn.title = 'Удалить';
      removeBtn.addEventListener('click', () => {
        compressDropped.splice(idx, 1);
        updateCompressDnDState();
      });

      item.appendChild(thumb);
      item.appendChild(meta);
      item.appendChild(removeBtn);
      cdGallery.appendChild(item);
    });

    updateCompressReady();
  }

  async function handleCompressDrop(list: FileList): Promise<void> {
    const newItems: CompressDroppedFile[] = [];
    for (const f of Array.from(list)) {
      const anyF: any = f;
      const fullPath: string | undefined = anyF.path;
      if (!fullPath) continue;
      const type = f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
      newItems.push({ path: fullPath, name: f.name, type });
    }

    compressDropped.push(...newItems);

    for (const it of newItems) {
      if (it.type === 'application/pdf') {
        await buildPdfThumb(it);
      }
    }
    updateCompressDnDState();
  }

  function initCompressDropzone(): void {
    if (!cdZone) return;

    cdZone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.pdf';
      input.addEventListener('change', () => {
        if (input.files && input.files.length) void handleCompressDrop(input.files);
      });
      input.click();
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      cdZone.addEventListener(evt, (e) => {
        e.preventDefault();
        cdZone.classList.add('dragover');
      });
    });
    ['dragleave', 'dragend'].forEach((evt) => {
      cdZone.addEventListener(evt, (e) => {
        e.preventDefault();
        cdZone.classList.remove('dragover');
      });
    });
    cdZone.addEventListener('drop', (e) => {
      e.preventDefault();
      cdZone.classList.remove('dragover');
      const files = e.dataTransfer?.files;
      if (files && files.length) void handleCompressDrop(files);
    });

    cdBtnClear?.addEventListener('click', () => {
      compressDropped = [];
      updateCompressDnDState();
    });

    settingThumbsEnabled?.addEventListener('change', () => {
      updateSettings({ thumbnailsEnabled: settingThumbsEnabled.checked });
      updateCompressDnDState();
    });
    settingThumbSize?.addEventListener('change', () => {
      const size = parseInt(settingThumbSize.value, 10);
      if (!isNaN(size)) updateSettings({ thumbnailSize: size });
      updateCompressDnDState();
    });

    updateCompressDnDState();
  }

  function updateCompressReady() {
    const hasInput =
      (labelCompress && labelCompress.value && labelCompress.value !== 'Не выбрана') ||
      (droppedFiles && droppedFiles.length > 0) ||
      (compressDropped && compressDropped.length > 0);

    const s = getSettings();
    const hasOutput = !!s.compressOutputFolder;

    if (btnCompressRun) btnCompressRun.disabled = !(hasInput && hasOutput);
    if (cdBtnRun) cdBtnRun.disabled = !(compressDropped && compressDropped.length > 0 && hasOutput);
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
      console.error('layoutCompressResize error', e);
    }
  }

  // --- обработчики кнопок выбора папок ---

  if (btnCompress) {
    btnCompress.addEventListener('click', async () => {
      const orig = btnCompress.innerHTML;
      btnCompress.innerHTML = '<i data-lucide="loader" class="loader"></i> Сканирование...';
      btnCompress.disabled = true;
      try {
        const s0 = getSettings();
        const folder = await electronAPI.selectFolder(
          s0.lastSelectedCompress ?? s0.compressInputFolder ?? undefined,
        );
        if (folder) {
          updateFolderLabel(labelCompress, folder);

          const s1 = getSettings();
          if (!s1.compressOutputFolder) {
            updateFolderLabel(labelCompressOutput, folder);
            updateSettings({
              compressOutputFolder: folder,
              lastSelectedCompressOutputFolder: folder,
            });
          }

          try {
            const pdfCount = await electronAPI.countPdfFilesInFolder(folder);
            if (typeof pdfCount === 'number' && pdfCount === 0) {
              log(`Выбранная папка ${folder} не содержит PDF`, 'warning');
              showPopup('В выбранной папке нет pdf файлов', 6000);
            }
          } catch (err) {
            log(`Ошибка проверки PDF в выбранной папке: ${(err as Error).message}`, 'error');
          }

          try {
            const cnt = await electronAPI.countFilesInFolder(folder);
            if (typeof cnt === 'number' && cnt === 0) {
              log(`Выбранная папка "${folder}" пуста`, 'warning');
              showPopup('В выбранной папке нет файлов PDF', 6000);
            } else {
              log(`В папке "${folder}" найдено ${typeof cnt === 'number' ? cnt : '?'} файлов`, 'info');
            }
          } catch (err) {
            log(`Ошибка проверки папки: ${(err as Error).message}`, 'error');
          }

          updateSettings({
            compressInputFolder: folder,
            lastSelectedCompress: folder,
          });
        }

        updateCompressReady();
      } finally {
        btnCompress.innerHTML = orig;
        btnCompress.disabled = false;
      }
    });
  }

  if (btnCompressOutput) {
    btnCompressOutput.addEventListener('click', async () => {
      const orig = btnCompressOutput.innerHTML;
      btnCompressOutput.innerHTML = '<i data-lucide="loader" class="loader"></i> Сканирование...';
      btnCompressOutput.disabled = true;
      try {
        const s0 = getSettings();
        const folder = await electronAPI.selectFolder(
          s0.lastSelectedCompressOutputFolder ?? s0.compressOutputFolder ?? undefined,
        );
        if (folder) {
          updateFolderLabel(labelCompressOutput, folder);

          updateSettings({
            compressOutputFolder: folder,
            lastSelectedCompressOutputFolder: folder,
          });

          try {
            const cntOut = await electronAPI.countFilesInFolder(folder).catch(() => -1);
            log(`Папка вывода для сжатия установлена: ${folder}`, 'info');
            if (typeof cntOut === 'number' && cntOut === 0) {
              showPopup('Папка вывода пуста (это нормально)', 4000);
            }
          } catch (err) {
            log(`Ошибка проверки папки вывода: ${(err as Error).message}`, 'error');
          }
        }
        updateCompressReady();
      } finally {
        btnCompressOutput.innerHTML = orig;
        btnCompressOutput.disabled = false;
      }
    });
  }

  // --- запуск сжатия основной кнопкой ---

  if (btnCompressRun) {
    btnCompressRun.addEventListener('click', async () => {
      const sStart = getSettings();

      if (!labelCompress || !labelCompress.value || !sStart.compressOutputFolder) {
        showPopup('Выберите входную и выходную папки для сжатия', 5000);
        return;
      }

      if (!sStart.compressOutputFolder) {
        const msg = 'Папка результатов не выбрана';
        log(msg, 'warning');
        showPopup('Выберите папку результатов (выход)', 6000);
        return;
      }

      if ((!droppedFiles || droppedFiles.length === 0) && labelCompress.value && labelCompress.value !== 'Не выбрана') {
        try {
          const pdfCount = await electronAPI.countPdfFilesInFolder(labelCompress.value);
          if (typeof pdfCount === 'number') {
            if (pdfCount === 0) {
              const msg = `В выбранной папке "${labelCompress.value}" нет PDF файлов`;
              log(msg, 'warning');
              showPopup('В выбранной папке нет pdf файлов', 6000);
              return;
            } else {
              log(`В папке входа найдено ${pdfCount} PDF файлов`, 'info');
            }
          } else {
            log(`Не удалось определить количество PDF в папке ${labelCompress.value}`, 'warning');
          }
        } catch (err) {
          log(`Ошибка проверки PDF в входной папке: ${(err as Error).message}`, 'error');
          showPopup('Ошибка при проверке папки входа. Проверьте лог.', 6000);
          return;
        }
      }

      const quality = getCompressQuality();
      updateSettings({ compressQuality: quality });

      const sForLog = getSettings();
      log(
        `Запущено сжатие: ${labelCompress.value} -> ${sForLog.compressOutputFolder}, качество ${quality}%`,
        'info',
      );

      isCompressRunning = true;
      setCompressStatus('running', 'Выполняется…');
      setBusy(true);
      try {
        clearCompressTable();

        if (droppedFiles && droppedFiles.length > 0) {
          const s = getSettings();
          const res = await electronAPI.compressFiles({
            files: droppedFiles,
            outputFolder: s.compressOutputFolder!,
            quality,
          });
          res.log?.forEach((m: string) => log(m, m.includes('Ошибка') ? 'error' : 'info'));
        } else {
          const s = getSettings();
          const res = await electronAPI.compressPDFs({
            inputFolder: labelCompress!.value,
            outputFolder: s.compressOutputFolder!,
            quality,
          });
          res.log?.forEach((m: string) => log(m, m.includes('Ошибка') ? 'error' : 'info'));
        }
      } catch (err) {
        log(`Ошибка при сжатии: ${(err as Error).message}`, 'error');
        showPopup('Ошибка при сжатии. Проверьте лог.', 8000);
      } finally {
        droppedFiles = [];
        const countEl = document.getElementById('compress-drop-count') as HTMLSpanElement | null;
        if (countEl) {
          countEl.style.display = 'none';
          countEl.textContent = '0';
        }
        const sEnd = getSettings();
        if (labelCompress && sEnd.lastSelectedCompress) labelCompress.value = sEnd.lastSelectedCompress;
        isCompressRunning = false;
        setBusy(false);
        updateCompressReady();
      }
    });
  }

  if (btnCompressClear) {
    btnCompressClear.addEventListener('click', async () => {
      if (!confirm('Очистить настройки сжатия?')) return;

      droppedFiles = [];
      compressDropped = [];

      updateFolderLabel(labelCompress, null);
      updateFolderLabel(labelCompressOutput, null);
      updateCompressDnDState();

      updateSettings({
        compressInputFolder: null,
        compressOutputFolder: null,
        lastSelectedCompress: null,
        lastSelectedCompressOutputFolder: null,
        compressQuality: 30,
        thumbnailsEnabled: true,
        thumbnailSize: 128,
      });

      clearCompressTable();
      log('Настройки сжатия очищены', 'warning');
      showPopup('Настройки сжатия очищены', 4000);
      updateCompressReady();
    });
  }

  // --- "Сжать добавленные" из DnD-глереи ---

  if (cdBtnRun) {
    cdBtnRun.addEventListener('click', async () => {
      if (!compressDropped.length) return;
      const s0 = getSettings();
      if (!s0.compressOutputFolder) {
        showPopup('Сначала выберите папку вывода (Сжатие PDF)', 5000);
        return;
      }
      const pdfPaths = compressDropped
        .filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
        .map((f) => f.path);
      if (!pdfPaths.length) {
        showPopup('Нет PDF для сжатия', 4000);
        return;
      }

      const quality = getCompressQuality();
      updateSettings({ compressQuality: quality });

      const sForLog = getSettings();
      log(
        `Сжатие (drag): ${pdfPaths.length} файлов -> ${sForLog.compressOutputFolder}, качество ${quality}%`,
        'info',
      );

      setBusy(true);
      try {
        const s = getSettings();
        const res = await electronAPI.compressFiles({
          files: pdfPaths,
          outputFolder: s.compressOutputFolder!,
          quality,
        });
        res.log?.forEach((m: string) => log(m, m.includes('Ошибка') ? 'error' : 'info'));
        showPopup(`Сжатие завершено: ${res.processed}/${res.total}`, 6000);
      } catch (err) {
        log(`Ошибка сжатия (drag): ${(err as Error).message}`, 'error');
        showPopup('Ошибка сжатия drag&drop.', 8000);
      } finally {
        setBusy(false);
      }
    });
  }

  // --- события compress-progress / complete ---

  electronAPI.onCompressProgress((_, payload) => {
    try {
      const { index, total, name, inSize, outSize, ok, error, notes } = payload as {
        index: number;
        total: number;
        name: string;
        inSize?: number;
        outSize?: number;
        ok: boolean;
        error?: string | null;
        notes?: string | null;
      };

      if (compressTableBody) {
        const safeName =
          (window.CSS && (CSS as any).escape)
            ? (CSS as any).escape(name)
            : name.replace(/"/g, '\\"');
        let row = compressTableBody.querySelector(`tr[data-name="${safeName}"]`) as HTMLTableRowElement | null;

        if (!row) {
          row = document.createElement('tr');
          row.setAttribute('data-name', name);
          row.innerHTML = `
            <td>${index}</td>
            <td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</td>
            <td>${inSize ? formatBytes(inSize) : ''}</td>
            <td>${outSize ? formatBytes(outSize) : ''}</td>
            <td>${computePercent(inSize, outSize)}</td>
            <td>${ok ? (notes || 'OK') : (error || 'ERROR')}</td>
          `;
          compressTableBody.appendChild(row);
        } else {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            cells[0].textContent = String(index);
            cells[2].textContent = inSize ? formatBytes(inSize) : '';
            cells[3].textContent = outSize ? formatBytes(outSize) : '';
            cells[4].textContent = computePercent(inSize, outSize);
            cells[5].textContent = ok ? (notes || 'OK') : (error || 'ERROR');
          }
        }
      }

      if (compressProgressFill && Number.isFinite(index) && Number.isFinite(total) && total > 0) {
        const percent = Math.max(0, Math.min(100, Math.round((index / total) * 100)));
        compressProgressFill.style.width = `${percent}%`;
        if (compressProgressPercent) compressProgressPercent.textContent = `${percent}%`;
      }
    } catch (e) {
      console.error('compress-progress handler error', e);
    }
  });

  electronAPI.onCompressComplete((_, payload) => {
    try {
      const { processed, total, log: logArr } = payload as any;
      const canceled = Array.isArray(logArr) && logArr.some((m: string) => /отмен[а|ено]/i.test(m));

      if (compressProgressFill) {
        compressProgressFill.style.width = '100%';
        compressProgressFill.classList.remove('is-cancel');
      }
      if (compressProgressPercent) compressProgressPercent.textContent = '100%';

      if (canceled) {
        setCompressStatus('cancel', 'Отменено');
        showPopup(`Сжатие отменено (${processed}/${total})`, 8000);
      } else {
        setCompressStatus('done', 'Готово');
        showPopup(`Сжатие завершено: ${processed}/${total}`, 8000);
      }

      logArr && Array.isArray(logArr) && logArr.forEach((m: string) => {
        log(m, m.includes('Ошибка') ? 'error' : 'info');
      });
    } finally {
      isCompressRunning = false;
      cancelCompressRequested = false;
      setBusy(false);
      updateCompressReady();
    }
  });

  // --- кнопка Cancel (общая) ---

  const cancelBtn = document.getElementById('btn-cancel-op') as HTMLButtonElement | null;
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      btn.disabled = true;
      try {
        if (isCompressRunning) {
          cancelCompressRequested = true;
          if (compressProgressFill) compressProgressFill.classList.add('is-cancel');
          const busyLabel = document.getElementById('busy-label');
          if (busyLabel) busyLabel.textContent = 'Останавливается…';
          await electronAPI.cancelCompress();
          log('Запрошена отмена сжатия', 'warning');
          showPopup('Запрос отмены сжатия отправлен', 4000);
        }
      } catch {
        showPopup('Ошибка отправки запроса отмены', 6000);
      } finally {
        setTimeout(() => {
          btn.disabled = false;
        }, 1500);
      }
    });
  }

  // --- init ---
  initCompressDropzone();
  updateCompressReady();
  try {
    layoutCompressResize();
  } catch {}
  window.addEventListener('resize', () => {
    try {
      layoutCompressResize();
    } catch {}
  });
}