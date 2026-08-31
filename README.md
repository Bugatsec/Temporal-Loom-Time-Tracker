# Temporal Loom

![Node](https://img.shields.io/badge/node-18%2B-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Express](https://img.shields.io/badge/Express-4-black)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003b57)
![License](https://img.shields.io/badge/license-personal--project-lightgrey)

Temporal Loom is a local first, self hosted time tracker built as a Clockify compatible alternative you run yourself. It lives entirely on your own machine: no account, no cloud sync, no third party server ever sees your data. It is aimed at solo use, originally built for tracking bug bounty work and personal life projects side by side, but works for any kind of time tracking.

This README documents every feature that exists in the app today, how to run it, and how to use each part of it.

## Table of contents

- Stack
- Getting started
- Running on your network
- Data and privacy
- Core concepts
- Time Tracker
- Grouped entries and inline editing
- Projects and tasks
- Tags and sub-tags
- Goals
- Dashboard
- Reports
- Saved views
- Report export
- Calendar
- Settings
- Tracker features toggle
- Team and Clients placeholders
- Importing from Clockify
- Data export
- API reference
- Project structure
- What is intentionally not built yet

## Stack

Server: Node.js, TypeScript, Express, SQLite through better-sqlite3, pdfkit for PDF generation.

Client: React, TypeScript, Vite, React Router, Recharts for charts.

The two run as separate processes from one repository using npm workspaces: `server` and `client`.

## Getting started

Requirements: Node.js 18 or newer, npm.

```
npm install
cp server/.env.example server/.env
npm run dev
```

This starts the API server on port 4310 and the Vite dev server on port 5173, both bound to 0.0.0.0. Open `http://localhost:5173`.

To run only one side: `npm run dev:server` or `npm run dev:client`.

To build for production: `npm run build`, which builds both workspaces.

## Running on your network

Both the server and the client dev server bind to 0.0.0.0 by default, so any device on the same network can reach the app at your machine's local IP address, for example `http://192.168.1.20:5173`. This is controlled by `HOST=0.0.0.0` in `server/.env` and `host: true` in `client/vite.config.ts`. If you want the server reachable only from the same machine, set `HOST=127.0.0.1` in `server/.env` and remove `host: true` from the Vite config.

There is no authentication built in. Anyone who can reach the address can read and write your data. This is fine on a trusted home network and not fine on an untrusted one.

## Data and privacy

All data lives in a single SQLite file at `server/data/tracker.db`. This file is gitignored and is never sent anywhere. There is no telemetry, no analytics, no external API calls except the ones you explicitly trigger, such as importing a Clockify CSV you provide yourself.

## Core concepts

The data model has five main entities.

Project: a top level bucket of work, for example Bug Bounty or Life. Has a name and a color.

Task, called an activity internally: a specific kind of work inside a project, for example Recon or Reporting. Tasks can have sub-tasks, since `activities.parent_id` lets one task nest under another. Every project always has a hidden fallback task called General that is used whenever you track time on a project without picking a specific task, so you never have to think about it.

Tag: a label you can attach to any time entry, independent of project or task, for example Reading or CTF. Tags can have sub-tags the same way tasks can.

Time entry: a single tracked interval, with a start time, an end time, an optional description, a project, a task, and any number of tags.

Goal: an optional daily time target, either an overall target for the whole day or a target scoped to one project.

## Time Tracker

This is the home page and the default view when you open the app.

At the top is the timer bar. Click the project and task picker, search or browse to a project, optionally expand it to pick or create a task, then optionally add a description and tags, then press Start. The timer begins immediately and the elapsed time updates every second. While a timer is running, the browser tab title also updates live, for example `34:22 - Temporal Loom`, so you can see elapsed time even when the tab is in the background. Press Stop to end the session.

Below the timer is either a simple Today total, or, once you have set at least one goal in Settings, a merged card showing today's total on the left, a thin divider, and a Goals panel on the right with progress bars for the overall goal and any per project goals. The Goals panel has a Compact toggle in its corner that switches between the full label plus numbers layout and a smaller percentage only layout.

Below that is the entry list for the last two weeks, organized into This week and Last week sections, each broken into day boxes. Each day box header shows the day name on the left and the day's total on the right. Weeks are Monday to Sunday.

## Grouped entries and inline editing

Within each day, entries are grouped by the combination of project, task, and description. If you tracked the same project, task, and description more than once in a day, they collapse into a single row with a count badge showing how many sessions, and the combined total for that group. A row with a different description, even under the same project, is always its own row.

Click a group row to expand it and see every individual session inside it, each with its own start and end time.

Every field on an expanded row is directly editable, with no separate edit mode to enter first.

Description is a plain text field. Click it, type, and it saves when you click away or press Enter.

Start time and end time are native time inputs. Click one, change it, and it saves on blur. The entry's duration and every total that depends on it recalculate immediately.

Project and task use the same picker as the timer bar, so you can reassign an entry to a different project or task from the expanded row.

Tags use the same tag picker as the timer bar.

Each row, both the collapsed group and each expanded session, has a play button that starts a brand new timer with that exact project, task, description, and tags. If a timer is already running, it is stopped first. Each expanded session also has a delete button. A collapsed group with only one session also has a direct delete button next to its play button.

## Projects and tasks

Manage projects from the Projects page, reachable from the sidebar. Create a project by typing a name and pressing Create project. Click a project's name to rename it inline. Click Change color to pick from a preset palette or open a full custom color picker. Archive a project to hide it from pickers without deleting its history.

Tasks do not have their own page. They are created and managed entirely from the project and task picker used throughout the app, in the timer bar, in manual entry creation, and in the expanded entry rows. Click a project row's task count, or Add task if it has none, to expand it and see its tasks. From there you can select an existing task, or type a name and press Enter to create a new one on the spot. Hover any task name to reveal a small pencil icon that lets you rename it in place.

## Tags and sub-tags

Manage tags from the Tags page. Create a top level tag by typing a name. Click a tag's name to rename it. Click Color to choose from the palette or a custom color. Click plus Sub-tag to add a child tag underneath it. Delete removes a tag; if it has children, they are not deleted, they simply lose their parent and become top level tags.

The same tag picker is used everywhere you attach tags to a time entry, in the timer bar, in manual entry creation, and in expanded entry rows. It is a small tag icon button. Clicking it opens a search box and a checklist. Typing filters the list, and if nothing matches, an option appears to create a new tag on the spot. When not searching, each top level tag shows how many sub-tags it has, or an option to add one, with the same expand and create pattern as the project and task picker.

## Goals

Set daily targets from Settings. There are two kinds.

Overall goal: a single target for total time logged per day, for example 6 hours.

Per project goal: a target scoped to one project, for example 4 hours for Hunting. You can have as many project goals as you have projects.

Both are set in hours and minutes and are upserted, meaning setting the overall goal again updates the same target rather than creating a duplicate.

Once at least one goal exists, the Time Tracker page's Today card expands into the merged Today plus Goals layout described above, with a progress bar per goal comparing what you have logged today against the target.

## Dashboard

Reachable from the sidebar, separate from Time Tracker. This is the analytics view, not where you track time.

A range picker at the top lets you choose Today, Yesterday, This week, Last week, This month, Last month, This year, Last year, All time, or a custom date range, with previous and next arrows to step through periods where that makes sense.

Three stat cards show total time for the range, the top project by time, and the most logged task by name.

A stacked daily bar chart shows one bar per day in the range, with each bar segmented and colored by project. Hovering a day shows a tooltip listing the day's total at the top, followed only by the projects actually logged that day; projects with nothing logged that day are not shown.

A donut chart plus a legend list shows the overall breakdown by project for the whole range, each row showing the project's color, name, a proportional bar, the total time, and the percentage of the range total.

## Reports

Reachable from the sidebar. Uses the same range picker as the Dashboard.

A total card shows the summed time and entry count for the selected range.

A By project table lists every project with time in the range, its entry count, and its total. If drill down is enabled, clicking a row expands the exact underlying time entries for that project and range directly beneath the table, grouped the same way as the Time Tracker.

A By activity table, when hierarchical rollups are enabled, lists every task that has time logged, indented by nesting depth, where a parent task's total includes every descendant's time added together, not just its own. For example if you logged 30 minutes directly on Recon and 45 minutes on its sub-task Subdomains, Recon's row shows 75 minutes and Subdomains still shows its own 45 minutes.

## Saved views

On the Reports page, when enabled, you can save the currently selected range under a name by clicking plus Save this view, typing a name, and confirming. Saved views appear as buttons; click one to instantly re-apply that range. Click the small x next to a saved view to delete it. Saved views are stored on the server, not per browser, so they are available from any device that reaches your instance.

## Report export

On the Reports page, when enabled, three buttons next to the range picker let you download the current report as CSV, open it as a standalone HTML page, or download it as a PDF. All three cover the total, the per project breakdown, and the per activity rollup for whatever range is currently selected. The PDF is a real PDF file generated on the server, not a browser print trick.

## Calendar

Reachable from the sidebar. Pick a single date and see every entry tracked that day, grouped by project, task, and description the same way as everywhere else, without the day box header since the date picker above already establishes which day you are looking at.

## Settings

Reachable from the sidebar. Contains:

Overall daily goal and per project daily goals, described above under Goals.

Tracker features, described below.

Sidebar visibility toggles for Team and Clients, described below.

Import from Clockify, described below.

Export, a link to download the entire workspace as one JSON file.

A note showing the server address.

## Tracker features toggle

In Settings under Tracker features, each of the following can be turned on or off independently, all on by default:

Dashboard charts, meaning the stacked daily bar chart and the donut breakdown.

Hierarchical rollups, meaning the By activity table on Reports and whether parent task totals include their descendants.

Drill down, meaning whether clicking a project row on Reports expands its underlying entries.

Saved report views.

CSV report export.

HTML report export.

PDF report export.

Turn everything off for a minimal tracker that only shows totals, or leave everything on for the full analytics suite. These preferences are stored in your browser's local storage, since they are a display preference and not tracked data, so they are per browser rather than synced across devices.

## Team and Clients placeholders

The sidebar can optionally show Team and Clients entries, toggled from Settings under Sidebar, both off by default. Both are honest placeholder pages with no functionality behind them yet. Temporal Loom has no multi-user support at all, so Team has nothing real to show. Clients, meaning grouping projects under a billing client the way Clockify does, has not been built. They exist in the sidebar only for layout parity with Clockify and as a starting point if either is ever built out for real.

## Importing from Clockify

From Settings, under Import from Clockify, choose a CSV file exported from Clockify. Projects, tasks, and tags in the file are matched to existing ones by name, or created if they do not exist. Since Clockify's Task field is commonly unused, imported entries are filed under each project's General fallback task, with the original description and tags preserved exactly.

Timestamps in the file have no timezone attached. The import converts them using your browser's timezone, sent automatically with the upload, not the server's own system timezone, which matters if the two differ, for example if the server defaults to UTC.

Re-uploading the same file is safe. Entries already imported, matched by project, task, start time, and end time, are detected and skipped rather than duplicated. The import summary reports rows read, entries imported, entries skipped as duplicates, invalid rows skipped, and how many new projects, tasks, and tags were created.

## Data export

From Settings, Export downloads the entire workspace, every project, task, tag, and time entry, as one JSON file with a schema version number, so a future importer can read it back in reliably.

## API reference

All endpoints are under `/api/v1`.

Workspaces: `GET /workspaces`, `GET /workspaces/current`.

Projects: `GET /projects`, `GET /projects/:id`, `POST /projects`, `PATCH /projects/:id`, `POST /projects/:id/archive`.

Activities, meaning tasks: `GET /activities`, `POST /activities`, `PATCH /activities/:id`, `POST /activities/:id/archive`.

Tags: `GET /tags`, `POST /tags`, `PATCH /tags/:id`, `DELETE /tags/:id`.

Time entries: `GET /time-entries`, `GET /time-entries/running`, `POST /time-entries/start`, `POST /time-entries/:id/stop`, `POST /time-entries`, `PATCH /time-entries/:id`, `DELETE /time-entries/:id`.

Reports: `GET /reports/summary`, `GET /reports/by-project`, `GET /reports/by-activity`, `GET /reports/export.csv`, `GET /reports/export.html`, `GET /reports/export.pdf`.

Goals: `GET /goals`, `PUT /goals/overall`, `DELETE /goals/overall`, `PUT /goals/project/:projectId`, `DELETE /goals/project/:projectId`.

Saved views: `GET /saved-views`, `POST /saved-views`, `DELETE /saved-views/:id`.

Imports: `POST /imports/clockify`.

Exports: `GET /exports/json`.

## Project structure

```
server/
  src/db/          schema.sql, ULID generator, sqlite client, migrations
  src/models/       workspace, project, activity, tag, goal, savedView, timeEntry
  src/services/      reportService, reportExportService, exportService, csv, importClockify
  src/routes/       one file per resource, mounted under /api/v1
  src/index.ts       app entry point
client/
  src/api/          typed fetch client and shared types
  src/context/       TimerContext, global running timer state and live tab title
  src/components/    Sidebar, Timer, ProjectTaskPicker, TagPicker, Combobox,
                      GroupedEntryList, GoalsSummary, RangePicker, ColorDot
  src/pages/          TimeTracker, Dashboard, Reports, Calendar, Projects, Tags,
                       Settings, TimeEntries, Team, Clients
  src/utils/          date, range, format, colors, featurePrefs, sidebarPrefs
```

## What is intentionally not built yet

Targets, meaning a layer between project and task for tracking a specific bug bounty target such as a company or domain, exist as a database table but have no user interface.

Activity colors, meaning giving individual tasks their own color the way projects and tags have, exist as a database column but have no picker.

The Calendar page is a single day list, not a real month or week grid view.

Team and Clients are placeholders as described above.

Saved views apply to the Reports page only, not to the Dashboard's range picker.
