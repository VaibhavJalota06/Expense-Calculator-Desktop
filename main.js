const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
let autoUpdater;

try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  console.log('electron-updater not loaded in dev mode:', e.message);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 950,
    minHeight: 650,
    title: 'Expense OS - Desktop Studio',
    backgroundColor: '#050811',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  // Remove default menu bar for clean desktop app presentation
  Menu.setApplicationMenu(null);

  mainWindow.loadFile('index.html');

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
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
