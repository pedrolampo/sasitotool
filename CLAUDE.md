# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SasitoTool — an Electron + Vue 3 desktop app for Sasitogames. It bundles a few unrelated internal
tools behind one sidebar UI: a PlayStation Store discount scraper, a WhatsApp "unsaved contacts"
exporter, a notes viewer backed by Firestore (notes are written externally, likely by a Telegram
bot — this repo only reads/edits/deletes them), and a "Publicar" wizard that creates **digital**
game listings on Tiendanube, filling a fixed spec-sheet template from RAWG data plus manually
entered licensing fields.

## Commands

- `npm run dev` — runs Vite dev server + Electron concurrently (`NODE_ENV=development`), loads
  `http://localhost:5173` with DevTools open. This is the normal way to work on the app.
- `npm start` — runs Electron directly against the last `npm run build` output in `dist/` (no Vite dev server).
- `npm run build` — `vite build` (renderer → `dist/`) then `electron-builder` (packages a Windows
  installer into `dist/` using `assets/logo.ico`, publishes config targets GitHub releases under
  `pedrolampo/sasitotool`).
- There is no test suite (`npm test` is a stub) and no lint script configured.
- `node server.mjs <URL> [pageCount] [fileName]` — standalone CLI scraper, independent of the Electron
  app (see Architecture notes below).

## Architecture

**Process split (standard Electron):**
- `src/main/main.js` — creates the `BrowserWindow`, loads dev server or `dist/index.html`, wires up
  `electron-updater` auto-update events (`update_available` / `update_downloaded` / `update_error`,
  restart via `restart_app` IPC).
- `src/main/preload.js` — the only bridge between renderer and main; exposes `window.electronAPI` via
  `contextBridge`. Any new main↔renderer capability must be added here *and* wired in `ipcHandlers.js`.
- `src/main/ipcHandlers.js` — all `ipcMain.handle` logic lives here, one function `setupIpcHandlers(mainWindow)`
  called once from `main.js`. It's the only place that touches `dialog.showSaveDialog` and delegates actual
  work to `src/services/*`.
- `src/services/*.js` — Node-side logic, no Electron API dependency except where noted:
  - `scraper.js` — Playwright/Chromium scraper for PS Store offer pages (`scrapePsOffers`). Pages are
    scraped sequentially with randomized delays (tunable via `timeoutLevel` 1/2/3); optionally opens each
    discounted game's product page to scrape its discount end date (`config.includeDates`). Price parsing
    is done via regex against product tile text — PS Store markup/selectors are fragile and have already
    needed adjustment (see `scrapeSinglePage`'s multi-selector fallbacks). `originCurrency`/`exchangeRate`
    from config get stamped onto every returned game object for downstream export.
  - `exporter.js` — turns scraped games into `.xlsx`/`.csv` (with optional USD/ARS converted-price
    columns derived from `originCurrency`/`exchangeRate`), and separately exports Firestore notes to `.xlsx`.
  - `whatsappService.js` — wraps `whatsapp-web.js` (Puppeteer-based). Session persisted to
    `.wwebjs_auth/` (gitignored). `getUnsavedContacts()` heuristically flags contacts whose saved "name"
    is actually just their phone number. `logout()` deletes the local auth folder.
  - `firebaseService.js` — Firestore client (config from `VITE_FIREBASE_*` env vars). Subscribes to the
    `notes` collection (`orderBy('createdAt', 'desc')`) with realtime `onSnapshot`; also exposes
    `updateNote`/`deleteNote`. This app does not create notes, only reads/edits/deletes — they originate
    elsewhere.
  - `gameInfoService.js` — RAWG API client (`RAWG_API_KEY`). `searchGames(name)` for the candidate list,
    `getGameFull(id)` for genres/platforms/developers/screenshots. Only supplies the fields RAWG can answer
    reliably (genre, release year, developer, images) — it does not attempt to guess licensing-specific
    fields like language, disk space, or multiplayer support (see below). Also exposes
    `fetchImageAsDataUrl(url)`, a generic remote-image-to-base64 fetch used by the cover-generation flow
    (see `catalog:fetch-image` below) — nothing RAWG-specific about it, it just lives here because this is
    the only file that does raw image fetches.
  - `tiendanubeService.js` — creates the product via Tiendanube's REST API (`TIENDANUBE_STORE_ID`,
    `TIENDANUBE_ACCESS_TOKEN`, `TIENDANUBE_USER_AGENT`), converting the plain-text description (`\n`-joined)
    to paragraph/`<br>` HTML. The generated cover (see below) is sent as `images[0].attachment` (base64,
    filename `portada.jpg`); the rest of the selected screenshots go as `images[n].src` (Tiendanube fetches
    those URLs itself). **Not yet verified against a real store** — built from the documented v1 contract
    but nobody has run it against live credentials yet, and the `attachment` base64-upload path in
    particular is unconfirmed. Re-check field names here first if product creation ever fails outright
    rather than with a normal API error.

