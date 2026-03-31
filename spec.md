# Fitboard Current Functionality Spec

## App + Storage
- Local single-user web app served by `server.js` (Node HTTP server), no external DB.
- Persistent files in `data/`:
  - `data/settings.json` stores Intervals.icu API key plus local running LTHR / HR-zone overrides.
  - `data/activities.json` stores:
    - `syncedAt`
    - `lookbackMode` (`days` or `all`)
    - `lookbackDays` (number or `all`)
    - normalized/enriched run activities
- Static assets are served from `public/`.
- API routes are under `/api/*`.

## Intervals.icu Sync Model
- Sync source: `GET /api/v1/athlete/0/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD` (Basic auth `API_KEY:<key>`).
- Run filtering: only run activities are kept.
- Two sync modes are supported on `POST /api/sync`:
  - `mode: "update"` (default for UI Update + auto-update):
    - fetches from `min(last-known-activity-day, today-30d)` through today (inclusive)
    - guarantees at least a 30-day refresh window even when recent data already exists
    - merges fetched activities into existing local history by activity ID
  - `mode: "fetch-all"`:
    - fetches full history (`oldest=1970-01-01` through today)
    - replaces local activity set with that normalized full-history result (reload-all behavior when data already exists)
- Sync response includes:
  - `syncMode`, `syncOldestDate`, `syncNewestDate`
  - `count` (post-sync total stored activities)
  - `fetchedCount` (activities returned in this fetch window)
  - split build stats (`splitPoints`, rebuilt/cached/failed counts)
  - `runningThresholdHr` when Intervals.icu athlete profile exposes running threshold/LTHR

## Auto Update On Open
- On boot, if API key exists and `syncedAt` is not today (local day), app auto-runs update mode.
- Manual controls in connection card:
  - `Update` button: update mode (recent refresh from last-known day with minimum 30-day window)
  - `Fetch All` button: full-history load when empty, relabeled `Reload All` once data exists

## Activity Enrichment + Pace/HR Point Sources
- Per-activity details fetch:
  - `GET /api/v1/activity/{id}?intervals=true`
  - used to refresh metadata (`name`, `startDateTime`, moving time, elevation, temp)
  - used to build interval points from `icu_intervals`
- Stream fetch:
  - `GET /api/v1/activity/{id}/streams.json?types=distance,time,heartrate`
  - used to derive per-km split points
- Stream handling:
  - handles object and array stream payload shapes
  - normalizes units and fills cumulative distance gaps for null/missing samples
  - derives split buckets by kilometer; includes final partial bucket when meaningful
- Source preference for HR-vs-pace points:
  - interval points first
  - but splits are preferred when interval detail is coarse (`<= 2` usable intervals) or splits are richer
  - run-level fallback only when no usable interval/split points
- Interval preservation behavior:
  - all `icu_intervals` entries are preserved for activity detail display
  - only chart-eligible interval entries (valid pace + HR) are used for HR-vs-pace plotting
- Running HR zones:
  - target model is always 5 zones
  - running LTHR/threshold HR is the only source of truth for running HR zones
  - zones are always synthesized at 85/90/95/100% of threshold
  - explicit running HR-zone boundaries from Intervals.icu are ignored
  - local settings can override threshold HR and/or individual zone min/max values
- Enrichment reliability:
  - retry/backoff for per-activity detail/stream fetches
  - transient per-activity failures preserve prior cached state instead of zeroing data

## Backend Series Computation
- Daily run distance is aggregated and backend computes:
  - `dayKm`
  - `sum7`, `sum14`, `sum28`, `sum30`, `sum90`, `sum180`
  - `sum7ma30` (30d avg of 7d sum)
  - `sum7ma90` (90d avg of 7d sum)
  - `toleranceKmModel` (distance tolerance model)
- `toleranceKmModel` is weekly-updated and uses:
  - long/recent blend (26w and 4w)
  - asymmetric weekly caps (+10% up, -2% down)
  - no-drop grace window

## Layout + Main UI
- Two-column layout:
  - Left: Intervals connection + sync controls, recent activities list
  - Right: timeline card, running tolerance card, foundational stats, rolling sums chart, HR-vs-pace chart, pace-bin heatmap, help card
- Connection card shows:
  - last sync timestamp
  - most recent activity name and date/time

