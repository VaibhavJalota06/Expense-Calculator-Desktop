const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

// ──────────────────────────────────────────────────────────────────
// Single Instance Lock: Prevents multiple instances from running concurrently
// and fighting over Chromium GPU & Quota database locks.
// ──────────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Move all Electron user-data (cache, quota DB, IndexedDB) to %APPDATA%/ExpenseOS
const safeUserDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'ExpenseOS');
app.setPath('userData', safeUserDataPath);
app.setPath('logs', path.join(safeUserDataPath, 'logs'));

// Self-healing: clean corrupted/empty QuotaManager files on startup
function cleanCorruptedCache() {
  const quotaFiles = [
    path.join(safeUserDataPath, 'QuotaManager'),
    path.join(safeUserDataPath, 'QuotaManager-journal'),
    path.join(safeUserDataPath, 'WebStorage', 'QuotaManager'),
    path.join(safeUserDataPath, 'WebStorage', 'QuotaManager-journal'),
  ];
  quotaFiles.forEach(f => {
    try {
      if (fs.existsSync(f)) {
        const stat = fs.statSync(f);
        if (stat.size === 0) {
          fs.unlinkSync(f);
        }
      }
    } catch (e) { /* ignore locked files */ }
  });
}
cleanCorruptedCache();

// Suppress Chromium GPU disk cache & quota database errors on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('no-sandbox');


let autoUpdater;


try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto-updater-status', { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto-updater-status', { status: 'available', version: info.version });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto-updater-status', { status: 'not-available', version: info ? info.version : app.getVersion() });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto-updater-status', { status: 'downloading', percent: Math.round(progressObj.percent) });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto-updater-status', { status: 'downloaded', version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto-updater-status', { status: 'error', message: err ? err.message : 'Update check failed' });
    }
  });
} catch (e) {
  console.log('electron-updater not loaded in dev mode:', e.message);
}

ipcMain.on('check-for-updates-now', () => {
  if (autoUpdater && app.isPackaged) {
    autoUpdater.checkForUpdates().catch(err => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('auto-updater-status', { status: 'error', message: err ? err.message : '' });
      }
    });
  } else if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('auto-updater-status', { status: 'dev-mode' });
  }
});

ipcMain.on('restart-and-install', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall(false, true);
  }
});

// Lightweight static file server for local HTTP protocol (enables Firebase Auth in Electron)
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const webRoot = path.join(__dirname, 'web');

const server = http.createServer((req, res) => {
  // Decode and strip query strings
  let requestedPath = decodeURIComponent(req.url.split('?')[0]);

  // Resolve absolute path within the web directory
  let filePath = path.resolve(webRoot, requestedPath === '/' ? 'index.html' : '.' + requestedPath);

  // SECURITY: Block path traversal — ensure resolved path stays inside web/
  if (!filePath.startsWith(webRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(webRoot, 'index.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      res.end('Internal Server Error');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      });
      res.end(content, 'utf-8');
    }
  });
});

let serverPort = 58420;

function startLocalServer(callback) {
  server.listen(58420, 'localhost', () => {
    serverPort = server.address().port;
    console.log(`Local Expense OS server running at http://localhost:${serverPort}`);
    callback(serverPort);
  }).on('error', () => {
    // Fallback to fixed backup port 58421 if 58420 is temporarily in use
    server.listen(58421, 'localhost', () => {
      serverPort = server.address().port;
      callback(serverPort);
    });
  });
}

let mainWindow;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 420,
    minHeight: 500,
    title: 'Expense OS - Desktop Studio',
    backgroundColor: '#050811',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  });

  // Set Chrome User-Agent so Google Auth popups inside Electron operate smoothly
  mainWindow.webContents.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  // Security: Intercept top-level navigation attempts to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== `http://localhost:${port}`) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (e) {
      event.preventDefault();
    }
  });

  // Handle external link navigation vs Google Auth popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Google Auth popups inside Electron
    if (url.includes('accounts.google.com') || url.includes('firebaseapp.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 550,
          height: 650,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
          }
        }
      };
    }
    // Open all other external links in user's default installed browser (Chrome/Edge/Firefox)
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Remove default menu bar for clean desktop app presentation
  Menu.setApplicationMenu(null);

  // Load via HTTP protocol on localhost (default authorized domain in Firebase)
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    
    // Check for updates on GitHub Releases automatically when app is packaged
    if (autoUpdater && app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.log('Auto update check status:', err.message);
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startLocalServer((port) => {
    createWindow(port);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(serverPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    server.close();
    app.quit();
  }
});

// Suppress uncaught Chromium cache/quota errors from polluting the console
process.on('uncaughtException', (err) => {
  if (
    err.message &&
    (err.message.includes('quota') ||
     err.message.includes('cache') ||
     err.message.includes('disk_cache'))
  ) {
    // These are benign Chromium cache errors — app continues normally
    return;
  }
  console.error('Unhandled Error:', err);
});
