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

export interface ActivityRollupRow {
  activity_id: string;
  activity_name: string;
  project_id: string;
  parent_id: string | null;
  /** Time logged directly on this activity (not its children). */
  own_seconds: number;
  /** own_seconds plus every descendant's own_seconds, recursively —
   *  the actual "hierarchical rollup" Stage 3 asks for. */
  rollup_seconds: number;
  entry_count: number;
  /** Nesting depth, for indenting the row in the UI. */
  depth: number;
}

interface ActivityRow {
  id: string;
  name: string;
  project_id: string;
  parent_id: string | null;
}

/** Per-activity totals for a range, with parent activities' totals rolled
 *  up to include every descendant. Optionally scoped to one project.
 *  Computed in JS rather than a recursive SQL CTE — the activity trees
 *  here are small (personal-tool scale), and this is far easier to read
 *  and get right than SQLite's WITH RECURSIVE syntax. */
export function breakdownByActivityRollup(from: string, to: string, projectId?: string): ActivityRollupRow[] {
  const activityParams: unknown[] = projectId
    ? [DEFAULT_WORKSPACE_ID, projectId]
    : [DEFAULT_WORKSPACE_ID];
  const activityRows = db
    .prepare(
      `SELECT a.id, a.name, a.project_id, a.parent_id
       FROM activities a
       JOIN projects p ON p.id = a.project_id
       WHERE p.workspace_id = ? ${projectId ? "AND a.project_id = ?" : ""} AND a.archived_at IS NULL`
    )
    .all(...activityParams) as ActivityRow[];

  const totalParams: unknown[] = projectId
    ? [DEFAULT_WORKSPACE_ID, projectId, from, to]
    : [DEFAULT_WORKSPACE_ID, from, to];
  const totalsRows = db
    .prepare(
      `SELECT te.activity_id, COALESCE(SUM(te.duration_seconds), 0) AS own_seconds, COUNT(*) AS entry_count
       FROM time_entries te
       JOIN activities a ON a.id = te.activity_id
       JOIN projects p ON p.id = a.project_id
       WHERE p.workspace_id = ? ${projectId ? "AND a.project_id = ?" : ""}
         AND te.deleted_at IS NULL AND te.end_at IS NOT NULL AND te.start_at >= ? AND te.start_at < ?
       GROUP BY te.activity_id`
    )
    .all(...totalParams) as { activity_id: string; own_seconds: number; entry_count: number }[];

  const totalsMap = new Map(totalsRows.map((r) => [r.activity_id, r]));
  const activityMap = new Map(activityRows.map((a) => [a.id, a]));
  const childrenOf = new Map<string, string[]>();
  for (const a of activityRows) {
    if (a.parent_id) {
      if (!childrenOf.has(a.parent_id)) childrenOf.set(a.parent_id, []);
      childrenOf.get(a.parent_id)!.push(a.id);
    }
  }

  function rollupSeconds(activityId: string): number {
    const own = totalsMap.get(activityId)?.own_seconds ?? 0;
    const children = childrenOf.get(activityId) ?? [];
    return own + children.reduce((sum, childId) => sum + rollupSeconds(childId), 0);
  }

  function depthOf(activityId: string): number {
    let a = activityMap.get(activityId);
    let depth = 0;
    while (a?.parent_id) {
      depth++;
      a = activityMap.get(a.parent_id);
    }
    return depth;
  }

  const allRows: ActivityRollupRow[] = activityRows.map((a) => ({
    activity_id: a.id,
    activity_name: a.name,
    project_id: a.project_id,
    parent_id: a.parent_id,
    own_seconds: totalsMap.get(a.id)?.own_seconds ?? 0,
    rollup_seconds: rollupSeconds(a.id),
    entry_count: totalsMap.get(a.id)?.entry_count ?? 0,
    depth: depthOf(a.id),
  }));

  // Only activities that actually have time (directly or via a descendant),
  // ordered so children sit right beneath their parent (parent-first tree order).
  const withTime = new Set(allRows.filter((r) => r.rollup_seconds > 0).map((r) => r.activity_id));
  const rowById = new Map(allRows.map((r) => [r.activity_id, r]));
  const topLevel = allRows
    .filter((r) => !r.parent_id && withTime.has(r.activity_id))
    .sort((a, b) => b.rollup_seconds - a.rollup_seconds);

  const output: ActivityRollupRow[] = [];
  function addWithChildren(row: ActivityRollupRow) {
    output.push(row);
    const kids = (childrenOf.get(row.activity_id) ?? [])
      .map((id) => rowById.get(id)!)
      .filter((r) => withTime.has(r.activity_id))
      .sort((a, b) => b.rollup_seconds - a.rollup_seconds);
    for (const kid of kids) addWithChildren(kid);
  }
  for (const row of topLevel) addWithChildren(row);

  return output;
}
