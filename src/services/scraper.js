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

        // Improved Price Regex to support USD, EUR, TRY/TL
        // Matches: US $10, U$S 10, $10, 10 USD, 10 EUR, €10, 10 TL, 10.50 TL, etc.
        const priceMatch = rawPriceText.match(
          /((?:US\s?|U\$S\s?)?[$€£¥₺]|USD|EUR|GBP|TL|TRY|Lira)\s?[\d.,]+|[\d.,]+\s?([$€£¥₺]|USD|EUR|GBP|TL|TRY|Lira)/i
        );

        if (priceMatch) {
          price = priceMatch[0];
        } else if (
          /\b(Gratis|Free|Incluido|Free Trial|Ücretsiz)\b/i.test(rawPriceText)
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
          productUrl: link.href,
          debugText: rawPriceText.substring(0, 30),
          // We don't have config here easily unless passed, but we can just store the string
          // The exporter will handle the conversion based on global config
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

async function scrapeGameDetails(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    try {
      await page.waitForSelector('[data-qa$="#price"], .psw-t-title-m', {
        timeout: 5000,
      });
    } catch (e) {}

    await page.waitForTimeout(3000);

    const discountDate = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('*'));
      const potentialElements = document.querySelectorAll('span, div, label');

      let foundText = null;

      for (const el of potentialElements) {
        const text = el.innerText || '';
        if (
          text &&
          (text.includes('La oferta finaliza') || text.includes('Offer ends'))
        ) {
          foundText = text;
          break;
        }
      }

      if (!foundText) {
        const bodyText = document.body.innerText;
        const match = bodyText.match(
          /(?:La oferta finaliza|Offer ends)[^\n]+/i
        );
        if (match) foundText = match[0];
      }

      if (foundText) {
        const strictMatch = foundText.match(
          /(?:La oferta finaliza|Offer ends|finaliza el)(?:\s+el)?\s+((?:\d{1,2}\/\d{1,2}\/\d{4})(?:\s+\d{1,2}:\d{2}(?:\s+GMT[-+]?\d*)?)?)/i
        );

        if (strictMatch && strictMatch[1]) {
          return strictMatch[1].trim();
        }

        const lineMatch = foundText.match(
          /(?:La oferta finaliza|Offer ends)(?:\s+el)?\s+([^\n]+)/i
        );
        if (lineMatch && lineMatch[1]) {
          return lineMatch[1].trim();
        }

        return foundText.substring(0, 50).trim();
      }

      return null;
    });

    return discountDate;
  } catch (e) {
    return null;
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

  onLog(
    `Config: Headless=${headlessMode}, TimeoutLevel=${timeoutLevel}, IncludeDates=${config.includeDates}, Currency=${config.originCurrency}`
  );
  console.log('Scraper Config:', config);

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

      if (config.includeDates) {
        let processedCount = 0;
        for (const game of games) {
          processedCount++;
          if (game.discount && game.productUrl) {
            onLog(
              `   -> [${processedCount}/${
                games.length
              }] Leyendo detalles: ${game.name.substring(0, 20)}...`
            );

            const itemDelay = Math.floor(Math.random() * (4000 - 2000)) + 2000;
            await page.waitForTimeout(itemDelay);

            const endDate = await scrapeGameDetails(page, game.productUrl);
            if (endDate) {
              game.discountEndDate = endDate;
              onLog(`      Fecha encontrada: ${endDate}`);
            } else {
              onLog(`      Fecha no encontrada.`);
            }
          }
        }
      } else {
        onLog('Skipping date extraction (includeDates is false)');
      }
    }
  } catch (globalErr) {
    onLog(`🔥 Error CRÍTICO (Interrupción): ${globalErr.message}`);
    onLog(
      `⚠️ Intentando guardar ${allGames.length} items capturados hasta el momento...`
    );
  } finally {
    if (browser) {
      onLog('Cerrando navegador...');
      try {
        await browser.close();
      } catch (closeErr) {}
    }
  }

  onLog('Limpiando duplicados...');
  const deduped = [];
  const seenKeys = new Set();
  for (const g of allGames) {
    const key = g.productUrl || g.name;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    // Attach config info to each game for the exporter to use
    g.originCurrency = config.originCurrency || 'USD';
    g.rateToUsd = config.rateToUsd || 0;
    deduped.push(g);
  }

  onLog(`✅ FINALIZADO. Total únicos: ${deduped.length}`);
  return deduped;
}
