import { chromium } from 'playwright';

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
    console.error('Error construyendo URL fallback:', e);
    return currentUrl + '/' + pageNumber;
  }
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

  onLog('Limpiando duplicados...');
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
