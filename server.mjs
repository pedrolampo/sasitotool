import { chromium } from 'playwright';
import fs from 'fs';
import ExcelJS from 'exceljs';

function buildPageUrl(baseUrl, pageNumber) {
  try {
    const urlObj = new URL(baseUrl);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    const lastSegment = pathSegments[pathSegments.length - 1];
    if (/^\d+$/.test(lastSegment)) {
      pathSegments[pathSegments.length - 1] = pageNumber.toString();
    } else {
      pathSegments.push(pageNumber.toString());
    }

    urlObj.pathname = '/' + pathSegments.join('/');
    return urlObj.toString();
  } catch (e) {
    if (/\/\d+(\/?$)/.test(baseUrl)) {
      return baseUrl.replace(/\/\d+(\/?$)/, `/${pageNumber}$1`);
    }
    if (baseUrl.endsWith('/')) {
      return baseUrl + pageNumber;
    }
    return baseUrl + '/' + pageNumber;
  }
}

async function scrapeSinglePage(page, url) {
  console.log('Abriendo página:', url);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  console.log('Esperando a que se carguen los productos...');
  await page.waitForSelector('a[href*="/es-ar/product/"]', {
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  console.log('Extrayendo datos...');

  const games = await page.$$eval('a[href*="/es-ar/product/"]', (links) => {
    const seen = new Set();
    const results = [];

    for (const link of links) {
      const name = link.textContent?.trim();
      if (!name) continue;

      if (seen.has(name)) continue;
      seen.add(name);

      const container = link.closest('li') || link.parentElement;
      if (!container) continue;

      const text = container.innerText || '';

      const platformMatches = text.match(/PS5|PS4|PS3|PS Vita|PS VR2|PC/g);
      const platforms = platformMatches
        ? Array.from(new Set(platformMatches))
        : [];

      const priceMatch = text.match(/US\$[\d.,]+/);
      const price = priceMatch ? priceMatch[0] : null;

      const discountMatch = text.match(/-\d+\s?%/);
      const discount = discountMatch ? discountMatch[0] : null;

      results.push({
        name,
        platforms,
        price,
        discount,
        productUrl: link.href,
      });
    }

    return results;
  });

  console.log(`Página ${url} → ${games.length} juegos encontrados`);
  return games;
}

async function scrapePsOffers(baseUrl, pageCount = 1) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);

  const allGames = [];

  for (let p = 1; p <= pageCount; p++) {
    const pageUrl = buildPageUrl(baseUrl, p);
    console.log(`\n===== Scrapeando página ${p}/${pageCount} =====`);

    try {
      const games = await scrapeSinglePage(page, pageUrl);

      if (!games.length) {
        console.log('Sin resultados en esta página, corto el bucle.');
        break;
      }

      allGames.push(...games);
    } catch (err) {
      console.error(`Error en página ${p}:`, err.message || err);
      break;
    }
  }

  await browser.close();

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

function exportToCSV(games, filePath = 'juegos-psstore.csv') {
  const header = 'Nombre;Plataformas;Precio;Descuento;URL\n';

  const rows = games.map((g) => {
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

async function exportToExcel(games, filePath = 'juegos-psstore.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ofertas');

  sheet.columns = [
    { header: 'Nombre', key: 'name', width: 50 },
    { header: 'Plataformas', key: 'platforms', width: 20 },
    { header: 'Precio', key: 'price', width: 15 },
    { header: 'Descuento', key: 'discount', width: 12 },
    { header: 'URL', key: 'productUrl', width: 60 },
  ];

  games.forEach((g) => {
    sheet.addRow({
      name: g.name || '',
      platforms: (g.platforms || []).join(', '),
      price: g.price || '',
      discount: g.discount || '',
      productUrl: g.productUrl || '',
    });
  });

  sheet.autoFilter = {
    from: 'A1',
    to: 'E1',
  };

  sheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);
  console.log(`\nArchivo Excel generado: ${filePath}`);
}

const urlFromArgs = process.argv[2];
const pagesArg = process.argv[3];
const fileArg = process.argv[4];

if (!urlFromArgs) {
  console.error(
    'Uso: node server.mjs <URL> [cantidadDePaginas] [nombreArchivo]'
  );
  process.exit(1);
}

const pageCount = pagesArg ? Math.max(parseInt(pagesArg, 10) || 1, 1) : 1;
const fileName = fileArg || 'juegos-psstore.csv';
const isXlsx = fileName.toLowerCase().endsWith('.xlsx');

scrapePsOffers(urlFromArgs, pageCount)
  .then(async (games) => {
    if (isXlsx) {
      await exportToExcel(games, fileName);
    } else {
      exportToCSV(games, fileName);
    }
  })
  .catch((err) => {
    console.error('Error al scrapear:', err);
    process.exit(1);
  });
