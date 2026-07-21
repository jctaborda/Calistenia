# AGENTS.md

## Project Overview

Vanilla JavaScript PWA for calisthenics training. No bundler, no framework — pure ES modules loaded directly by the browser. Express 5.1 serves static files over HTTPS with self-signed certs.

## Dev Commands

```bash
npm run lint          # ESLint on js/
npm run format        # Prettier on entire repo
npm run test          # Vitest in watch mode (jsdom)
npm run test:run      # Single vitest run
npm run test:coverage # Coverage report (v8 provider)
npm run test:e2e      # E2E tests only (tests/e2e/)
npm start             # HTTPS dev server at https://localhost:3000
npm run update-sw     # Bump service worker cache version (git hash or timestamp)
```

Recommended order before changes: `lint -> test:run`

## Architecture

- **Entry point**: `js/main.js` — hash-based SPA router
- **Views**: `js/views/` (23 view modules, each exports a `render*View` function)
- **Services**: `js/services/` (29 modules — state, DB, API, timers, achievements, i18n, etc.)
- **Components**: `js/components/` (header, spinner, install-banner, ai-feedback-overlay)
- **Utilities**: `js/utils/` (helpers, formatters, DOM optimizer, date formatter)
- **Data**: `data/` — JSON files for exercises, routines, skill modules
- **Admin tool**: `admin.html` — web UI for editing data (uses PUT endpoints on the Express server)
- **Single CSS file**: `css/style.css` (no preprocessor)

## Bilingual i18n

The app supports English and Spanish. All UI strings go through `t()` from `js/i18n.js` (1282+ keys). Data files come in pairs: `data.json` / `data-es.json`, `skill-modules.json` / `skill-modules-es.json`.

Tests `tests/unit/i18n-key-parity.test.js` and `tests/unit/data-locale-parity.test.js` verify that EN and ES keys stay in sync. When adding a new i18n key, add it to both `en` and `es` sections in `i18n.js`.

## Testing

- Framework: **Vitest 4.x** with `jsdom` environment
- Config: `vitest.config.js` — globals enabled, 5s timeout, mocks auto-reset
- Setup: `tests/setup.js` — mocks localStorage, IndexedDB, requestAnimationFrame, FileReader
- Test structure: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- Coverage excludes: `node_modules/`, `tests/`, `scripts/`, `server.js`, `sw.js`, `**/*.html`
- `tests/mocks/` and `tests/fixtures/` directories exist but are empty
- Run a single test file: `npx vitest run tests/unit/state.test.js`

## Code Style

- Single quotes, 2-space indent, semicolons, trailing commas (es5), 100 char print width
- `no-var: error`, `eqeqeq: error`, `prefer-const: warn`, `no-undef: off`
- ESLint extends `eslint:recommended` — no TypeScript, no JSX
- Browser + Node env enabled simultaneously

## Data Editing Flow

Data lives in `data/*.json` files. After modifying them, restart the server to pick up changes. The `admin.html` page provides a web UI that calls `PUT /data/data-es.json` and `PUT /data/skill-modules-es.json` endpoints on the Express server.

## Service Worker

`sw.js` has a version string (`const VERSION = 'commit-...'`) that must be updated for cache invalidation. Run `npm run update-sw` (or `npm run build` which calls it as a prebuild step) to inject the current git hash. The `sw.js` APP_SHELL list must be kept in sync with actual file paths — adding or removing core files requires editing this list manually.

## Gotchas

- The `.gitignore` is aggressive: it ignores `server.js`, `scripts/`, `admin.html`, `package*` (lock file too), `Backup-old/`, `.vscode/`, `.continue/`, `.context/`, and `src/`. Many files that would normally be tracked are not in git.
- SSL certs (`localhost*.pem`) are committed but ignored by `.gitignore` via pattern — regenerate with openssl if missing.
- The server reads `localhost+2.pem` / `localhost+2-key.pem` (not `localhost.pem`).
- No CI/CD pipeline, no GitHub Actions, no Docker config.
- MediaPipe vision models are bundled locally in `assets/mediapipe/` and `wasm/` (not fetched from CDN).
