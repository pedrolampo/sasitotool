import { ipcMain, dialog } from 'electron';
import { scrapePsOffers } from '../services/scraper.js';
import { exportToExcel, exportToCSV } from '../services/exporter.js';

export function setupIpcHandlers(mainWindow) {
  ipcMain.handle(
    'run-scraper',
    async (
      event,
      data // Received as a single object now
    ) => {
      const {
        url,
        pages,
        format,
        fileName,
        dollarRate,
        headless,
        timeoutLevel,
      } = data;

      try {
        const safeType = format === 'csv' ? 'csv' : 'xlsx';
        const ext = safeType === 'csv' ? 'csv' : 'xlsx';
        let rate =
          typeof dollarRate === 'number' && dollarRate > 0 ? dollarRate : null;
        const defaultName = (fileName && fileName.trim()) || 'juegos-psstore';

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

        // Config object for scraper
        const config = {
          headless: headless !== false, // Default true
          timeoutLevel: timeoutLevel || 2,
        };

        const games = await scrapePsOffers(
          url,
          pages,
          (message) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send('scraper-log', message);
            }
          },
          config
        );

        if (safeType === 'csv') {
          exportToCSV(games, finalPath, rate);
        } else {
          await exportToExcel(games, finalPath, rate);
        }

        const response = {
          success: true,
          count: games.length,
          path: finalPath,
          fileType: safeType,
        };

        // Send completion event
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('scrape-complete', response);
        }

        return response;
      } catch (err) {
        console.error('Error en handler run-scraper:', err);
        const errorResponse = {
          success: false,
          error: err.message || String(err),
        };

        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('scrape-complete', errorResponse);
        }
        return errorResponse;
      }
    }
  );
}
