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
});
