// Points Playwright at the Chromium bundled in node_modules/playwright-core/.local-browsers
// (installed with PLAYWRIGHT_BROWSERS_PATH=0 and shipped via `asarUnpack` in package.json).
// Without this, Playwright looks in the global cache (%LOCALAPPDATA%\ms-playwright), which is
// empty on client PCs. Playwright reads this env var when its module loads, so this file must be
// imported before anything that imports `playwright` (see the first import in main.js).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  try {
    const require = createRequire(import.meta.url);
    const coreDir = path.dirname(require.resolve('playwright-core/package.json'));
    // Inside a packaged app the browsers live in app.asar.unpacked, not inside the archive.
    const browsersDir = path
      .join(coreDir, '.local-browsers')
      .replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

    if (fs.existsSync(browsersDir)) {
      process.env.PLAYWRIGHT_BROWSERS_PATH = browsersDir;
    }
  } catch (err) {
    console.error('Could not resolve bundled Playwright browsers:', err);
  }
}
