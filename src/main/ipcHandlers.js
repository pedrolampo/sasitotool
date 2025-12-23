import { ipcMain, dialog } from 'electron';
import { scrapePsOffers } from '../services/scraper.js';
import { exportToExcel, exportToCSV } from '../services/exporter.js';
import * as whatsappService from '../services/whatsappService.js';

export function setupIpcHandlers(mainWindow) {
  ipcMain.handle('run-scraper', async (event, data) => {
    const {
      url,
      pages,
      format,
      fileName,
      exchangeRate,
      headless,
      timeoutLevel,
      includeDates,
      originCurrency,
    } = data;

    try {
      const safeType = format === 'csv' ? 'csv' : 'xlsx';
      const ext = safeType === 'csv' ? 'csv' : 'xlsx';
      let rate =
        typeof exchangeRate === 'number' && exchangeRate > 0
          ? exchangeRate
          : null;
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
      if (!finalPath.toLowerCase().endsWith(`.${ext}`)) finalPath += `.${ext}`;

      const config = {
        headless: headless !== false,
        timeoutLevel: timeoutLevel || 2,
        includeDates: includeDates === true,
        originCurrency: originCurrency || 'USD',
        // We pass the single rate. usage depends on originCurrency in logic
        exchangeRate: exchangeRate || 0,
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
  });

  ipcMain.handle('whatsapp:init', async () => {
    try {
      whatsappService.initialize(mainWindow);
      return { success: true };
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('whatsapp:scan', async () => {
    try {
      const contacts = await whatsappService.getUnsavedContacts();
      return { success: true, contacts };
    } catch (error) {
      console.error('Error scanning contacts:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('whatsapp:save-vcf', async (event, contacts) => {
    try {
      const vcfContent = whatsappService.generateVCF(contacts);

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Contactos VCF',
        defaultPath: 'contactos_whatsapp.vcf',
        filters: [{ name: 'VCF', extensions: ['vcf'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Guardado cancelado' };
      }

      const fs = await import('fs/promises');
      await fs.writeFile(result.filePath, vcfContent, 'utf-8');

      return { success: true, path: result.filePath };
    } catch (error) {
      console.error('Error saving VCF:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('whatsapp:logout', async () => {
    try {
      await whatsappService.logout();
      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notes:export', async (event, notes) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Exportar Notas',
        defaultPath: 'notas_telegram.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Guardado cancelado' };
      }

      // Dynamic import to avoid circular dependencies if any, though here it's fine
      const { exportNotesToExcel } = await import('../services/exporter.js');
      await exportNotesToExcel(notes, result.filePath);

      return { success: true, path: result.filePath };
    } catch (error) {
      console.error('Error exporting notes:', error);
      return { success: false, error: error.message };
    }
  });
}
