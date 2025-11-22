// server.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import ExcelJS from 'exceljs';

// Construye la URL de cada página a partir de la base
function buildPageUrl(baseUrl, pageNumber) {
  // Si termina en /1, /2, etc., lo reemplazamos
  if (/\/\d+(\/?$)/.test(baseUrl)) {
    return baseUrl.replace(/\/\d+(\/?$)/, `/${pageNumber}$1`);
  }

  // Si no tiene número al final, lo agregamos
  if (baseUrl.endsWith('/')) {
    return baseUrl + pageNumber;
  }

  return baseUrl + '/' + pageNumber;
}

// Scrapea UNA página
async function scrapeSinglePage(page, url) {
  console.log('Abriendo página:', url);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });

  console.log('Esperando a que se carguen los productos...');
  await page.waitForSelector('a[href*="/es-ar/product/"]', {
    timeout: 60000
  });

  // Espera extra por si todavía está acomodando el grid
  await page.waitForTimeout(3000);

  console.log('Extrayendo datos...');

  const games = await page.$$eval('a[href*="/es-ar/product/"]', links => {
    const seen = new Set();
    const results = [];

    for (const link of links) {
      const name = link.textContent?.trim();
      if (!name) continue;

      // Evitar duplicados dentro de la misma página
      if (seen.has(name)) continue;
      seen.add(name);

      const container = link.closest('li') || link.parentElement;
      if (!container) continue;

      const text = container.innerText || '';

      // Plataformas: PS5, PS4, etc.
      const platformMatches = text.match(/PS5|PS4|PS3|PS Vita|PS VR2|PC/g);
      const platforms = platformMatches
        ? Array.from(new Set(platformMatches))
        : [];

      // Precio principal
      const priceMatch = text.match(/US\$[\d.,]+/);
      const price = priceMatch ? priceMatch[0] : null;

      // Descuento tipo "-50 %"
      const discountMatch = text.match(/-\d+\s?%/);
      const discount = discountMatch ? discountMatch[0] : null;

      results.push({
        name,
        platforms,
        price,
        discount,
        productUrl: link.href
      });
    }

    return results;
  });

  console.log(`Página ${url} → ${games.length} juegos encontrados`);
  return games;
}

// Scrapea N páginas empezando desde la URL base
async function scrapePsOffers(baseUrl, pageCount = 1) {
  const browser = await chromium.launch({
    headless: true, // poné false si querés ver el navegador
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);

  const allGames = [];

  for (let p = 1; p <= pageCount; p++) {
    const pageUrl = buildPageUrl(baseUrl, p);
    console.log(`\n===== Scrapeando página ${p}/${pageCount} =====`);

    try {
      const games = await scrapeSinglePage(page, pageUrl);

      // Si una página no devuelve nada, asumimos que ya no hay más
      if (!games.length) {
        console.log('Sin resultados en esta página, corto el bucle.');
        break;
      }

      allGames.push(...games);
    } catch (err) {
      console.error(`Error en página ${p}:`, err.message || err);
      // Podrías cambiar "break" por "continue" si querés seguir igual
      break;
    }
  }

  await browser.close();

  // Deduplicar por nombre + URL por si algo se repite entre páginas
  const deduped = [];
  const seenKeys = new Set();

  for (const g of allGames) {
    const key = `${g.name}|${g.productUrl}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.push(g);
  }

  console.log(`\nTOTAL juegos encontrados: ${deduped.length}`);
  return deduped;
}

// Exportar a CSV (separador ";", ideal para Excel en es-AR)
function exportToCSV(games, filePath = 'juegos-psstore.csv') {
  const header = 'Nombre;Plataformas;Precio;Descuento;URL\n';

  const rows = games.map(g => {
    // Reemplazar ; por , para no romper el CSV
    const name = (g.name || '').replace(/;/g, ',');
    const platforms = (g.platforms || []).join(', ').replace(/;/g, ',');
    const price = g.price || '';
    const discount = g.discount || '';
    const url = g.productUrl || '';

    return `${name};${platforms};${price};${discount};${url}`;
  });

  const csvContent = header + rows.join('\n');
  fs.writeFileSync(filePath, csvContent, 'utf8');
  console.log(`\nArchivo CSV generado: ${filePath}`);
}

// Exportar a Excel (.xlsx) con filtros en los encabezados
async function exportToExcel(games, filePath = 'juegos-psstore.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ofertas');

  sheet.columns = [
    { header: 'Nombre', key: 'name', width: 50 },
    { header: 'Plataformas', key: 'platforms', width: 20 },
    { header: 'Precio', key: 'price', width: 15 },
    { header: 'Descuento', key: 'discount', width: 12 },
    { header: 'URL', key: 'productUrl', width: 60 }
  ];

  games.forEach(g => {
    sheet.addRow({
      name: g.name || '',
      platforms: (g.platforms || []).join(', '),
      price: g.price || '',
      discount: g.discount || '',
      productUrl: g.productUrl || ''
    });
  });

  // Activar autofiltro en la fila de encabezados
  sheet.autoFilter = {
    from: 'A1',
    to: 'E1'
  };

  // Opcional: poner en negrita la fila de encabezados
  sheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);
  console.log(`\nArchivo Excel generado: ${filePath}`);
}

// ---- ejecución desde consola ----
// Uso:
// node server.mjs "<URL>" [cantidadDePaginas] [nombreArchivo]
//
// Si el nombre termina en .csv  → genera CSV
// Si termina en .xlsx          → genera Excel con filtros
//
// Ejemplos:
// node server.mjs "https://store.playstation.com/es-ar/category/3f772501-f6f8-49b7-abac-874a88ca4897/1" 5
// node server.mjs "https://store.playstation.com/es-ar/category/3f772501-f6f8-49b7-abac-874a88ca4897/1" 5 ofertas.csv
// node server.mjs "https://store.playstation.com/es-ar/category/3f772501-f6f8-49b7-abac-874a88ca4897/1" 5 ofertas.xlsx

const urlFromArgs = process.argv[2];
const pagesArg = process.argv[3];
const fileArg = process.argv[4];

if (!urlFromArgs) {
  console.error('Uso: node server.mjs <URL> [cantidadDePaginas] [nombreArchivo]');
  process.exit(1);
}

const pageCount = pagesArg ? Math.max(parseInt(pagesArg, 10) || 1, 1) : 1;
const fileName = fileArg || 'juegos-psstore.csv';
const isXlsx = fileName.toLowerCase().endsWith('.xlsx');

scrapePsOffers(urlFromArgs, pageCount)
  .then(async games => {
    if (isXlsx) {
      await exportToExcel(games, fileName);
    } else {
      exportToCSV(games, fileName);
    }
  })
  .catch(err => {
    console.error('Error al scrapear:', err);
    process.exit(1);
  });
