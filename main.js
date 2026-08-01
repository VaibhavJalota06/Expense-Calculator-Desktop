const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

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
      res.writeHead(200, { 'Content-Type': contentType });
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
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Set Chrome User-Agent so Google Auth popups inside Electron operate smoothly
  mainWindow.webContents.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  // Handle window popups (for Google Sign-In popup)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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
    app.quit();
  }
});


