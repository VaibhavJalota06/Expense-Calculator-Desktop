const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

// ──────────────────────────────────────────────────────────────────
// Fix Windows cache/quota errors caused by spaces in the app path.
// Move all Electron user-data (cache, quota DB, IndexedDB) to
// %APPDATA%/ExpenseOS so Windows has full write permissions.
// This MUST be called before app.whenReady().
// ──────────────────────────────────────────────────────────────────
const safeUserDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'ExpenseOS');
app.setPath('userData', safeUserDataPath);
app.setPath('logs', path.join(safeUserDataPath, 'logs'));

// Self-healing: delete corrupted QuotaManager files so Chromium recreates them fresh
// This stops the quota_database reset loop on Windows
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
        // Remove if empty/corrupted (0 bytes)
        if (stat.size === 0) {
          fs.unlinkSync(f);
          console.log('Removed empty/corrupted quota file:', f);
        }
      }
    } catch (e) { /* ignore locked files */ }
  });
}
cleanCorruptedCache();

// Suppress Chromium GPU disk cache & quota database errors on Windows
// These flags prevent the cascade of cache_util_win / gpu_disk_cache / quota_database errors
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('no-sandbox');


let autoUpdater;


try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  console.log('electron-updater not loaded in dev mode:', e.message);
}

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

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'web', req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'web', 'index.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      res.end('Error loading ' + filePath);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      });
      res.end(content, 'utf-8');
    }
  });
});

let serverPort = 4200;

function startLocalServer(callback) {
  server.listen(0, 'localhost', () => {
    serverPort = server.address().port;
    console.log(`Local Expense OS server running at http://localhost:${serverPort}`);
    callback(serverPort);
  }).on('error', () => {
    server.listen(0, 'localhost', () => {
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
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Set Chrome User-Agent so Google Auth popups inside Electron operate smoothly
  mainWindow.webContents.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
    mainWindow.show();
    
    // Check for updates on GitHub Releases automatically on desktop app launch
    if (autoUpdater) {
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
