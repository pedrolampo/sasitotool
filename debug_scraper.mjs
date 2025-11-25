import { chromium } from 'playwright';

async function debugScraper() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  // Using a generic deals page or latest page for Argentina store as implied by the code
  const url = 'https://store.playstation.com/es-ar/pages/latest';

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  console.log('Waiting for selectors...');
  // Try to wait for the same selector as the app
  try {
    await page.waitForSelector('a[href*="/product/"]', { timeout: 10000 });
  } catch (e) {
    console.log(
      'Timeout waiting for product links, might be different structure or empty.'
    );
  }

  const items = await page.$$eval('a[href*="/product/"]', (links) => {
    return links.slice(0, 5).map((link) => {
      const container = link.closest('li') || link.parentElement;
      return {
        href: link.href,
        text: container ? container.innerText : 'NO CONTAINER',
        html: container ? container.innerHTML : 'NO CONTAINER',
      };
    });
  });

  console.log('--- Debug Results ---');
  items.forEach((item, i) => {
    console.log(`\nItem ${i + 1}:`);
    console.log(`URL: ${item.href}`);
    console.log(`Text Content: ${JSON.stringify(item.text)}`);
    // console.log(`HTML Content: ${item.html.substring(0, 200)}...`); // Optional
  });

  await browser.close();
}

debugScraper().catch(console.error);
