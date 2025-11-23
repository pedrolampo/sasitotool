const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scraperApi', {
  runScraper: (url, pages, fileType, fileNameBase, exchangeRate, config) =>
    ipcRenderer.invoke('run-scraper', {
      url,
      pages,
      fileType,
      fileNameBase,
      exchangeRate,
      config,
    }),

  onLogUpdate: (callback) =>
    ipcRenderer.on('scraper-log', (_event, value) => callback(value)),
});
