import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { app, BrowserWindow, Menu, session } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';

import { DEFAULT_WS_PORT, WS_HOST } from '../lib/types/ws-protocol';
import { Ff8ProcessWatcher } from './ff8/watcher';
import { Ff8WebSocketHub } from './ws/hub';

const devServerUrl = process.env.VITE_DEV_SERVER_URL;

const configuredWsPort = Number(process.env.FF8_WS_PORT);
const preferredWsPort =
  Number.isInteger(configuredWsPort) && configuredWsPort > 0 && configuredWsPort < 65536
    ? configuredWsPort
    : DEFAULT_WS_PORT;

// Opt-in renderer DevTools protocol for local inspection, e.g. in PowerShell:
//   $env:FF8_DEBUG_PORT=9222; pnpm dev
// Electron Forge's `start` does not forward extra CLI flags to Chromium, so the
// port has to be registered from inside the main process. This is now only a
// convenience for viewing the UI; the data bridge no longer needs CDP.
const debuggingPort = process.env.FF8_DEBUG_PORT;
if (debuggingPort && /^\d+$/.test(debuggingPort)) {
  app.commandLine.appendSwitch('remote-debugging-port', debuggingPort);
}

interface WindowState {
  height?: number;
  width?: number;
  x?: number;
  y?: number;
}

let mainWindow: BrowserWindow | null = null;
let activeWsPort = preferredWsPort;

// The watcher feeds the hub; the hub is the single source of truth that the
// renderer, agents and tests all consume over the loopback socket.
const watcher = new Ff8ProcessWatcher({
  onDeltas: (deltas) => hub.broadcastDeltas(deltas),
  onError: (error) => console.error('[ff8-watcher]', error),
  onStatus: (status) => hub.broadcastStatus(status)
});

const hub = new Ff8WebSocketHub({
  port: preferredWsPort,
  getSnapshot: () => watcher.getSnapshot(),
  onError: (error) => console.error('[ff8-ws]', error),
  log: (message) => console.log('[ff8-ws]', message)
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

function isLoopback(url: URL): boolean {
  return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
}

function isAllowedRequest(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (['file:', 'data:', 'blob:', 'about:', 'devtools:'].includes(url.protocol)) return true;
    // The renderer connects to the local data hub over ws://.
    if (url.protocol === 'ws:' && isLoopback(url) && url.port === String(activeWsPort)) return true;
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
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      devTools: Boolean(devServerUrl),
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!devServerUrl || !isAllowedRequest(url)) event.preventDefault();
  });
  mainWindow.on('close', () => saveWindowState(mainWindow!));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // The renderer discovers the actual hub port from the query string, so an
  // FF8_WS_PORT override or a busy-port fallback still connects correctly.
  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.searchParams.set('wsPort', String(activeWsPort));
    await mainWindow.loadURL(url.toString());
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), 'build', 'index.html'), {
      query: { wsPort: String(activeWsPort) }
    });
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await hub.start();
  activeWsPort = hub.port;
  console.log(
    `[ff8-ws] bridge ready at ws://${WS_HOST}:${activeWsPort} ` +
    `(one-shot state: http://${WS_HOST}:${activeWsPort}/state)`
  );
  lockDownSession();
  await createWindow();
  watcher.start();
}).catch((error) => {
  console.error('[startup]', error);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on('before-quit', () => {
  watcher.stop();
  void hub.stop();
});
app.on('window-all-closed', () => app.quit());
