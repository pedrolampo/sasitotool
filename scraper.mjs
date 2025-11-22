import ExcelJS from 'exceljs';
import fs from 'fs';

function buildPageUrl(currentUrl, pageNumber) {
  try {
    const urlObj = new URL(currentUrl);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    if (!isNaN(lastSegment) && !isNaN(parseFloat(lastSegment))) {
      pathSegments[pathSegments.length - 1] = pageNumber.toString();
    } else {
      pathSegments.push(pageNumber.toString());
    }

    urlObj.pathname = '/' + pathSegments.join('/');
    return urlObj.toString();
  } catch (e) {
    console.error('Error construyendo URL, usando fallback simple:', e);
    return currentUrl + '/' + pageNumber;
  }
}

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

async function scrapeSinglePage(page, url, onLog) {
  try {
    onLog(`Navegando a: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForSelector('li', { timeout: 15000 });
    } catch (e) {
      onLog('⚠️ Timeout esperando lista, posiblemente vacía.');
    }

    await page.waitForTimeout(1500);

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

    onLog(`   -> Encontrados: ${games.length} items`);
    return games;
  } catch (err) {
    onLog(`❌ Error en página: ${err.message}. Saltando...`);
    return [];
  }
}

export async function scrapePsOffers(
  startUrl,
  pageCount = 1,
  onLog = () => {}
) {
  const { chromium } = await import('playwright');

  onLog('=== Iniciando Motor de Scraping ===');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,mp4,woff,woff2}', (route) =>
    route.abort()
  );

  const allGames = [];

  try {
    for (let p = 1; p <= pageCount; p++) {
      const pageUrl = buildPageUrl(startUrl, p);

      const randomDelay = Math.floor(Math.random() * 2000) + 1000;
      if (p > 1) {
        onLog(`⏳ Esperando ${randomDelay}ms para evitar bloqueo...`);
        await page.waitForTimeout(randomDelay);
      }

      onLog(`Procesando página ${p}/${pageCount}...`);

      const games = await scrapeSinglePage(page, pageUrl, onLog);

      if (games.length === 0) {
        onLog('🛑 Sin resultados. Finalizando lectura.');
        break;
      }

      allGames.push(...games);
    }
  } catch (globalErr) {
    onLog(`🔥 Error CRÍTICO: ${globalErr.message}`);
  } finally {
    onLog('Cerrando navegador...');
    await browser.close();
  }

  onLog('Limpando duplicados...');
  const deduped = [];
  const seenKeys = new Set();
  for (const g of allGames) {
    const key = g.productUrl || g.name;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.push(g);
  }

  onLog(`✅ FINALIZADO. Total únicos: ${deduped.length}`);
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

export function exportToCSV(
  games,
  filePath = 'juegos-psstore.csv',
  exchangeRate = null
) {
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
