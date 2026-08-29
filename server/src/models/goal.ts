import { db } from "../db/client.js";
import { id } from "../db/ids.js";

const DEFAULT_WORKSPACE_ID = "ws_default";

export interface Goal {
  id: string;
  workspace_id: string;
  project_id: string | null;
  target_seconds: number;
  created_at: string;
  updated_at: string;
}

export function getOverallGoal(): Goal | undefined {
  return db
    .prepare(`SELECT * FROM goals WHERE workspace_id = ? AND project_id IS NULL`)
    .get(DEFAULT_WORKSPACE_ID) as Goal | undefined;
}

export function listProjectGoals(): Goal[] {
  return db
    .prepare(`SELECT * FROM goals WHERE workspace_id = ? AND project_id IS NOT NULL ORDER BY updated_at DESC`)
    .all(DEFAULT_WORKSPACE_ID) as Goal[];
}

export function getProjectGoal(projectId: string): Goal | undefined {
  return db
    .prepare(`SELECT * FROM goals WHERE workspace_id = ? AND project_id = ?`)
    .get(DEFAULT_WORKSPACE_ID, projectId) as Goal | undefined;
}

/** Upsert by "the one row where project_id IS <value>" — enforced here in
 *  application code since SQLite can't express "at most one NULL" via a
 *  plain UNIQUE constraint (see schema.sql comment). */
function upsertGoal(projectId: string | null, targetSeconds: number): Goal {
  const existing = projectId
    ? getProjectGoal(projectId)
    : getOverallGoal();

  if (existing) {
    db.prepare(
      `UPDATE goals SET target_seconds = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    ).run(targetSeconds, existing.id);
    return { ...existing, target_seconds: targetSeconds };
  }

  const newId = id("goal");
  db.prepare(`INSERT INTO goals (id, workspace_id, project_id, target_seconds) VALUES (?, ?, ?, ?)`).run(
    newId,
    DEFAULT_WORKSPACE_ID,
    projectId,
    targetSeconds
  );
  return db.prepare(`SELECT * FROM goals WHERE id = ?`).get(newId) as Goal;
}

export function setOverallGoal(targetSeconds: number): Goal {
  return upsertGoal(null, targetSeconds);
}

export function setProjectGoal(projectId: string, targetSeconds: number): Goal {
  return upsertGoal(projectId, targetSeconds);
}

export function deleteOverallGoal(): void {
  db.prepare(`DELETE FROM goals WHERE workspace_id = ? AND project_id IS NULL`).run(DEFAULT_WORKSPACE_ID);
}

export function deleteProjectGoal(projectId: string): void {
  db.prepare(`DELETE FROM goals WHERE workspace_id = ? AND project_id = ?`).run(DEFAULT_WORKSPACE_ID, projectId);
}
