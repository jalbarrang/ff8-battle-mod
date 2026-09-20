import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { app, BrowserWindow, ipcMain, Menu, session } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';

import { Ff8ProcessWatcher } from './ff8/watcher';

const IPC = {
  deltas: 'ff8:game-values-updated',
  processStatus: 'ff8:process-status-changed',
  update: 'ff8:update-game-value'
} as const;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

interface WindowState {
  height?: number;
  width?: number;
  x?: number;
  y?: number;
}

let mainWindow: BrowserWindow | null = null;
const watcher = new Ff8ProcessWatcher({
  onDeltas: (deltas) => mainWindow?.webContents.send(IPC.deltas, deltas),
  onError: (error) => console.error('[ff8-watcher]', error),
  onStatus: (status) => mainWindow?.webContents.send(IPC.processStatus, status)
});

if (squirrelStartup) app.quit();
app.setAppUserModelId('com.squirrel.FF8BattleHP.FF8BattleHP');

const statePath = (): string => path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState(): WindowState {
  try {
    if (!existsSync(statePath())) return {};
    const state = JSON.parse(readFileSync(statePath(), 'utf8')) as WindowState;
    return state.width && state.height ? state : {};
  } catch {
    return {};
  }
}

function saveWindowState(window: BrowserWindow): void {
  if (window.isMinimized() || window.isMaximized()) return;
  try {
    writeFileSync(statePath(), JSON.stringify(window.getBounds()));
  } catch (error) {
    console.error('[window-state]', error);
  }
}

function isAllowedRequest(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (['file:', 'data:', 'blob:', 'about:', 'devtools:'].includes(url.protocol)) return true;
    if (!devServerUrl) return false;
    const devUrl = new URL(devServerUrl);
    return (
      ['http:', 'ws:'].includes(url.protocol) &&
      url.hostname === devUrl.hostname &&
      url.port === devUrl.port
    );
  } catch {
    return false;
  }
}

function lockDownSession(): void {
  const defaultSession = session.defaultSession;
  defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  defaultSession.setPermissionCheckHandler(() => false);
  defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedRequest(details.url) });
  });
}

async function createWindow(): Promise<void> {
  const saved = loadWindowState();
  mainWindow = new BrowserWindow({
    width: saved.width ?? 540,
    height: saved.height ?? 360,
    x: saved.x,
    y: saved.y,
    minWidth: 320,
    minHeight: 160,
    title: 'FF8 Battle HP',
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      devTools: Boolean(devServerUrl),
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), '.vite', 'build', 'preload.cjs'),
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!devServerUrl || !isAllowedRequest(url)) event.preventDefault();
  });
  mainWindow.on('close', () => saveWindowState(mainWindow!));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (devServerUrl) await mainWindow.loadURL(devServerUrl);
  else await mainWindow.loadFile(path.join(app.getAppPath(), 'build', 'index.html'));
}

ipcMain.on(IPC.update, (_event, propertyName: unknown, value: unknown) => {
  if (typeof propertyName !== 'string') return;
  watcher.updateGameValue(propertyName, value);
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  lockDownSession();
  await createWindow();
  watcher.start();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on('before-quit', () => watcher.stop());
app.on('window-all-closed', () => app.quit());
