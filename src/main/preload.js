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

  whatsappInit: () => ipcRenderer.invoke('whatsapp:init'),
  whatsappScan: () => ipcRenderer.invoke('whatsapp:scan'),
  whatsappSaveVcf: (contacts) =>
    ipcRenderer.invoke('whatsapp:save-vcf', contacts),
  whatsappLogout: () => ipcRenderer.invoke('whatsapp:logout'),

  onWhatsappQr: (callback) => {
    ipcRenderer.removeAllListeners('whatsapp:qr');
    ipcRenderer.on('whatsapp:qr', (_event, qr) => callback(qr));
  },
  onWhatsappReady: (callback) => {
    ipcRenderer.removeAllListeners('whatsapp:ready');
    ipcRenderer.on('whatsapp:ready', () => callback());
  },
  onWhatsappAuthenticated: (callback) => {
    ipcRenderer.removeAllListeners('whatsapp:authenticated');
    ipcRenderer.on('whatsapp:authenticated', () => callback());
  },
  onWhatsappAuthFailure: (callback) => {
    ipcRenderer.removeAllListeners('whatsapp:auth_failure');
    ipcRenderer.on('whatsapp:auth_failure', (_event, msg) => callback(msg));
  },
  onWhatsappDisconnected: (callback) => {
    ipcRenderer.removeAllListeners('whatsapp:disconnected');
    ipcRenderer.on('whatsapp:disconnected', (_event, reason) =>
      callback(reason)
    );
  },
});
