import ExcelJS from 'exceljs';
import fs from 'fs';

// Helper to identify and parse diverse currency formats
function parsePrice(priceStr) {
  if (!priceStr) return null;
  // Remove currency symbols ($, €, £, TL, etc.) and spaces
  // Keep digits, dots, commas
  let num = priceStr.replace(/[^\d.,]/g, '');
  if (!num) return null;

  const hasComma = num.includes(',');
  const hasDot = num.includes('.');

  let normalized;
  if (hasComma && hasDot) {
    normalized = num.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    normalized = num.replace(',', '.');
  } else {
    normalized = num;
  }

  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return null;
  return value;
}

export async function exportToExcel(games, filePath, exchangeRate = null) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ofertas');

  // Detect currency info from first item (as they all share the scrape run config)
  const firstGame = games[0] || {};
  const originCurrency = firstGame.originCurrency || 'USD';
  const rateToUsd = firstGame.rateToUsd || 1; // 1 for USD, user value for EUR/TRY

  const baseColumns = [
    { header: 'Nombre', key: 'name', width: 50 },
    { header: 'Plataformas', key: 'platforms', width: 20 },
    { header: `Precio (${originCurrency})`, key: 'price', width: 15 },
  ];

  const extraColumns = [];

  // If NOT USD, we might want to show the converted USD price
  if (originCurrency !== 'USD') {
    extraColumns.push({
      header: 'Precio (USD)',
      key: 'priceUsd',
      width: 15,
    });
  }

  // If we have an ARS exchange rate (Blue/Card), show ARS price
  if (exchangeRate) {
    extraColumns.push({
      header: `Precio (ARS) @ ${exchangeRate}`,
      key: 'priceArs',
      width: 18,
    });
  }

  const tailColumns = [
    { header: 'Descuento', key: 'discount', width: 12 },
    { header: 'Fin Descuento', key: 'discountEndDate', width: 30 },
    { header: 'URL', key: 'productUrl', width: 60 },
  ];

  sheet.columns = [...baseColumns, ...extraColumns, ...tailColumns];

  games.forEach((g) => {
    const rawPrice = parsePrice(g.price);

    // Calculate USD value
    let usdValue = null;
    if (rawPrice != null) {
      if (originCurrency === 'USD') {
        usdValue = rawPrice;
      } else {
        // Apply conversion rate
        usdValue = rawPrice * rateToUsd;
      }
    }

    // Prepare row data
    const row = {
      name: g.name || '',
      platforms: (g.platforms || []).join(', '),
      price: g.price || '', // Original string
      discount: g.discount || '',
      discountEndDate: g.discountEndDate || '',
      productUrl: g.productUrl || '',
    };

    // Add Price USD column if needed
    if (originCurrency !== 'USD') {
      row.priceUsd = usdValue != null ? usdValue.toFixed(2) : '';
    }

    // Add Price ARS column if needed
    if (exchangeRate) {
      if (usdValue != null) {
        row.priceArs = (usdValue * exchangeRate).toFixed(2);
      } else {
        row.priceArs = '';
      }
    }

    sheet.addRow(row);
  });

  sheet.autoFilter = {
    from: 'A1',
    to: {
      col: sheet.columns.length,
      row: 1,
    },
  };
  sheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);
}

export function exportToCSV(games, filePath, exchangeRate = null) {
  // Detect currency info
  const firstGame = games[0] || {};
  const originCurrency = firstGame.originCurrency || 'USD';
  const rateToUsd = firstGame.rateToUsd || 1;

  let header = `Nombre;Plataformas;Precio (${originCurrency});`;

  if (originCurrency !== 'USD') {
    header += 'Precio (USD);';
  }

  if (exchangeRate) header += `Precio (ARS) @ ${exchangeRate};`;
  header += 'Descuento;Fin Descuento;URL\n';

  const rows = games.map((g) => {
    const name = (g.name || '').replace(/;/g, ',');
    const platforms = (g.platforms || []).join(', ').replace(/;/g, ',');
    const price = g.price || '';

    // Calc values
    const rawPrice = parsePrice(g.price);
    let usdValue = null;

    if (rawPrice != null) {
      usdValue = originCurrency === 'USD' ? rawPrice : rawPrice * rateToUsd;
    }

    let priceUsdStr = '';
    if (originCurrency !== 'USD' && usdValue != null) {
      priceUsdStr = usdValue.toFixed(2);
    }

    let priceArsStr = '';
    if (exchangeRate && usdValue != null) {
      priceArsStr = (usdValue * exchangeRate).toFixed(2);
    }

    const discount = g.discount || '';
    const discountEndDate = g.discountEndDate || '';
    const url = g.productUrl || '';

    // Build row
    let row = `${name};${platforms};${price};`;
    if (originCurrency !== 'USD') row += `${priceUsdStr};`;
    if (exchangeRate) row += `${priceArsStr};`;

    row += `${discount};${discountEndDate};${url}`;
    return row;
  });

  const csvContent = header + rows.join('\n');
  fs.writeFileSync(filePath, csvContent, 'utf8');
}

export async function exportNotesToExcel(notes, filePath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Notas');

  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 20 },
    { header: 'Contenido', key: 'content', width: 80 },
  ];

  notes.forEach((note) => {
    let dateStr = '';
    if (note.createdAt) {
      try {
        // Handle Firestore Timestamp or Date string
        const date = note.createdAt.toDate
          ? note.createdAt.toDate()
          : new Date(note.createdAt);
        dateStr = date.toLocaleString('es-AR');
      } catch (e) {
        dateStr = String(note.createdAt);
      }
    }

    sheet.addRow({
      date: dateStr,
      content: note.content || '',
    });
  });

  sheet.getRow(1).font = { bold: true };
  await workbook.xlsx.writeFile(filePath);
}
