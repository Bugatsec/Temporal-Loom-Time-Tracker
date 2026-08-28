# Temporal Loom — Stage 1 + Stage 3

Local-first, self-hosted time tracker. Stage 1 (Clockify-compatible
foundation) and the core of Stage 3 (analytics/date-range engine) are
implemented.

## Stack

- **Server:** Node.js + TypeScript + Express + SQLite (`better-sqlite3`)
- **Client:** React + TypeScript + Vite + React Router + Recharts

## Running it

```bash
npm install
cp server/.env.example server/.env
npm run dev   # API on :4310, client on :5173, both on 0.0.0.0
```

## Time Tracker (`/`)

- **Combined Project + Task picker** — no separate Activity page. Click it,
  search/select a project, expand to pick or create a task inline. Picking
  a project alone selects a hidden "General" task behind the scenes.
- **Tag picker** — icon button + search + checkbox list (matches Clockify),
  not an inline input box.
- **Grouping matches Clockify's real behavior**: same day + same project +
  same task + same description collapses into one row with a count badge
  and combined total. A different description is always its own row, even
  under the same project — this replaces an earlier version that grouped by
  project alone, which didn't match your screenshots.
- **Row layout**: count badge → description → project (dot + name) → tags →
  start–end time → total → play button → ⋮ menu (Edit / Delete).
- **Play button** replays that exact project/task/description/tags as a new
  running timer (stopping whatever's running first).
- **Inline editing** — ⋮ → Edit expands the row into an editable form
  (project/task, description, tags, start/end time as `<input type="time">`).
  Saving PATCHes the entry; duration and all totals recompute from the
  updated list, no page reload.
- **Boxed day/week layout** — each day is its own bordered box with a
  header (day name left, `Total: HH:MM:SS` right); days are grouped under
  "This week" / "Last week" sections with a `Week total:` header. Week
  starts Monday.

## Dashboard (`/dashboard`) and Reports (`/reports`)

Both now share one range-preset engine (`utils/range.ts`):
**Today, Yesterday, This week, Last week, This month, Last month, This
year, Last year, All time, Custom range** — plus prev/next arrows that
step by the preset's own unit (day/week/month/year; hidden for All
time/Custom, which don't have a meaningful "next").

- **Dashboard**: total time / top project / most-logged-activity stat
  cards, a stacked daily bar chart (segment per project, color-matched),
  and a donut + legend breakdown. Daily chart is capped at 366 bars for
  very large ranges (All time), switching to month-only x-axis labels
  past ~90 days.
- **Reports**: total + per-project breakdown table for the selected range.

## Stage 3 status — what's done vs. deferred

Done: the full date-range preset set (including All time), applied
consistently across Dashboard and Reports; interactive charts;
project-level drill-down (expand a group in Time Tracker/Time Entries to
see the underlying sessions).

Deferred (flagged, not silently skipped):
- **Hierarchical rollups** — child activities (`parent_id`) exist in the
  schema but nothing sums them into a parent's total yet.
- **Saved report views** — no way to save a range+filter combo yet.
- **CSV/HTML/PDF report export** — only whole-workspace JSON export exists;
  no per-report export in other formats.
- **True drill-down from any arbitrary aggregation node** — works for a
  project+task+description group on a given day; doesn't yet work as a
  general "click any total anywhere, see its entries" mechanism.

## Import from Clockify (Import/Export page)

Upload the CSV directly. Projects/tags matched by name or created; since
Clockify's "Task" field wasn't used in the sample export, entries land
under each project's "General" task with the real description/tags
intact. Re-uploading the same file is a safe no-op.

**Timestamps are converted using your browser's timezone** (sent
automatically with the upload) — this fixed an earlier bug where the
importer trusted the server's own system timezone (which defaults to UTC
here), producing wrong day-boundaries and inflated range totals.

If you already imported data with the old importer, delete
`server/data/` before re-importing — the old entries have the wrong
offset baked in and won't dedupe correctly against corrected ones.

## What's deliberately stubbed

- **Targets** — schema exists, no UI.
- **Activity colors** — schema exists, no picker (only projects/tags have one).
- **Calendar** page is a single-day grouped list, not a real calendar grid.
- **Settings/customization** page is a placeholder.
