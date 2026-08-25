# Temporal Loom — Stage 1

Local-first, self-hosted time tracker. This is the **Stage 1: Clockify-compatible
foundation** build described in the product doc — a working timer, projects,
activities, time entries, basic reports, and JSON export. Stages 2–5 (Clockify
import, full analytics engine, Life/Target hierarchy, and the customization
system) are referenced in code comments where the schema already anticipates
them, but are not implemented here.

## Stack

- **Server:** Node.js + TypeScript + Express + SQLite (`better-sqlite3`)
- **Client:** React + TypeScript + Vite + React Router
- SQLite was chosen over Postgres for Stage 1 because the doc explicitly
  allows it for single-user portable installs (§10), and it needs zero setup
  for a self-hosted single-user deployment. The domain model doesn't change
  if you move to Postgres later.

## Project layout

```
server/
  src/db/          schema.sql, ULID generator, sqlite client, migration script
  src/models/       data access: workspace, project, activity, timeEntry
  src/services/      reportService (totals/breakdown), exportService (JSON export)
  src/routes/       REST endpoints, mounted under /api/v1
  src/index.ts       app entry point (binds to 127.0.0.1 by default)
client/
  src/api/          typed fetch client + shared types
  src/components/    Sidebar, Timer (live-ticking start/stop), EntryList
  src/pages/          Dashboard, TimeEntries, Projects, Activities, Calendar,
                       Reports, Settings, ImportExport — the 8 Stage 1 screens
```

## Running it

```bash
npm install                # from the repo root — installs both workspaces
cp server/.env.example server/.env
npm run dev                # starts the API on :4310 and the client on :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Express
server, so you don't need CORS config for local dev.

To run just one side: `npm run dev:server` or `npm run dev:client`.

## What's implemented (Stage 1 acceptance criteria)

- Create a project and activity
- Start/stop a timer; only one timer can run at a time (409 on conflict)
- Manual time entry creation and editing
- Soft delete (entries are recoverable, never hard-deleted from the UI)
- Daily/weekly/monthly totals and a per-project breakdown
- Full-workspace JSON export, versioned (`schema_version`) so a later
  importer can read it back in

All of the above was smoke-tested against the running server (project/activity
CRUD, timer start/stop/conflict, reports, export) — see the commit history or
ask for the test transcript if you want to rerun it yourself.

## What's deliberately stubbed

- **Targets** exist in the schema (`target_id` is part of the minimum
  time-entry fields per doc §3.2) but there's no UI for them yet — Stage 1
  doesn't require them.
- **Calendar** page shows a day's entries in a list, not a real calendar grid.
- **Import** (Clockify) is a labeled no-op — that's explicitly Stage 2 scope.
- **Settings/customization** page is a placeholder — that's Stage 5 scope.
- **Child activities** (`parent_id`) are supported in the schema for the
  Recon → Subdomains/Port scanning/Technology nesting shown in the doc, but
  there's no UI to create a nested activity yet — `api.activities.create`
  already accepts a `parent_id` if you want to wire it up.

## Database

Schema lives in `server/src/db/schema.sql` and is applied automatically on
server start (or manually via `npm run db:migrate`). The SQLite file is
written to `server/data/tracker.db` and is gitignored — it's your data, not
a build artifact.
