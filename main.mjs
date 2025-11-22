import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapePsOffers, exportToExcel, exportToCSV } from './scraper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  await mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle(
  'run-scraper',
  async (event, { url, pages, fileType, fileNameBase, exchangeRate }) => {
    try {
      console.log('run-scraper recibido:', {
        url,
        pages,
        fileType,
        fileNameBase,
        exchangeRate
      });

      const safeType = fileType === 'csv' ? 'csv' : 'xlsx';
      const ext = safeType === 'csv' ? 'csv' : 'xlsx';

      let rate = null;
      if (typeof exchangeRate === 'number' && exchangeRate > 0) {
        rate = exchangeRate;
      }

      const defaultName =
        (fileNameBase && fileNameBase.trim()) || 'juegos-psstore';

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar archivo',
        defaultPath: `${defaultName}.${ext}`,
        filters:
          safeType === 'csv'
            ? [{ name: 'CSV', extensions: ['csv'] }]
            : [{ name: 'Excel', extensions: ['xlsx'] }]
      });

      if (result.canceled || !result.filePath) {
        return { ok: false, error: 'Guardado cancelado' };
      }

      let finalPath = result.filePath;
      const wantedExt = `.${ext}`;
      if (!finalPath.toLowerCase().endsWith(wantedExt)) {
        finalPath += wantedExt;
      }

      const games = await scrapePsOffers(url, pages);

      if (safeType === 'csv') {
        exportToCSV(games, finalPath, rate);
      } else {
        await exportToExcel(games, finalPath, rate);
      }

      return {
        ok: true,
        count: games.length,
        filePath: finalPath,
        fileType: safeType
      };
    } catch (err) {
      console.error('Error en run-scraper:', err);
      return { ok: false, error: err.message || String(err) };
    }
  }
);
