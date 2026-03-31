# endupro

Local personal dashboard for endurance running data.

## What this version does

- Stores your Intervals.icu API key and local HR-zone override settings in `data/settings.json`.
- Pulls your run activities from Intervals.icu into `data/activities.json`.
- Computes and charts 7, 14, 30, 90, and 180-day rolling sums of distance in km.
- Computes and charts a 30-day moving average of the 7-day sum (`sum7ma30`) for smoother trend context.
- Computes and charts a 90-day moving average of the 7-day sum (`sum7ma90`) for long-term trend context.
- Computes and charts a distance-based `Tolerance km (model)` line from all available history.
- Shows the most recent 90 days by default and provides a dual-handle timeline scrubber (start/end) to inspect any range.
- Shows a Running Tolerance indicator (Stable/Caution/High Risk) based on run-km ACWR, weekly ramp, and monotony.
- Plots a Tolerance line (ACWR) over time on a secondary chart axis.
- Plots a 10% ramp cap line for weekly load (`1.10 * previous 7-day sum`) on the km axis for visual comparison.
- Adds long-term tolerance measures: 4-week ramp vs prior 4-week average and recent >10% week-over-week breach count.
- Adds a Heart Rate vs Pace scatter chart using interval-split points first, then per-km split points, then run-level fallback, with a trend line and Pearson correlation (`r`) for the currently selected timeline range.
- Includes a dedicated help section explaining ACWR, ramp, monotony, and interpretation guidance.
- Shows a monotony gauge (0-3+ scale with risk zones) in the tolerance panel for faster interpretation.
- Runs as a local single-user app with no external database.
- Sync lookback supports `All data` (from first activity) plus multi-year ranges up to 3650 days (10 years), and the chart renders the full synced lookback window.
- Default `Update` is incremental: it fetches activities from the last synced date (inclusive) to today and merges into local history.
- `Sync Range` is available when you explicitly want to re-sync a lookback window/all data.

## Run locally

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

`npm start` now runs in dev watch mode:
- server restarts automatically when `server.js` or files in `public/` change
- browser auto-refreshes when the server restarts, restoring in-page state and scroll position

If you want a plain non-watch server process:

```bash
npm run start:server
```

## Notes

- This uses basic auth with `API_KEY:<your api key>` against:
  - `GET https://intervals.icu/api/v1/athlete/0/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD`
- Activity distances are interpreted as metric and converted to kilometers.
- Interval split heart rate/pace points are read from Intervals activity details (`?intervals=true`) when available; if absent, per-km points are derived from activity streams (`distance`, `time`, `heartrate`), then run-level points are used as fallback.
- Running HR zones are always kept as a 5-zone model derived from running lactate-threshold HR (`lthr`) using 85/90/95/100% cutoffs. Explicit HR-zone boundaries from Intervals.icu are ignored.
