const { app, BrowserWindow, Menu, shell, ipcMain, session } = require('electron');
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

ipcMain.on('open-external-url', (_e, url) => {
  if (url) shell.openExternal(url);
});

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
    if (server) {
      try { server.close(); } catch (e) {}
    }
    // Destroy windows to release file and GPU DB locks before launching installer
    try {
      BrowserWindow.getAllWindows().forEach(w => {
        if (!w.isDestroyed()) w.destroy();
      });
    } catch (e) {}
    
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 100);
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
  const relativePath = path.relative(webRoot, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
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
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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
  server.listen(58420, '127.0.0.1', () => {
    serverPort = server.address().port;
    console.log(`Local Expense OS server running at http://localhost:${serverPort}`);
    callback(serverPort);
  }).on('error', () => {
    // Fallback to fixed backup port 58421 if 58420 is temporarily in use
    server.listen(58421, '127.0.0.1', () => {
      serverPort = server.address().port;
      callback(serverPort);
    }).on('error', () => {
      // Dynamic fallback port if both 58420 & 58421 are locked
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        callback(serverPort);
      });
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

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin === `http://localhost:${port}`) {
        return;
      }

      const isAuthUrl =
        navigationUrl.includes('accounts.google.com') ||
        navigationUrl.includes('firebaseapp.com') ||
        navigationUrl.includes('supabase.co') ||
        navigationUrl.includes('googleapis.com') ||
        navigationUrl.includes('google.com/o/oauth');

      if (isAuthUrl) {
        return;
      }

      event.preventDefault();

      // If navigation target is the GitHub Pages web app (e.g. from Supabase logout redirect), redirect back to local app
      if (navigationUrl.includes('github.io') || navigationUrl.includes('Expense-Calculator-Desktop')) {
        mainWindow.loadURL(`http://localhost:${port}${parsedUrl.search || ''}${parsedUrl.hash || ''}`);
        return;
      }

      shell.openExternal(navigationUrl);
    } catch (e) {
      event.preventDefault();
    }
  });

  // Handle external link navigation vs Google Auth popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Google Auth popups inside Electron with Chrome userAgent
    if (
      url.includes('accounts.google.com') ||
      url.includes('google.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('googleapis.com') ||
      url.includes('supabase.co')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 600,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
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
  if (session && session.defaultSession) {
    session.defaultSession.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
  }

  startLocalServer((port) => {
    createWindow(port);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(serverPort);
    }
  });
});

app.on('before-quit', () => {
  if (server) {
    try { server.close(); } catch (e) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) {
      try { server.close(); } catch (e) {}
    }
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
