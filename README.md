# Bug Bounty / Life — Stage 1

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

- Create a project and activity — inline, from combobox fields on the timer bar
  or the manual-entry form. No separate "create project" page required; typing
  a name that doesn't exist yet creates it, typing one that does just selects it
  (case-insensitive).
- Start/stop a timer; only one timer can run at a time (409 on conflict)
- **Live browser tab title** while a timer runs — e.g. `34:22 - Bug Bounty / Life`
  (no leading `00:` hour), ticking every second regardless of which page inside
  the app is open, as long as the tab itself is open (`TimerContext`, mounted
  above the router)
- **Projects have colors** — auto-assigned from a palette on creation, changeable
  from the Projects page; a colored dot renders next to the project name
  everywhere it appears (comboboxes, entry list, Projects page)
- **Tags with colors** — same type-to-create combobox pattern, rendered as
  colored pills on entries
- Manual time entry creation and editing
- Soft delete (entries are recoverable, never hard-deleted from the UI)
- Daily/weekly/monthly totals and a per-project breakdown
- Full-workspace JSON export, versioned (`schema_version`)
- **Clockify CSV import** (Import/Export page) — upload the export file directly;
  projects/tags are matched by name or created; since Clockify's "Task" field
  wasn't used in the sample export, imported entries land under a per-project
  "General" activity, with the real description and tags preserved. Re-uploading
  the same file is a safe no-op — already-imported entries are detected by
  project+activity+start+end and skipped.

All of the above was smoke-tested end-to-end against the running server,
including a real import of a full year's Clockify export (1240 rows → 1238
entries, 2 correctly-flagged duplicates, idempotent on re-import).

**One caveat on the importer:** Clockify's CSV has no timezone info — just
`DD/MM/YYYY` + `HH:MM:SS`. The importer converts these using the *server's*
local timezone (via JS `Date` component construction, not string parsing), so
imported timestamps will be correct only if the machine running this server is
set to the same timezone your Clockify account used. Worth checking
`timedatectl` before importing for real.

## What's deliberately stubbed

- **Targets** exist in the schema (`target_id` is part of the minimum
  time-entry fields per doc §3.2) but there's no UI for them yet — Stage 1
  doesn't require them.
- **Calendar** page shows a day's entries in a list, not a real calendar grid.
- **Settings/customization** page is a placeholder — that's Stage 5 scope.
- **Child activities** (`parent_id`) are supported in the schema for the
  Recon → Subdomains/Port scanning/Technology nesting shown in the doc, but
  there's no UI to create a nested activity yet — `api.activities.create`
  already accepts a `parent_id` if you want to wire it up.
- **Activity colors** — the column exists (same as projects) but there's no
  picker for it yet; only projects and tags have a color UI right now.

## Database

Schema lives in `server/src/db/schema.sql` and is applied automatically on
server start (or manually via `npm run db:migrate`). The SQLite file is
written to `server/data/tracker.db` and is gitignored — it's your data, not
a build artifact.

If you already have a `data/tracker.db` from before tags existed, it's fine —
`server/src/db/migrations.ts` runs an additive `ALTER TABLE` on boot to add
the new column, so nothing needs to be deleted or recreated.
