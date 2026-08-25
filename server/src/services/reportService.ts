import { db } from "../db/client.js";
import { DEFAULT_WORKSPACE_ID } from "../models/workspace.js";

export interface RangeTotal {
  from: string;
  to: string;
  total_seconds: number;
  entry_count: number;
}

/** Sum of duration_seconds for entries whose start_at falls in [from, to).
 *  Running entries (end_at IS NULL) are excluded — duration isn't final yet. */
export function totalForRange(from: string, to: string): RangeTotal {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(duration_seconds), 0) AS total_seconds, COUNT(*) AS entry_count
       FROM time_entries
       WHERE workspace_id = ? AND deleted_at IS NULL AND end_at IS NOT NULL
         AND start_at >= ? AND start_at < ?`
    )
    .get(DEFAULT_WORKSPACE_ID, from, to) as { total_seconds: number; entry_count: number };

  return { from, to, total_seconds: row.total_seconds, entry_count: row.entry_count };
}

export interface ProjectBreakdownRow {
  project_id: string;
  project_name: string;
  total_seconds: number;
  entry_count: number;
}

/** Basic per-project breakdown for a range — the minimal slice of the
 *  Section 9 drill-down contract that Stage 1 needs. */
export function breakdownByProject(from: string, to: string): ProjectBreakdownRow[] {
  return db
    .prepare(
      `SELECT p.id AS project_id, p.name AS project_name,
              COALESCE(SUM(te.duration_seconds), 0) AS total_seconds,
              COUNT(te.id) AS entry_count
       FROM projects p
       LEFT JOIN time_entries te
         ON te.project_id = p.id AND te.deleted_at IS NULL AND te.end_at IS NOT NULL
         AND te.start_at >= ? AND te.start_at < ?
       WHERE p.workspace_id = ?
       GROUP BY p.id
       HAVING entry_count > 0
       ORDER BY total_seconds DESC`
    )
    .all(from, to, DEFAULT_WORKSPACE_ID) as ProjectBreakdownRow[];
}
