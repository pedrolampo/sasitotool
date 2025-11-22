const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scraperApi', {
  runScraper: (url, pages, fileType, fileNameBase, exchangeRate) =>
    ipcRenderer.invoke('run-scraper', {
      url,
      pages,
      fileType,
      fileNameBase,
      exchangeRate,
    }),

  // NUEVO: Función para escuchar logs
  onLogUpdate: (callback) =>
    ipcRenderer.on('scraper-log', (_event, value) => callback(value)),
});
