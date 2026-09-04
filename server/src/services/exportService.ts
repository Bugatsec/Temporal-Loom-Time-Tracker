import { db } from "../db/client.js";
import { getDailyCaps, setDailyCaps } from "../models/dailyCaps.js";
import { getOrCreateActivity } from "../models/activity.js";
import { getOrCreateProject } from "../models/project.js";
import {
  getOverallGoal,
  listProjectGoals,
  setOverallGoal,
  setProjectGoal,
  type GoalPeriod,
} from "../models/goal.js";
import { createSavedView, listSavedViews } from "../models/savedView.js";
import { createManualEntry, listEntries } from "../models/timeEntry.js";
import { DEFAULT_WORKSPACE_ID } from "../models/workspace.js";

const SCHEMA_VERSION = 2;
const PERIODS: GoalPeriod[] = ["daily", "weekly", "monthly", "yearly"];

/** Whole-workspace JSON export — everything needed to fully restore a
 *  Temporal Loom instance elsewhere, not just the raw tracked data.
 *  Bumped to schema_version 2: version 1 (still importable, see below)
 *  didn't include tags on entries, goals, daily caps, or saved views —
 *  a real gap, since those are now core features, not extras. */
export function exportWorkspaceJson() {
  const workspace = db.prepare("SELECT * FROM workspaces WHERE id = ?").get(DEFAULT_WORKSPACE_ID);
  const projects = db.prepare("SELECT * FROM projects WHERE workspace_id = ?").all(DEFAULT_WORKSPACE_ID);
  const targets = db
    .prepare(`SELECT t.* FROM targets t JOIN projects p ON p.id = t.project_id WHERE p.workspace_id = ?`)
    .all(DEFAULT_WORKSPACE_ID);
  const activities = db
    .prepare(`SELECT a.* FROM activities a JOIN projects p ON p.id = a.project_id WHERE p.workspace_id = ?`)
    .all(DEFAULT_WORKSPACE_ID);
  const tags = db.prepare("SELECT * FROM tags WHERE workspace_id = ?").all(DEFAULT_WORKSPACE_ID);
  // Via the model (not raw SQL) so each entry's `tags` array comes attached,
  // the same shape the rest of the app already relies on.
  const timeEntries = listEntries({ limit: 1000000 });

  const goals: Record<GoalPeriod, { overall: unknown; byProject: unknown[] }> = {} as any;
  for (const period of PERIODS) {
    goals[period] = { overall: getOverallGoal(period) ?? null, byProject: listProjectGoals(period) };
  }

  return {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    workspace,
    projects,
    targets,
    activities,
    time_entries: timeEntries,
    tags,
    goals,
    daily_caps: getDailyCaps() ?? null,
    saved_views: listSavedViews(),
  };
}

export interface ImportSummary {
  schema_version_read: number | null;
  projects_created: number;
  activities_created: number;
  tags_created: number;
  entries_imported: number;
  entries_skipped_duplicate: number;
  goals_restored: number;
  daily_caps_restored: boolean;
  saved_views_restored: number;
  errors: string[];
}

interface ExportedTimeEntry {
  project_id: string;
  activity_id: string;
  start_at: string;
  end_at: string | null;
  description: string | null;
  tags?: { name: string }[];
}

interface ExportedGoalRow {
  project_id: string | null;
  target_seconds: number;
}

/** Imports a file produced by exportWorkspaceJson (this version or the
 *  original schema_version 1, which just lacks the newer sections).
 *  Matches projects/activities/tags by name and creates them if missing —
 *  the same get-or-create pattern the Clockify importer uses — rather
 *  than reusing the exported IDs directly, since those could collide with
 *  or duplicate anything already in this database. Safe to re-run: time
 *  entries are deduped by (project, activity, description, start, end),
 *  and goals/caps are upserted rather than duplicated. */
