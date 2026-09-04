import { db } from "../db/client.js";
import { id } from "../db/ids.js";

const DEFAULT_WORKSPACE_ID = "ws_default";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface Goal {
  id: string;
  workspace_id: string;
  period: GoalPeriod;
  project_id: string | null;
  target_seconds: number;
  created_at: string;
  updated_at: string;
}

export function getOverallGoal(period: GoalPeriod): Goal | undefined {
  return db
    .prepare(`SELECT * FROM goals WHERE workspace_id = ? AND period = ? AND project_id IS NULL`)
    .get(DEFAULT_WORKSPACE_ID, period) as Goal | undefined;
}

export function listProjectGoals(period: GoalPeriod): Goal[] {
  return db
    .prepare(
      `SELECT * FROM goals WHERE workspace_id = ? AND period = ? AND project_id IS NOT NULL ORDER BY updated_at DESC`
    )
    .all(DEFAULT_WORKSPACE_ID, period) as Goal[];
}

export function getProjectGoal(period: GoalPeriod, projectId: string): Goal | undefined {
  return db
    .prepare(`SELECT * FROM goals WHERE workspace_id = ? AND period = ? AND project_id = ?`)
    .get(DEFAULT_WORKSPACE_ID, period, projectId) as Goal | undefined;
}

/** Upsert by "the one row where (period, project_id) IS <value>" —
 *  enforced here in application code since SQLite can't express "at most
 *  one NULL per period" via a plain UNIQUE constraint (see schema.sql
 *  comment). */
function upsertGoal(period: GoalPeriod, projectId: string | null, targetSeconds: number): Goal {
  const existing = projectId ? getProjectGoal(period, projectId) : getOverallGoal(period);

  if (existing) {
    db.prepare(
      `UPDATE goals SET target_seconds = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    ).run(targetSeconds, existing.id);
    return { ...existing, target_seconds: targetSeconds };
  }

  const newId = id("goal");
  db.prepare(`INSERT INTO goals (id, workspace_id, period, project_id, target_seconds) VALUES (?, ?, ?, ?, ?)`).run(
    newId,
    DEFAULT_WORKSPACE_ID,
    period,
    projectId,
    targetSeconds
  );
  return db.prepare(`SELECT * FROM goals WHERE id = ?`).get(newId) as Goal;
}

export function setOverallGoal(period: GoalPeriod, targetSeconds: number): Goal {
  return upsertGoal(period, null, targetSeconds);
}

export function setProjectGoal(period: GoalPeriod, projectId: string, targetSeconds: number): Goal {
  return upsertGoal(period, projectId, targetSeconds);
}

export function deleteOverallGoal(period: GoalPeriod): void {
  db.prepare(`DELETE FROM goals WHERE workspace_id = ? AND period = ? AND project_id IS NULL`).run(
    DEFAULT_WORKSPACE_ID,
    period
  );
}

export function deleteProjectGoal(period: GoalPeriod, projectId: string): void {
  db.prepare(`DELETE FROM goals WHERE workspace_id = ? AND period = ? AND project_id = ?`).run(
    DEFAULT_WORKSPACE_ID,
    period,
    projectId
  );
}