**Renderer (`src/renderer/`):** plain Vue 3 SPA, no vue-router or state library. `App.vue` does manual
view switching via a `currentView` ref mapped to a `views` object (`home`, `scraper`, `settings`,
`favorites`, `whatsapp`, `notes`, `publish`); cross-component navigation happens through a custom
`window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view } }))` rather than props/emit.
All persistent client state is plain `localStorage`, no store:
- `sasito_settings` — theme, headless mode, timeout level, default export format, dollar rate/type.
- `sasito_favorites` — saved scraper configs (name/url/pages/etc.), managed from both `ScraperView` and
  `FavoritesView`.
- `sasito_sidebar_collapsed`, `sasito_pending_run` — misc UI/session state.

`PublishView.vue` is a 4-step wizard (form → candidates → ficha técnica → preview/publish), not a single
form — picking the right RAWG match and reviewing the generated description before publishing are required
confirmation steps, not optional polish. The description is a fixed template (mail-merge, no AI/LLM
involved) matching an exact format the client already uses for digital listings: a spec block (`JUEGO
DIGITAL`, `ESPACIO EN DISCO REQUERIDO`, `IDIOMA`, `DESARROLLADOR`, `EDICIÓN`, `FORMATO`, `PLATAFORMA`,
`GÉNERO`, `AÑO DE LANZAMIENTO`, `MULTIJUGADOR OFFLINE`, `ONLINE`) followed by two constant paragraphs
(install requirements, "send us your email/WhatsApp" instructions) — see `INSTALL_BLOCK`/`CONTACT_BLOCK`
in `PublishView.vue`. Only genre/year/developer/images are auto-filled from RAWG; disk space, language,
edition, and offline/online multiplayer are manually entered every time because they describe the specific
license being sold, not the game itself, and guessing them wrong is a real customer-facing risk. This view
is digital-only by design — it intentionally does not handle physical-copy fields (disc/case/manual
condition); the client still adds any *real product* photos manually from the Tiendanube web panel.

**Cover generation:** RAWG only has landscape screenshots/hero art, not official portrait box art, so the
"portada" shown to customers is generated client-side by compositing a banner (bottom gradient + game title
+ platform badge) onto RAWG's first image — see `composeCoverBanner()` in `PublishView.vue`, called
automatically after picking a candidate (`generateCover()`). This runs on an in-memory `<canvas>` in the
renderer, which means the source image can't be loaded via a plain cross-origin `<img src="https://...">`
(RAWG's CDN would taint the canvas and block `toDataURL()`). The workaround: the renderer asks the main
process to fetch the image bytes (`catalog:fetch-image` → `gameInfoService.fetchImageAsDataUrl`, no CORS
restriction outside a browser context) and hands back a `data:` URL, which *is* safe to draw on canvas.
Keep that fetch-in-main / composite-in-renderer split for any future image processing — don't try to load
remote images directly into a renderer canvas.

The top banner of the cover (platform logo/wordmark) prefers a real designed asset over the hand-drawn
fallback: `PublishView.vue` globs `src/renderer/assets/covers/*.{png,jpg,jpeg,webp}` via
`import.meta.glob` (empty/missing dir is fine, glob just yields nothing) and matches a file to the selected
platform by filename (`ps5.png` for platform `PS5`, case-insensitive). If a matching file exists, it's
drawn as the top banner scaled to the canvas width, with its own aspect ratio (clamped 8%–25% of the cover
height) determining how much of the image below it's cropped; otherwise `drawFallbackBar()` draws a plain
white bar with a generic triangle icon + text. No code changes needed to enable this — just drop
`ps3.png`/`ps4.png`/`ps5.png`/`pc.png` into that folder.

Path alias `@` → `src/renderer` (see `vite.config.js`). Vite root is `src/renderer`, build output goes to
`../../dist`. `__APP_VERSION__` is injected at build time from `package.json` version.

**Known duplication:** `server.mjs` (repo root) is a self-contained CLI re-implementation of the PS Store
scraper, older/simpler than `src/services/scraper.js` (different selectors, no currency handling, no date
scraping). It is not imported by the Electron app — treat it as a separate legacy entry point, not a
shared module. Don't assume a fix in one applies to the other.

**Env:** Firebase config is read from `VITE_FIREBASE_*` vars in `.env` (gitignored, loaded via
`envDir: process.cwd()` in `vite.config.js`) — those get inlined into the renderer bundle by Vite, which is
fine for a Firebase client config but is *not* the pattern to copy for real secrets. `RAWG_API_KEY` and
`TIENDANUBE_STORE_ID`/`TIENDANUBE_ACCESS_TOKEN`/`TIENDANUBE_USER_AGENT` are deliberately **not**
`VITE_`-prefixed: they're loaded only in the main process (`dotenv.config()` in `main.js`, reading `.env`
from `process.cwd()`) and reached from the renderer exclusively through IPC (`catalog:*` handlers in
`ipcHandlers.js`), so they never end up in `dist/assets/*.js`. Keep that split for any future secret — see
the `VITE_` prefix rule as the one thing not to imitate from the Firebase setup.
