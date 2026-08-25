import { db } from "../db/client.js";
import { DEFAULT_WORKSPACE_ID } from "../models/workspace.js";

const SCHEMA_VERSION = 1;

/** Whole-workspace JSON export. Shape matches doc 11.1's canonical export
 *  format so a later importer (Stage 2) can round-trip this file. */
export function exportWorkspaceJson() {
  const workspace = db.prepare("SELECT * FROM workspaces WHERE id = ?").get(DEFAULT_WORKSPACE_ID);
  const projects = db.prepare("SELECT * FROM projects WHERE workspace_id = ?").all(DEFAULT_WORKSPACE_ID);
  const targets = db
    .prepare(
      `SELECT t.* FROM targets t JOIN projects p ON p.id = t.project_id WHERE p.workspace_id = ?`
    )
    .all(DEFAULT_WORKSPACE_ID);
  const activities = db
    .prepare(
      `SELECT a.* FROM activities a JOIN projects p ON p.id = a.project_id WHERE p.workspace_id = ?`
    )
    .all(DEFAULT_WORKSPACE_ID);
  const timeEntries = db
    .prepare(`SELECT * FROM time_entries WHERE workspace_id = ? AND deleted_at IS NULL`)
    .all(DEFAULT_WORKSPACE_ID);
  const tags = db.prepare("SELECT * FROM tags WHERE workspace_id = ?").all(DEFAULT_WORKSPACE_ID);

  return {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    workspace,
    projects,
    targets,
    activities,
    time_entries: timeEntries,
    tags,
  };
}
