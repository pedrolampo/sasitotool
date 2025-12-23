import ExcelJS from 'exceljs';
import fs from 'fs';

function parseUsdPrice(priceStr) {
  if (!priceStr) return null;
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

  const baseColumns = [
    { header: 'Nombre', key: 'name', width: 50 },
    { header: 'Plataformas', key: 'platforms', width: 20 },
    { header: 'Precio (USD)', key: 'price', width: 15 },
  ];

  const extraColumns = [];
  if (exchangeRate) {
    extraColumns.push({
      header: `Precio (ARS) @ ${exchangeRate}`,
      key: 'priceArs',
      width: 18,
    });
  }

  const tailColumns = [
    { header: 'Descuento', key: 'discount', width: 12 },
    { header: 'URL', key: 'productUrl', width: 60 },
  ];

  sheet.columns = [...baseColumns, ...extraColumns, ...tailColumns];

  games.forEach((g) => {
    const priceUsdNum = parseUsdPrice(g.price);
    let priceArs = '';
    if (exchangeRate && priceUsdNum != null) {
      const value = priceUsdNum * exchangeRate;
      priceArs = value.toFixed(2);
    }
    sheet.addRow({
      name: g.name || '',
      platforms: (g.platforms || []).join(', '),
      price: g.price || '',
      priceArs,
      discount: g.discount || '',
      productUrl: g.productUrl || '',
    });
  });

  sheet.autoFilter = {
    from: 'A1',
    to: sheet.columns.length === 5 ? 'E1' : 'F1',
  };
  sheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);
}

export function exportToCSV(games, filePath, exchangeRate = null) {
  let header = 'Nombre;Plataformas;Precio (USD);';
  if (exchangeRate) header += `Precio (ARS) @ ${exchangeRate};`;
  header += 'Descuento;URL\n';

  const rows = games.map((g) => {
    const name = (g.name || '').replace(/;/g, ',');
    const platforms = (g.platforms || []).join(', ').replace(/;/g, ',');
    const price = g.price || '';
    const priceUsdNum = parseUsdPrice(g.price);
    let priceArs = '';
    if (exchangeRate && priceUsdNum != null) {
      const value = priceUsdNum * exchangeRate;
      priceArs = value.toFixed(2);
    }
    const discount = g.discount || '';
    const url = g.productUrl || '';

    if (exchangeRate)
      return `${name};${platforms};${price};${priceArs};${discount};${url}`;
    return `${name};${platforms};${price};;${discount};${url}`;
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
