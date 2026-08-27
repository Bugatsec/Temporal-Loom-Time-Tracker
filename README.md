# Temporal Loom — Stage 1

Local-first, self-hosted time tracker. This is the **Stage 1: Clockify-compatible
foundation** build — a working timer, projects, tasks, tags, time entries,
Clockify CSV import, and a real analytics dashboard.

## Stack

- **Server:** Node.js + TypeScript + Express + SQLite (`better-sqlite3`)
- **Client:** React + TypeScript + Vite + React Router + Recharts

## Project layout

```
server/
  src/db/          schema.sql, ULID generator, sqlite client, migrations.ts
  src/models/       workspace, project, activity, tag, timeEntry
  src/services/      reportService, exportService, csv.ts, importClockify.ts
  src/routes/       REST endpoints under /api/v1 (projects, activities, tags,
                     time-entries, reports, exports, imports)
  src/index.ts       app entry point
client/
  src/api/          typed fetch client + shared types
  src/context/       TimerContext — global running-timer state + live tab title
  src/components/    Sidebar, Timer, ProjectTaskPicker, Combobox, TagInput,
                     GroupedEntryList, ColorDot
  src/pages/          TimeTracker (/), Dashboard (/dashboard), TimeEntries,
                       Projects, Activities, Calendar, Reports, ImportExport,
                       Settings
```

## Running it

```bash
npm install                # from the repo root — installs both workspaces
cp server/.env.example server/.env
npm run dev                # API on :4310, client on :5173, both bound to
                            # 0.0.0.0 so other devices on your LAN can reach it
```

## What's here

- **Time Tracker** (`/`) — the actual tracking UI: a timer bar and a grouped
  list of recent entries. This used to be called "Dashboard"; that name now
  belongs to the analytics page, matching Clockify's own split.
- **Dashboard** (`/dashboard`) — analytics: total time / top project / most
  logged activity for the selected range, a stacked daily bar chart (one
  color segment per project), and a donut + legend breakdown. Toggle
  week/month and step through periods with the arrows.
- **Combined Project + Task picker** — one control instead of two dropdowns.
  Click it to search/select a project; expand a project to pick or create a
  task under it inline (Clockify calls tasks "Tasks", we call the underlying
  column `activities` — same thing). Picking a project with no task selects
  a hidden "General" task behind the scenes so the data model still always
  has a concrete activity_id; the UI just doesn't show "General" anywhere.
  Selecting `Project: Task` renders as e.g. `Hunting: Recon`.
- **Grouped, collapsible entry list** — entries are grouped by day, then by
  project+task within the day. Two "Hunting" sessions in a day show as one
  row with a count badge and the combined total; click to expand and see
  each session's individual start/end time, description, and tags.
- **Play/replay button** — every summary row and every expanded entry has a
  ▶ button that instantly starts a new timer with that exact project, task,
  description, and tags (stopping whatever's currently running first, same
  as Clockify).
- **Tags and project colors**, both with a full custom color picker (preset
  swatches + a native color wheel) in addition to the auto-assigned palette.
- **Clockify CSV import** (Import/Export page) — upload the export directly.
  Projects/tags are matched by name or created; since Clockify's "Task"
  field wasn't used in the sample export, entries land under each project's
  "General" task with the real description/tags intact. Re-uploading the
  same file is a safe no-op. Timestamps are converted using **your browser's
  timezone** (sent automatically with the upload), not the server's system
  timezone — this fixes an earlier version that produced wrong totals when
  the two didn't match.
- Soft delete, daily/weekly/monthly report totals, full JSON export.

All of the above was smoke-tested end-to-end against the running server,
including a full year's Clockify import (1240 rows → 1238 entries, 2 correctly
-flagged duplicates, idempotent on re-import, correct UTC conversion verified
against a known IST timestamp).

## If you already imported data with the old (buggy) importer

An earlier version of the importer trusted the *server's* system timezone
instead of your browser's, which silently mis-dates entries if the two don't
match (yours didn't — the server defaults to UTC). That's now fixed, but your
existing `server/data/tracker.db` still has the old, wrongly-shifted
timestamps in it. Before re-importing:

```bash
rm -rf server/data
```

Then restart the server and re-upload your CSV — it'll come in with correct
timestamps this time.

## What's deliberately stubbed

- **Targets** exist in the schema but have no UI yet.
- **Activity colors** — the column exists (like projects) but there's no
  picker for it yet.
- **Calendar** page is a single-day grouped list, not a real calendar grid.
- **Settings/customization** page is a placeholder.
- Dashboard's daily chart always shows every day in the selected range
  (even zero-activity days) for a continuous x-axis, matching Clockify.
