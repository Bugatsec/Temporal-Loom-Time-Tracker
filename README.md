# Temporal Loom

Local-first, self-hosted time tracker.

## Stack

- **Server:** Node.js + TypeScript + Express + SQLite (`better-sqlite3`)
- **Client:** React + TypeScript + Vite + React Router + Recharts

## Running it

```bash
npm install
cp server/.env.example server/.env
npm run dev   # API on :4310, client on :5173, both on 0.0.0.0
```

If you already have a `server/data/tracker.db` from before this update:
tags now support a `parent_id` column and there's a new `goals` table.
Both are added automatically on next boot (`src/db/migrations.ts` for the
column, `schema.sql`'s `CREATE TABLE IF NOT EXISTS` for the new table) —
no manual action needed, your existing data is untouched.

## What changed in this pass

**Visual bugs fixed:**
- A stale, duplicate `.entry-row` CSS block (left over from an earlier
  revision) was silently overriding the grid layout with flexbox
  `space-between`, which is what caused the tag/time/play/project columns
  to drift out of alignment between rows. Deleted the dead block; the
  entry-row grid now uses fixed-width columns everywhere so every row lines
  up regardless of content (empty tags, no time range shown for merged
  groups, etc). Text is left-aligned throughout.
- The tag-picker button was a Unicode emoji glyph, which renders
  inconsistently (that was the "glitched" look) — replaced with an inline
  SVG icon, and it's now always the same accent yellow as the "+ Project"
  button rather than only lighting up once tags are selected.
- Dashboard's daily-bar tooltip listed every project (including ones
  logging 0.00h that day) because Recharts renders one payload row per
  `<Bar>` regardless of value. Replaced the default tooltip with a custom
  one that filters to only projects actually logged that day.

**Layout:**
- `.main`'s max-width went from 980px to 1440px — the app was leaving
  roughly half a widescreen monitor empty. Extra width goes to breathing
  room, not more content crammed in.
- Sidebar: Dashboard is now an expandable parent; Calendar and Reports
  live nested underneath it as a collapsible sub-list, auto-expanding
  when you're on any of the three routes.
- The Activities page is gone — task management lives entirely in the
  Project+Task picker now.

**Time Tracker — fully inline-editable entries:**
Every field in an expanded entry row is directly editable now, no
separate "Edit mode" to enter first — description and start/end time are
low-chrome inputs (invisible border until you hover/click, so they read
as plain text at rest, become an editable field the moment you touch
them), project/task and tags use their existing picker buttons directly
in the row. Each field saves independently on blur/change.

**Goals:**
- Settings page: set an overall daily target (e.g. "6h") and optional
  per-project targets (e.g. "Hunting: 4h").
- Time Tracker page: a Goals card shows today's logged time against each
  target with a progress bar — `2h30m / 4h00m` style, for both the
  overall total and each project with a goal.
- New `goals` table: one row for the overall goal (`project_id IS NULL`),
  one row per project goal. Upserted, not duplicated, on repeated saves.

**Tags now work like Projects:**
- Full CRUD (create, rename, recolor — palette + custom color picker —
  delete) via the new Tags page (Manage → Tags).
- Tags can have sub-tags (`tags.parent_id`, same nesting pattern as
  `activities.parent_id`) — add one inline from the Tags page.
- Deleting a parent tag un-parents its children rather than deleting them.

## Stage 3 status (unchanged from before, still accurate)

Done: full date-range presets (Today/Yesterday/This week/Last
week/This month/Last month/This year/Last year/All time/Custom) shared
between Dashboard and Reports, with prev/next stepping; interactive
stacked-bar + donut charts; project+task+description-level drill-down.

Deferred: hierarchical rollups (child activities/tags don't sum into a
parent total anywhere yet), saved report views, CSV/HTML/PDF report
export (only whole-workspace JSON export exists).

## Import from Clockify

Import/Export page, upload the CSV directly. Timestamps are converted
using your browser's timezone (sent automatically), not the server's —
this matters if your server's system timezone differs from your actual
one. Re-uploading the same file is a safe no-op.

## What's deliberately stubbed

- **Targets** — schema exists, no UI.
- **Activity colors** — schema exists, no picker (projects and tags have one).
- **Calendar** page is a single-day grouped list, not a real calendar grid.
- Tag hierarchy is supported in the Tags management page and the data
  model, but the Timer/entry TagPicker's checklist is still flat (doesn't
  visually nest sub-tags under their parent yet).
