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

  // Dev vs Prod
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
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
