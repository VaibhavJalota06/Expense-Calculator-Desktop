const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  checkForUpdates: () => ipcRenderer.send('check-for-updates-now'),
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('auto-updater-status', (_event, data) => callback(data));
  }
});
