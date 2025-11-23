const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runScraper: (data) => ipcRenderer.invoke('run-scraper', data),
  onLog: (callback) =>
    ipcRenderer.on('scraper-log', (_event, value) => callback(value)),
  onScrapeComplete: (callback) =>
    ipcRenderer.on('scrape-complete', (_event, value) => callback(value)),
});
