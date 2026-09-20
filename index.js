const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const WINDOW_STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE(), 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveWindowState(win) {
  try {
    if (!win.isMinimized() && !win.isMaximized()) {
      fs.writeFileSync(WINDOW_STATE_FILE(), JSON.stringify(win.getBounds()));
    }
  } catch (e) {
    // ignore
  }
}

// This app only ever reads/writes FF8_EN.exe memory. It must not be able to
// reach the network or request any OS permission (location, notifications,
// media, etc.). Lock the Chromium session down before anything loads.
function lockDownSession() {
  const ses = session.defaultSession;

  // 1) Deny every permission request.
  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  if (typeof ses.setPermissionCheckHandler === 'function') {
    ses.setPermissionCheckHandler(() => false);
  }

  // 2) The UI is 100% local (file://). Cancel every http/https/ws request so
  //    nothing can phone home, load remote fonts, or be reached via navigation.
  ses.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url || '';
    const isLocal =
      url.startsWith('file://') ||
      url.startsWith('devtools://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('about:');
    callback({ cancel: !isLocal });
  });
}

function createWindow() {
  const saved = loadWindowState();

  const mainWindow = new BrowserWindow({
    width: saved.width || 540,
    height: saved.height || 360,
    x: saved.x,
    y: saved.y,
    minWidth: 320,
    minHeight: 160,
    title: 'FF8 Battle HP',
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });

  // Sit above a borderless/windowed-fullscreen game.
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // No app menu (this is a small overlay, not a normal app window).
  Menu.setApplicationMenu(null);

  // Never navigate away from the local UI, never open new windows.
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  if (typeof mainWindow.webContents.setWindowOpenHandler === 'function') {
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  }

  mainWindow.loadFile(path.join(__dirname, 'public/index.html'));

  ['resize', 'move'].forEach((eventName) => {
    mainWindow.on(eventName, () => saveWindowState(mainWindow));
  });
}

app.on('ready', () => {
  lockDownSession();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
