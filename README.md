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

## What changed in this pass

**Real visibility bugs fixed:**
- Native `<input type="time/date/color">` controls (clock icon, calendar
  icon, checkboxes) were rendering in light-mode colors by default on this
  dark page — that's what made start/end times look "glitched" and barely
  visible. Added `color-scheme: dark` at the root; fixes every native
  control app-wide, not just the ones that were reported.
- Time inputs were also genuinely too narrow (78px) to fit HH:MM plus the
  browser's own clock icon without clipping — widened to 100px and gave
  the row's time column more room (160px → 220px).
- Tag-picker icon and the sidebar's expand chevron were both rendered at
  10-14px, functionally invisible — both are proper sized SVGs now (18px
  and 12px with a visible stroke width).
- Play and delete buttons sized up slightly for an easier click target.

**Structure:**
- Import/Export is no longer a separate page — folded into Settings.
- Sidebar reverted to a flat layout (Time Tracker, Dashboard, then an
  Analyze section with Calendar/Reports, then Manage) instead of nesting
  Calendar/Reports under a collapsible Dashboard — matches Clockify's own
  layout more directly.
- Added "Team" and "Clients" as sidebar entries, **off by default**,
  toggleable from Settings → Sidebar. Both are honest placeholders (no
  backend) — this is a self-hosted single-user tool, so "Team" has nothing
  real behind it, and "Clients" isn't built out. The toggle pattern itself
  is the actual deliverable here; say the word if you want Clients turned
  into a real feature (project → client grouping, matching Clockify).

**Tag picker now mirrors the Project/Task picker:**
- Each top-level tag's row shows "N sub-tags" / "Add tag" + a chevron,
  same as a project shows "N tasks" / "Add task" — expand to see or add
  sub-tags inline.
- Persistent "+ Create new tag" footer, matching "+ Create new project".
- Typing in the search box still creates-on-enter as a shortcut.

**Dashboard tooltip:** now shows the day's total at the top (with a
divider) above the per-project breakdown, not just the per-project list.

**Time Tracker layout:**
- Today's total and the Goals card are one card now, not two: total time
  on the left with room to breathe, a short vertical divider, goals on
  the right.
- Goals rendering has two modes: the existing spacious layout (still the
  default) and a new **Compact** mode (smaller bars, percentage instead of
  "Xh Ym / Ah Bm", tighter spacing) — toggle button in the card's top
  right. Falls back to the old simple "Today" card when no goals are set.

## Everything from the previous pass (still true)

Full range presets (Today/Yesterday/Week/Month/Year/All time/Custom)
shared between Dashboard and Reports; interactive stacked-bar + donut
charts; project+task+description-level entry grouping with inline
editing (description and start/end time are always-editable, no separate
edit mode); goals (overall + per-project daily targets); Clockify CSV
import with browser-timezone-aware conversion.

## Stage 3 status (unchanged, still accurate)

Deferred: hierarchical rollups, saved report views, CSV/HTML/PDF report
export (only whole-workspace JSON export exists).

## What's deliberately stubbed

- **Targets** — schema exists, no UI.
- **Activity colors** — schema exists, no picker.
- **Calendar** page is a single-day grouped list, not a real calendar grid.
- **Team / Clients** — placeholder pages, hidden by default (see above).
