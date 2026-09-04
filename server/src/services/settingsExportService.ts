import { getDailyCaps, setDailyCaps } from "../models/dailyCaps.js";
import { getOverallGoal, listProjectGoals, setOverallGoal, setProjectGoal, type GoalPeriod } from "../models/goal.js";
import { createSavedView, listSavedViews } from "../models/savedView.js";
import { findProjectByName, getProject } from "../models/project.js";

const SCHEMA_VERSION = 1;
const PERIODS: GoalPeriod[] = ["daily", "weekly", "monthly", "yearly"];

/** The server-side half of a "settings" bundle — daily caps, all four
 *  goal periods (with project goals keyed by *name*, not id, so this is
 *  portable to a different database where the ids won't match), and
 *  saved views. Client-only UI toggles (feature flags, sidebar/goal-tab
 *  visibility) live in localStorage and are merged in on the client side
 *  before download — see Settings.tsx. */
export function exportSettingsJson() {
  const goals: Record<GoalPeriod, { overall_seconds: number | null; byProject: { project_name: string; target_seconds: number }[] }> =
    {} as any;
  for (const period of PERIODS) {
    const overall = getOverallGoal(period);
    const byProject = listProjectGoals(period).map((g) => ({
      project_name: getProject(g.project_id!)?.name ?? "",
      target_seconds: g.target_seconds,
    }));
    goals[period] = { overall_seconds: overall?.target_seconds ?? null, byProject };
  }

  return {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    daily_caps: getDailyCaps() ?? null,
    goals,
    saved_views: listSavedViews().map((v) => ({ name: v.name, config: v.config })),
  };
}

export interface SettingsImportSummary {
  daily_caps_restored: boolean;
  goals_restored: number;
  saved_views_restored: number;
  errors: string[];
}

/** Restores the server-side half of a settings bundle. Project goals are
 *  matched by *name* against projects that already exist in this
 *  database — a project that doesn't exist here yet is skipped and
 *  reported, not silently created, since a settings restore shouldn't be
 *  the thing that invents new projects. */
export function importSettingsJson(data: any): SettingsImportSummary {
  const summary: SettingsImportSummary = {
    daily_caps_restored: false,
    goals_restored: 0,
    saved_views_restored: 0,
    errors: [],
  };

  if (data?.daily_caps) {
    setDailyCaps(data.daily_caps);
    summary.daily_caps_restored = true;
  }

  if (data?.goals) {
    for (const period of PERIODS) {
      const bucket = data.goals[period];
      if (!bucket) continue;
      if (bucket.overall_seconds) {
        setOverallGoal(period, bucket.overall_seconds);
        summary.goals_restored++;
      }
      for (const g of (bucket.byProject ?? []) as { project_name: string; target_seconds: number }[]) {
        const match = findProjectByName(g.project_name);
        if (!match) {
          summary.errors.push(`Project "${g.project_name}" not found, goal skipped`);
          continue;
        }
        if (g.target_seconds) {
          setProjectGoal(period, match.id, g.target_seconds);
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
