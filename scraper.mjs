import ExcelJS from 'exceljs';
import fs from 'fs';

function buildPageUrl(baseUrl, pageNumber) {
  if (/\/\d+(\/?$)/.test(baseUrl)) {
    return baseUrl.replace(/\/\d+(\/?$)/, `/${pageNumber}$1`);
  }
  if (baseUrl.endsWith('/')) return baseUrl + pageNumber;
  return baseUrl + '/' + pageNumber;
}

function parseUsdPrice(priceStr) {
  if (!priceStr) return null; // null = sin precio
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

async function scrapeSinglePage(page, url) {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });

  await page.waitForSelector('a[href*="/es-ar/product/"]', {
    timeout: 60000
  });

  await page.waitForTimeout(3000);

  const games = await page.$$eval('a[href*="/es-ar/product/"]', links => {
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
        productUrl: link.href
      });
    }

    return results;
  });

  return games;
}

export async function scrapePsOffers(baseUrl, pageCount = 1) {
  // Dynamic import: respects PLAYWRIGHT_BROWSERS_PATH at the time of execution
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);

  const allGames = [];

  for (let p = 1; p <= pageCount; p++) {
    const pageUrl = buildPageUrl(baseUrl, p);

    try {
      const games = await scrapeSinglePage(page, pageUrl);
      if (!games.length) break;
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

  return deduped;
}

export async function exportToExcel(
  games,
  filePath = 'juegos-psstore.xlsx',
  exchangeRate = null
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ofertas');

  const baseColumns = [
    { header: 'Nombre', key: 'name', width: 50 },
    { header: 'Plataformas', key: 'platforms', width: 20 },
    { header: 'Precio (USD)', key: 'price', width: 15 }
  ];

  const extraColumns = [];

  if (exchangeRate) {
    extraColumns.push({
      header: `Precio (ARS) @ ${exchangeRate}`,
      key: 'priceArs',
      width: 18
    });
  }

  const tailColumns = [
    { header: 'Descuento', key: 'discount', width: 12 },
    { header: 'URL', key: 'productUrl', width: 60 }
  ];

  sheet.columns = [...baseColumns, ...extraColumns, ...tailColumns];

  games.forEach(g => {
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
      productUrl: g.productUrl || ''
    });
  });

  sheet.autoFilter = {
    from: 'A1',
    to: sheet.columns.length === 5 ? 'E1' : 'F1'
  };
  sheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);
}

export function exportToCSV(
  games,
  filePath = 'juegos-psstore.csv',
  exchangeRate = null
) {
  let header = 'Nombre;Plataformas;Precio (USD);';

  if (exchangeRate) {
    header += `Precio (ARS) @ ${exchangeRate};`;
  }

  header += 'Descuento;URL\n';

  const rows = games.map(g => {
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

    if (exchangeRate) {
      return `${name};${platforms};${price};${priceArs};${discount};${url}`;
    }
    return `${name};${platforms};${price};;${discount};${url}`;
  });

  const csvContent = header + rows.join('\n');
  fs.writeFileSync(filePath, csvContent, 'utf8');
}
