const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runScraper: (data) => ipcRenderer.invoke('run-scraper', data),
  onLog: (callback) => {
    ipcRenderer.removeAllListeners('scraper-log');
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('scraper-log', listener);
    return () => ipcRenderer.removeListener('scraper-log', listener);
  },
  onScrapeComplete: (callback) => {
    ipcRenderer.removeAllListeners('scrape-complete');
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('scrape-complete', listener);
    return () => ipcRenderer.removeListener('scrape-complete', listener);
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.removeAllListeners('update_available');
    ipcRenderer.on('update_available', () => callback());
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.removeAllListeners('update_downloaded');
    ipcRenderer.on('update_downloaded', () => callback());
  },
  onUpdateError: (callback) => {
    ipcRenderer.removeAllListeners('update_error');
    ipcRenderer.on('update_error', (_event, message) => callback(message));
  },
  restartApp: () => ipcRenderer.send('restart_app'),
});