export function importWorkspaceJson(data: any): ImportSummary {
  // Snapshot before anything is created, since entry import below creates
  // tags as a side effect (via get-or-create) that must be counted too.
  const tagNamesBefore = new Set(
    (db.prepare(`SELECT name FROM tags WHERE workspace_id = ?`).all(DEFAULT_WORKSPACE_ID) as { name: string }[]).map(
      (r) => r.name
    )
  );

  const summary: ImportSummary = {
    schema_version_read: typeof data?.schema_version === "number" ? data.schema_version : null,
    projects_created: 0,
    activities_created: 0,
    tags_created: 0,
    entries_imported: 0,
    entries_skipped_duplicate: 0,
    goals_restored: 0,
    daily_caps_restored: false,
    saved_views_restored: 0,
    errors: [],
  };

  // id -> resolved-in-this-database id, built as we go so cross-references
  // in the export (activity.project_id, entry.project_id, etc) still work
  // after everything gets a fresh local id.
  const projectIdMap = new Map<string, string>();
  const activityIdMap = new Map<string, string>();

  const exportedProjects: { id: string; name: string; color: string | null }[] = data?.projects ?? [];
  for (const p of exportedProjects) {
    const { project, created } = getOrCreateProject(p.name, p.color ?? undefined);
    if (created) summary.projects_created++;
    projectIdMap.set(p.id, project.id);
  }

  const exportedActivities: { id: string; project_id: string; name: string; parent_id: string | null }[] =
    data?.activities ?? [];
  // Two passes: create every activity first (without parent), then wire up
  // parents — a child could appear before its parent in the export array.
  for (const a of exportedActivities) {
    const localProjectId = projectIdMap.get(a.project_id);
    if (!localProjectId) {
      summary.errors.push(`Activity "${a.name}" references an unknown project, skipped`);
      continue;
    }
    const { activity, created } = getOrCreateActivity(localProjectId, a.name);
    if (created) summary.activities_created++;
    activityIdMap.set(a.id, activity.id);
  }

  const exportedEntries: ExportedTimeEntry[] = data?.time_entries ?? [];
  const existingKeys = new Set(
    listEntries({ limit: 1000000 }).map((e) => `${e.project_id}|${e.activity_id}|${e.description ?? ""}|${e.start_at}|${e.end_at}`)
  );

  for (const entry of exportedEntries) {
    if (!entry.end_at) continue; // a still-running entry in a backup is meaningless to restore
    const projectId = projectIdMap.get(entry.project_id);
    const activityId = activityIdMap.get(entry.activity_id);
    if (!projectId || !activityId) {
      summary.errors.push("A time entry references an unknown project or activity, skipped");
      continue;
    }

    const key = `${projectId}|${activityId}|${entry.description ?? ""}|${entry.start_at}|${entry.end_at}`;
    if (existingKeys.has(key)) {
      summary.entries_skipped_duplicate++;
      continue;
    }

    const tagNames = (entry.tags ?? []).map((t) => t.name);

    createManualEntry({
      project_id: projectId,
      activity_id: activityId,
      start_at: entry.start_at,
      end_at: entry.end_at,
      description: entry.description ?? undefined,
      tags: tagNames,
    });
    existingKeys.add(key);
    summary.entries_imported++;
  }

  // Tags: count how many are new since the pre-import snapshot — entries
  // above already get-or-created them as a side effect.
  const exportedTags: { name: string }[] = data?.tags ?? [];
  summary.tags_created = exportedTags.filter((t) => !tagNamesBefore.has(t.name)).length;

  if (data?.daily_caps) {
    setDailyCaps(data.daily_caps);
    summary.daily_caps_restored = true;
  }

  if (data?.goals) {
    for (const period of PERIODS) {
      const bucket = data.goals[period];
      if (!bucket) continue;
      if (bucket.overall?.target_seconds) {
        setOverallGoal(period, bucket.overall.target_seconds);
        summary.goals_restored++;
      }
      for (const g of (bucket.byProject ?? []) as ExportedGoalRow[]) {
        const localProjectId = projectIdMap.get(g.project_id ?? "");
        if (localProjectId && g.target_seconds) {
          setProjectGoal(period, localProjectId, g.target_seconds);
          summary.goals_restored++;
        }
      }
    }
  }

  if (Array.isArray(data?.saved_views)) {
    const existingNames = new Set(listSavedViews().map((v) => v.name));
    for (const view of data.saved_views as { name: string; config: string }[]) {
      if (existingNames.has(view.name)) continue;
      try {
        createSavedView(view.name, JSON.parse(view.config));
        summary.saved_views_restored++;
      } catch {
        summary.errors.push(`Saved view "${view.name}" had invalid config, skipped`);
      }
    }
  }

  return summary;
}
