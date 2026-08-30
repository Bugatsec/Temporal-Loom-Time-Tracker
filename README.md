# Temporal Loom

Local-first, self-hosted time tracker.

## Stack

- **Server:** Node.js + TypeScript + Express + SQLite (`better-sqlite3`) + pdfkit
- **Client:** React + TypeScript + Vite + React Router + Recharts

## Running it

```bash
npm install
cp server/.env.example server/.env
npm run dev   # API on :4310, client on :5173, both on 0.0.0.0
```

New in this pass: a `saved_views` table (added automatically via
`CREATE TABLE IF NOT EXISTS` in schema.sql — no migration needed, your
existing data is untouched) and a new server dependency (`pdfkit`, for
PDF report export) — `npm install` picks it up.

## Stage 3 — now actually complete

All six items from the doc's Stage 3 checklist:

| Item | Where |
|---|---|
| Full date-range presets, incl. All time | Dashboard + Reports, shared `utils/range.ts` |
| Interactive charts | Dashboard's stacked daily bar + donut |
| **Hierarchical rollups** | Reports → "By activity (rolled up)" — a parent task's total includes every descendant's time, computed recursively in `reportService.breakdownByActivityRollup`. Verified: a parent with 30m logged directly + a child with 45m shows 75m rolled up, the child still shows its own 45m. |
| **Drill-down** | Reports → click any project row to expand the exact underlying entries for that project + range, grouped the same way as the Time Tracker |
| **Saved report views** | Reports page — save the current range (preset or custom) under a name, recall or delete it later. Stored server-side (`saved_views` table), not per-browser. |
| **CSV / HTML / PDF export** | Reports page — three buttons next to the range picker. CSV and HTML are hand-built (no dependency); PDF is real, generated server-side with `pdfkit` and verified as a valid PDF document, not a print-to-PDF trick. |

## Make it your own tracker — Settings → Tracker features

Every Stage 3 feature above is individually toggleable from Settings, all
on by default:

- Dashboard charts
- Hierarchical rollups
- Drill-down
- Saved report views
- CSV / HTML / PDF export (each separately)

Turn off what you don't want — e.g. disable everything except the basic
totals for a minimal tracker, or leave it all on for the full analytics
suite. Stored in `localStorage` (`utils/featurePrefs.ts`), same pattern as
the existing sidebar Team/Clients toggles — it's a display preference, not
tracked data, so it doesn't touch the backend.

## Everything from previous passes (still true)

Combined Project+Task picker; tag hierarchy with sub-tags (Tags page +
picker both mirror the project/task pattern); goals (overall + per-project
daily targets, merged into one card with Today's total, compact mode
toggle); grouped/collapsible entry list with always-inline-editable fields;
Clockify CSV import with browser-timezone-aware conversion; Team/Clients
placeholder pages behind Settings toggles.

## What's deliberately stubbed

- **Targets** — schema exists, no UI. This is genuinely Stage 4 territory
  now (Life → Project → Target → Activity hierarchy) — the rollup and
  drill-down machinery built this pass is what Stage 4 will extend down to
  the Target level.
- **Activity colors** — schema exists, no picker.
- **Calendar** page is a single-day grouped list, not a real calendar grid.
- Saved views apply to Reports only, not Dashboard's range picker.
