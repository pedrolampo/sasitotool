import { ipcMain, dialog } from 'electron';
import { scrapePsOffers } from '../services/scraper.js';
import { exportToExcel, exportToCSV } from '../services/exporter.js';

export function setupIpcHandlers(mainWindow) {
  ipcMain.handle(
    'run-scraper',
    async (event, { url, pages, fileType, fileNameBase, exchangeRate }) => {
      try {
        const safeType = fileType === 'csv' ? 'csv' : 'xlsx';
        const ext = safeType === 'csv' ? 'csv' : 'xlsx';
        let rate =
          typeof exchangeRate === 'number' && exchangeRate > 0
            ? exchangeRate
            : null;
        const defaultName =
          (fileNameBase && fileNameBase.trim()) || 'juegos-psstore';

        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Guardar archivo',
          defaultPath: `${defaultName}.${ext}`,
          filters:
            safeType === 'csv'
              ? [{ name: 'CSV', extensions: ['csv'] }]
              : [{ name: 'Excel', extensions: ['xlsx'] }],
        });

        if (result.canceled || !result.filePath) {
          return { ok: false, error: 'Guardado cancelado' };
        }

        let finalPath = result.filePath;
        if (!finalPath.toLowerCase().endsWith(`.${ext}`))
          finalPath += `.${ext}`;

        const games = await scrapePsOffers(url, pages, (message) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('scraper-log', message);
          }
        });

        if (safeType === 'csv') {
          exportToCSV(games, finalPath, rate);
        } else {
          await exportToExcel(games, finalPath, rate);
        }

        return {
          ok: true,
          count: games.length,
          filePath: finalPath,
          fileType: safeType,
        };
      } catch (err) {
        console.error('Error en handler run-scraper:', err);
        return { ok: false, error: err.message || String(err) };
      }
    }
  );
}
