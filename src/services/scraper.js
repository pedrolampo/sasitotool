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

    const games = await page.$$eval('a[href*="/product/"]', (links) => {
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
  onLog = () => {},
  config = {}
) {
  onLog('=== Iniciando Motor de Scraping ===');

  // Default config
  const headlessMode = config.headless !== undefined ? config.headless : true;
  const timeoutLevel = parseInt(config.timeoutLevel || '2', 10);

  // Timeouts based on level (1=Fast, 2=Normal, 3=Slow)
  let navTimeout = 60000;
  let selectorTimeout = 15000;
  let minDelay = 1000;
  let maxDelay = 3000;

  if (timeoutLevel === 1) {
    // Fast
    navTimeout = 30000;
    selectorTimeout = 10000;
    minDelay = 500;
    maxDelay = 1500;
  } else if (timeoutLevel === 3) {
    // Slow
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

      const randomDelay =
        Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
      if (p > 1) {
        onLog(' '); // Visual separator
        onLog(`⏳ Esperando ${randomDelay}ms para evitar bloqueo...`);
        await page.waitForTimeout(randomDelay);
      }

      onLog(`Procesando página ${p}/${pageCount}...`);

      // Pass timeouts to scrapeSinglePage (we need to update that function too or pass options)
      // For simplicity, let's inline the logic or pass a config object to scrapeSinglePage
      // But scrapeSinglePage is defined above. Let's update it to accept timeouts.

      try {
        onLog(`Navegando a: ${pageUrl}`);
        await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: navTimeout,
        });

        try {
          await page.waitForSelector('li', { timeout: selectorTimeout });
        } catch (e) {
          onLog('⚠️ Timeout esperando lista, posiblemente vacía.');
        }

        await page.waitForTimeout(1500); // Fixed wait for dynamic content

        const games = await page.$$eval('a[href*="/product/"]', (links) => {
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
            const platformMatches = text.match(
              /PS5|PS4|PS3|PS Vita|PS VR2|PC/g
            );
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

        if (games.length === 0) {
          onLog('🛑 Sin resultados. Finalizando lectura.');
          break;
        }
        allGames.push(...games);
      } catch (err) {
        onLog(`❌ Error en página: ${err.message}. Saltando...`);
        // If navigation failed, we might want to stop or continue.
        // Original logic returned empty array.
      }
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