## Timeline + Range Behavior
- Timeline controls are in their own right-column card:
  - dual-handle range slider
  - presets: last 30/90/180 days, last year, all
- Timeline view persistence:
  - stores either absolute dates or "latest window" (`last X days`) semantics
  - if latest day is included, stored as latest window so post-sync range shifts forward automatically
- Recent activity list is filtered to active timeline range.

## Recent Activities List
- Shows activities in active timeline range (newest first).
- Includes fzf-style fuzzy search input.
- Multi-select behavior:
  - plain click: select only clicked activity (or unselect if it is the only selected one)
  - `Shift` click: range selection between anchor and target
  - `Alt/Option` click: additive toggle selection
  - `Shift + Alt/Option`: add selected range to existing selection

## Rolling Sums Chart
- Line chart with legend toggles.
- Default visible lines:
  - `sum7`
  - `sum7ma90`
- Additional lines can be toggled from legend (`toleranceKmModel`, `sum7ma30`, `sum14`, `sum30`, `sum90`, `sum180`).
- Extra legend toggle for cap line:
  - `10% cap (90d avg +10%)`
- Hover interaction:
  - vertical guide line
  - per-visible-series hover dots
  - cap hover dot/value when enabled
  - tooltip + header summary context
- Selected activities are highlighted in rolling chart using vertical markers on corresponding dates.

## Running Tolerance Card
- Status derived from current endpoint in selected range:
  - `Below Baseline`, `Near Cap`, `Above Cap`, or `Insufficient Data`
- Core values:
  - 7d load
  - 90d baseline (`sum7ma90`)
  - +10% cap (`1.1 * baseline`)
  - load-vs-baseline text includes delta and cap context
- Monotony shown as gauge:
  - definition: mean(dayKm over last 7 days) / stddev(dayKm over last 7 days)
  - zones: green `<=1.5`, yellow `1.5-2.0`, red `>2.0`

## Heart Rate vs Pace Chart
- Scatter plot over active timeline range using mixed point sources:
  - interval points, km-split points, run-level fallback
- X-axis is reversed to match pace interpretation (right = faster).
- Includes:
  - linear trendline
  - Pearson correlation (`r`) with strength + direction text
  - progress summary (trend-based HR@pace / pace@HR signals)
- Selection integration:
  - selected activities are emphasized with outlined bubbles
- Comparable Runs mode:
  - optional filter to runs comparable to reference run (selected run or latest in range)
  - strictness levels: loose/normal/strict
  - persistent setting in localStorage
- Inline color scale controls:
  - dual-handle slider integrated in scale bar
  - live recoloring while dragging
  - shades of blue map to date range window
- Pace range slider:
  - dual-handle
  - orientation matches chart direction (reversed pace axis)

## Pace-Bin HR Heatmap
- Weekly pace-bin matrix with average HR per bin cell.
- Bin size selectable (`15s`, `30s`, `60s` per km).
- Inline dual-handle color scale controls:
  - moves min/max HR color bounds
  - recolors cells live during drag
- Selection integration:
  - selected activities’ bins are outlined.

## Foundational Stats Box
- Summarizes runs in selected timeline range.
- Includes distributions and summaries for:
  - distance
  - pace (split-aware when available)
  - duration
  - start hour (daytime)
  - weekday

## Activity Detail Drilldown
- Clicking activity detail opens the detail pane with:
  - summary metrics
  - baseline context for that activity date
  - interval table (all preserved interval entries)
  - kilometer split table (when available)
  - direct link: `Open on Intervals.icu`

## Frontend Persistence
- Local storage persists:
  - visible rolling lines
  - extra line toggles (cap line)
  - timeline range mode
  - pace axis range
  - HR-vs-pace color range
  - comparable-runs settings
- URL query parameter persistence:
  - selected activity id is stored in `?activity=<id>`
  - selected activity is restored from URL on reload

## Dev Live Reload (Development)
- `npm start` runs server in watch mode and enables dev reload endpoints.
- Server exposes:
  - `GET /api/dev/reload-meta`
  - `GET /api/dev/reload-events` (SSE)
- Frontend listens for reload-token changes and auto-refreshes on restart.
- Dev reload snapshot/restore preserves transient UI state:
  - page scroll
  - recent list scroll
  - search query
