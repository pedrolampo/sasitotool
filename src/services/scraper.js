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
      await page.waitForSelector(
        '.psw-product-tile, [data-qa$="#price"], .psw-t-title-m',
        {
          timeout: 15000,
        }
      );
    } catch (e) {
      onLog(
        '⚠️ Timeout esperando elementos específicos, intentando leer igual...'
      );
    }

    await page.waitForTimeout(2000);

    const games = await page.$$eval('a[href*="/product/"]', (links) => {
      const seen = new Set();
      const results = [];

      for (const link of links) {
        const name = link.textContent?.trim();
        if (!name) continue;

        if (seen.has(name)) continue;
        seen.add(name);

        const container =
          link.closest('li') ||
          link.closest('.psw-product-tile') ||
          link.closest('.grid-cell__body') ||
          link.parentElement?.parentElement?.parentElement ||
          link.parentElement;

        if (!container) continue;

        const containerText = container.innerText || '';
        const platformMatches = containerText.match(
          /PS5|PS4|PS3|PS Vita|PS VR2|PC/g
        );
        const platforms = platformMatches
          ? Array.from(new Set(platformMatches))
          : [];

        let price = null;
        let rawPriceText = '';

        const priceElement =
          container.querySelector('[data-qa$="#finalPrice"]') ||
          container.querySelector('[data-qa$="#price"]') ||
          container.querySelector('[data-qa*="display-price"]') ||
          container.querySelector('.psw-t-title-m');

        if (priceElement) {
          rawPriceText = priceElement.innerText.replace(/[\n\r]+/g, ' ').trim();
        } else {
          rawPriceText = containerText.replace(/[\n\r]+/g, ' ').trim();
        }

        const priceMatch = rawPriceText.match(
          /((?:US\s?|U\$S\s?)?[$€£¥]|USD|EUR|GBP)\s?[\d.,]+|[\d.,]+\s?([$€£¥]|USD|EUR|GBP)/i
        );

        if (priceMatch) {
          price = priceMatch[0];
        } else if (
          /\b(Gratis|Free|Incluido|Free Trial)\b/i.test(rawPriceText)
        ) {
          price = 'Gratis';
        }

        const discountMatch = containerText.match(/-\d+\s?%/);
        const discount = discountMatch ? discountMatch[0] : null;

        results.push({
          name,
          platforms,
          price,
          discount,
          productUrl: link.href,
          debugText: rawPriceText.substring(0, 30),
        });
      }
      return results;
    });

    onLog(`   -> Encontrados: ${games.length} items`);

    let missingPriceCount = 0;
    games.forEach((g) => {
      if (!g.price && g.discount) {
        missingPriceCount++;
        onLog(`⚠️ ALERTA: Sin precio. Texto analizado: "${g.debugText}"`);
      }
    });

    if (missingPriceCount > 0) {
      onLog(
        `⚠️ Total juegos con descuento pero sin precio detectado: ${missingPriceCount}`
      );
    }

    return games;
  } catch (err) {
    onLog(`❌ Error en página: ${err.message}. Saltando...`);
    return [];
  }
}

export async function scrapePsOffers(
  startUrl,
  pageCount = 1,
  onLog = () => {},
  config = {}
) {
  onLog('=== Iniciando Motor de Scraping ===');

  const headlessMode = config.headless !== undefined ? config.headless : true;
  const timeoutLevel = parseInt(config.timeoutLevel || '2', 10);

  let navTimeout = 60000;
  let selectorTimeout = 15000;
  let minDelay = 1000;
  let maxDelay = 3000;

  if (timeoutLevel === 1) {
    navTimeout = 30000;
    selectorTimeout = 10000;
    minDelay = 500;
    maxDelay = 1500;
  } else if (timeoutLevel === 3) {
    navTimeout = 90000;
    selectorTimeout = 30000;
    minDelay = 3000;
    maxDelay = 6000;
  }

  onLog(`Config: Headless=${headlessMode}, TimeoutLevel=${timeoutLevel}`);

  const browser = await chromium.launch({
    headless: headlessMode,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,mp4,woff,woff2}', (route) =>
    route.abort()
  );

  const allGames = [];

  try {
    for (let p = 1; p <= pageCount; p++) {
      const pageUrl = buildPageUrl(startUrl, p);

      if (p > 1) {
        const randomDelay =
          Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
        onLog(`⏳ Esperando ${randomDelay}ms...`);
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
