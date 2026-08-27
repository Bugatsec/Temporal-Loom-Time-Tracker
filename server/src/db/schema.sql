-- Stage 1 schema — Clockify-compatible foundation
--
-- Mirrors "3.2 Minimum time-entry fields" and the relevant subset of
-- "10.1 Logical schema". `targets` and `tags` are included even though
-- Stage 1 treats them as optional, because `time_entries.target_id` and
-- the tag relation are already part of the minimum field list — leaving
-- them out now would mean a breaking migration in Stage 2+.
--
-- IDs are ULIDs stored as TEXT (lexicographically sortable, unlike
-- UUIDv4), generated in application code — see src/db/ids.ts.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  color         TEXT,
  archived_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);

-- Optional in Stage 1 (doc 2.1: "Optional in Stage 1; recommended later").
CREATE TABLE IF NOT EXISTS targets (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  archived_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_targets_project ON targets(project_id);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  -- Self-referencing parent enables the optional "child activity" nesting
  -- shown in the doc (Recon -> Subdomains / Port scanning / Technology)
  -- without needing a schema change when a user adds a sub-activity.
  parent_id   TEXT REFERENCES activities(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  color       TEXT,
  archived_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_parent ON activities(parent_id);

CREATE TABLE IF NOT EXISTS tags (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  color         TEXT,
  UNIQUE(workspace_id, name)
);

-- Time entries are the atomic source of truth (doc Section 8).
CREATE TABLE IF NOT EXISTS time_entries (
  id                 TEXT PRIMARY KEY,
  workspace_id       TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  target_id          TEXT REFERENCES targets(id) ON DELETE SET NULL,
  activity_id        TEXT NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,

  start_at           TEXT NOT NULL,  -- ISO 8601 with offset
  end_at             TEXT,           -- null while RUNNING (doc 8.2)
  duration_seconds   INTEGER,        -- persisted, not derived-on-read (doc 8.2)

  description        TEXT,
  billable           INTEGER NOT NULL DEFAULT 0,  -- 0/1

  source             TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual','timer','imported','api','automation')),
  metadata           TEXT,           -- JSON, forward-compatible extension point

  deleted_at         TEXT,           -- soft delete (doc 8.2 / 10.2)
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_entries_workspace_start ON time_entries(workspace_id, start_at);
CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_entries_activity ON time_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_entries_running ON time_entries(workspace_id) WHERE end_at IS NULL;

CREATE TABLE IF NOT EXISTS time_entry_tags (
  time_entry_id TEXT NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  tag_id        TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (time_entry_id, tag_id)
);

-- Bootstrap: Stage 1 is single-user/single-workspace, but the row exists
-- so multi-workspace (Section 20) is additive later, not a migration.
INSERT INTO workspaces (id, name)
  SELECT 'ws_default', 'Life'
  WHERE NOT EXISTS (SELECT 1 FROM workspaces WHERE id = 'ws_default');
