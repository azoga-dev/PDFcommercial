import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import fs from 'fs-extra';
import { promises as fsp } from 'fs';
import { pathToFileURL } from 'url';
import { getLog, appendLog } from '../services/loggingStore';

let logWindow: BrowserWindow | null = null;

/** Глобальное состояние темы (передаётся из main). */
let currentThemeIsDark = false;

export function getLogWindow() {
  return logWindow;
}

export function setCurrentThemeIsDark(isDark: boolean) {
  currentThemeIsDark = !!isDark;
}

export function getCurrentThemeIsDark() {
  return currentThemeIsDark;
}

function getPreloadPath() {
  // __dirname = dist/main/windows
  return path.join(__dirname, '..', '..', 'preload.js');
}

async function loadLogWindowContent(win: BrowserWindow) {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isDev = !app.isPackaged || !!devServerUrl;

  if (isDev && devServerUrl) {
    await win.loadURL(`${devServerUrl}/logWindow.html`);
  } else {
    const htmlPath = path.join(__dirname, '..', '..', 'renderer', 'logWindow.html');
    await win.loadFile(htmlPath);
  }
}

export function createLogWindow() {
  if (logWindow && !logWindow.isDestroyed()) return logWindow;

  logWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Лог приложения',
  });

  void loadLogWindowContent(logWindow).catch((err) => {
    console.error('Ошибка загрузки окна логов:', err);
    appendLog(`[ERROR] Ошибка загрузки окна логов: ${(err as Error).message}`);
  });

  logWindow.on('closed', () => {
    logWindow = null;
  });

  logWindow.webContents.once('did-finish-load', async () => {
    try {
      // 1) Отправляем текущий лог и тему
      logWindow?.webContents.send('log-content', getLog());
      logWindow?.webContents.send('set-theme', currentThemeIsDark);

      // 2) Найти styles.css (dist предпочтительно)
      const candidates = [
        // если когда-нибудь будешь класть styles.css рядом с main
        path.join(__dirname, '..', '..', 'styles.css'),
        // старый вариант из dist корня
        path.join(process.cwd(), 'dist', 'styles.css'),
        // текущий рабочий вариант — исходный styles.css
        path.join(process.cwd(), 'src', 'styles.css'),
      ];

      let cssPath: string | null = null;
      for (const p of candidates) {
        if (await fs.pathExists(p)) {
          cssPath = p;
          break;
        }
      }

      if (cssPath) {
        try {
          const css = await fsp.readFile(cssPath, 'utf8');
          await logWindow!.webContents.insertCSS(css);
          appendLog(`[DEBUG] insertCSS applied for ${cssPath}`);
        } catch (err) {
          console.warn('[logWindow] insertCSS failed:', (err as Error).message);
          appendLog(`[WARN] insertCSS failed: ${(err as Error).message}`);
        }

        try {
          const cssFileUrl = pathToFileURL(cssPath).href;
          await logWindow!.webContents.executeJavaScript(
            `
            (function(){
              if (!document.querySelector('link[data-injected-styles]')) {
                const l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = ${JSON.stringify(cssFileUrl)};
                l.setAttribute('data-injected-styles', '1');
                document.head.appendChild(l);
              }
              return true;
            })();
          `,
            true,
          );
          appendLog(`[DEBUG] <link> injected: ${cssPath}`);
        } catch (err) {
          console.warn('[logWindow] insert <link> failed:', (err as Error).message);
          appendLog(`[WARN] insert <link> failed: ${(err as Error).message}`);
        }
      } else {
        const warn = `styles.css не найден (пытались: ${candidates.join(', ')})`;
        console.warn('[logWindow] ' + warn);
        appendLog(`[WARN] ${warn}`);
      }

      // 3) Диагностика и fallback
      const diag = await logWindow!.webContents.executeJavaScript(
        `
        (function(){
          try {
            const sheets = document.styleSheets ? document.styleSheets.length : 0;
            const btn = document.querySelector('.btn') || document.querySelector('button') || document.body;
            const computed = btn ? window.getComputedStyle(btn) : null;
            const bg = computed ? computed.backgroundColor : null;
            const color = computed ? computed.color : null;
            const hasLink = !!document.querySelector('link[data-injected-styles]');
            return { sheets, bg, color, hasLink };
          } catch (e) { return { error: e && e.message }; }
        })();
      `,
        true,
      );

      appendLog(`[DEBUG] logWindow diag: ${JSON.stringify(diag)}`);

      const needFallback =
        !diag ||
        diag.sheets === 0 ||
        !diag.bg ||
        diag.bg === 'rgba(0, 0, 0, 0)' ||
        diag.bg === 'transparent';

      if (needFallback) {
        const fallbackCss = `
          :root { --bg: #ffffff; --text: #111827; --panel: #f9fafb; --border: #e5e7eb; --btn-bg: #3b82f6; --btn-text: #fff; --muted: #6b7280; }
          [data-theme="dark"] { --bg: #0b1220; --text: #e5e7eb; --panel: #111827; --border: #374151; --btn-bg: #2563eb; --btn-text: #fff; --muted: #9ca3af; }
          html,body { background:var(--bg); color:var(--text); font-family: Inter, system-ui, Arial; }
          .wrap { padding:12px; box-sizing:border-box; height:100%; display:flex; flex-direction:column; gap:12px; }
          .btn { padding:8px 12px; border-radius:8px; border:1px solid var(--border); cursor:pointer; background:var(--panel) !important; color:var(--text) !important; }
          .btn.primary { background:var(--btn-bg) !important; color:var(--btn-text) !important; border:none !important; }
          .filters { display:flex; gap:8px; align-items:center; }
          .log { flex:1; width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--panel); color:var(--text); font-family:monospace; font-size:13px; overflow:auto; }
          .search { padding:6px 8px; border-radius:6px; border:1px solid var(--border); background:var(--panel); color:var(--text); }
          .small { color:var(--muted); font-size:12px; }
        `;
        try {
          await logWindow!.webContents.insertCSS(fallbackCss);
          appendLog('[DEBUG] fallback CSS inserted into logWindow');
          logWindow?.webContents.send('set-theme', currentThemeIsDark);
        } catch (err) {
          console.error('[logWindow] failed to insert fallback CSS:', (err as Error).message);
          appendLog(`[ERROR] failed to insert fallback CSS: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      console.error('[main] Ошибка при инициализации окна логов:', err);
      appendLog(`[ERROR] Ошибка инициализации окна логов: ${(err as Error).message}`);
    }
  });

  return logWindow;
}