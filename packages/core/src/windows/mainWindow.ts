import { BrowserWindow, app } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow() {
  return mainWindow;
}

/** Путь к preload.js после сборки (dist/preload.js). */
function getPreloadPath() {
  // __dirname = dist/main/windows
  return path.join(__dirname, '..', '..', 'preload.js');
}

/** Путь к index.html: dev через Vite, prod из dist/renderer. */
async function loadMainWindowContent(win: BrowserWindow) {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isDev = !app.isPackaged || !!devServerUrl;

  if (isDev && devServerUrl) {
    await win.loadURL(`${devServerUrl}/index.html`);
  } else {
    const indexPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
    await win.loadFile(indexPath);
  }
}

/** Создать главное окно приложения. */
export function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    autoHideMenuBar: true,
    minWidth: 900,
  });

  void loadMainWindowContent(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}