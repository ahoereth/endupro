# endupro

Browser-only endurance dashboard for Intervals.icu data.

## Architecture

- SvelteKit + TypeScript frontend, shipped as a static site.
- Client-only runtime: no endupro backend API server and no SSR dependency for app behavior.
- Intervals.icu sync, enrichment, and derived-metric computation run inside a Web Worker through Comlink.
- Persistent browser storage:
  - `localStorage` for API key, HR-zone overrides, and UI preferences
  - IndexedDB via Dexie for synced activities, sync metadata, and derived cache entries

## Current Feature Set

- Incremental `Update` sync and full-history `Fetch All` / `Reload All`
- Auto-update on open when an API key exists and local data has not been synced today
- Rolling load series and tolerance panel
- Range Foundations summary panel
- Recent activities search and multi-select behavior
- Comparable-runs pace/HR scatter view
- Pace-bin HR heatmap
- Activity detail drawer with baseline context, intervals, and kilometer splits
- Threshold-based running HR zones with local override support
- URL restore for `?activity=<id>`

## Fresh-Start Migration

This app no longer reads `data/settings.json` or `data/activities.json`.

- Existing repo-local JSON files are ignored
- Upgrading to the static app starts from empty browser storage
- Users must save their API key again in the browser and run a fresh sync

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Validation commands:

```bash
npm run lint
npm run format:check
npm run check
npm run test
npm run build
```

## Git Hooks

- `.husky/pre-commit` runs `lint-staged`
- `.husky/pre-push` runs `npm run check`, `npm run build`, and `npm run test`

Run `npm install` once to activate Husky hooks locally.

## GitHub Pages

The repo is configured for the native GitHub Pages Actions flow.

- CI workflow: `.github/workflows/ci.yml`
- Pages deploy workflow: `.github/workflows/deploy-pages.yml`
- Production builds use the repository base path `/edupro`
- `adapter-static` emits `404.html` for SPA fallback and `static/.nojekyll` is included for Pages hosting

Repository settings should point Pages to the GitHub Actions deployment source.

## Manual Validation Checklist

- Save an API key and confirm browser reload keeps it locally
- Run `Update` against an account with existing activities
- Run `Fetch All` / `Reload All`
- Confirm `Clear Activities` keeps the API key
- Confirm `Delete All Data` wipes browser-side settings and data
- Open an activity via the recent list and reload with `?activity=<id>`
- Check mobile navigation drawer and activity detail drawer behavior
