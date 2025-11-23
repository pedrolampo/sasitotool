import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 750,
    icon: path.join(__dirname, '../../assets/logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Apunta a ../ui/index.html relativo a src/main/
  await mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  // Pasamos la instancia de mainWindow a los handlers para usar dialogs
  // Usamos setImmediate para asegurar que mainWindow esté definida si fuera síncrono
  setTimeout(() => setupIpcHandlers(mainWindow), 100);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
