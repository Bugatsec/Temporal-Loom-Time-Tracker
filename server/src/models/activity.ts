import { db } from "../db/client.js";
import { id } from "../db/ids.js";
import type { Activity } from "../types.js";

export function listActivities(projectId: string, includeArchived = false): Activity[] {
  const archivedClause = includeArchived ? "" : "AND archived_at IS NULL";
  return db
    .prepare(`SELECT * FROM activities WHERE project_id = ? ${archivedClause} ORDER BY name`)
    .all(projectId) as Activity[];
}

export function getActivity(activityId: string): Activity | undefined {
  return db.prepare("SELECT * FROM activities WHERE id = ?").get(activityId) as
    | Activity
    | undefined;
}

export function createActivity(
  projectId: string,
  name: string,
  parentId?: string | null,
  color?: string
): Activity {
  const newId = id("act");
  db.prepare(
    `INSERT INTO activities (id, project_id, parent_id, name, color) VALUES (?, ?, ?, ?, ?)`
  ).run(newId, projectId, parentId ?? null, name, color ?? null);
  return getActivity(newId)!;
}

export function archiveActivity(activityId: string): void {
  db.prepare(
    `UPDATE activities SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).run(activityId);
}
