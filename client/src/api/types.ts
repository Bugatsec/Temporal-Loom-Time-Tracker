export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeEntrySource = "manual" | "timer" | "imported" | "api" | "automation";

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  parent_id: string | null;
}

export interface TimeEntry {
  id: string;
  workspace_id: string;
  project_id: string;
  target_id: string | null;
  activity_id: string;
  start_at: string;
  end_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  billable: 0 | 1;
  source: TimeEntrySource;
  metadata: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface RangeTotal {
  from: string;
  to: string;
  total_seconds: number;
  entry_count: number;
}

export interface ProjectBreakdownRow {
  project_id: string;
  project_name: string;
  total_seconds: number;
  entry_count: number;
}

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

export interface DailyCaps {
  id: string;
  workspace_id: string;
  minimum_seconds: number | null;
  max_seconds: number | null;
  extreme_seconds: number | null;
  updated_at: string;
}

export interface DailyCapStatus {
  period: "daily";
  logged_seconds: number;
  minimum_seconds: number | null;
  max_seconds: number | null;
  extreme_seconds: number | null;
  met_minimum: boolean;
  over_max: boolean;
  over_extreme: boolean;
}

export interface FloorProjectStatus {
  project_id: string;
  project_name: string;
  target_seconds: number;
  logged_seconds: number;
  remaining_seconds: number;
  met: boolean;
}

export interface FloorStatus {
  period: "weekly" | "yearly";
  has_goal: boolean;
  target_seconds: number | null;
  logged_seconds: number;
  remaining_seconds: number;
  met: boolean;
  projects: FloorProjectStatus[];
}

export type MonthlyFeasibility = "comfortable" | "tight" | "impossible" | "no_goal" | "no_cap";

export interface MonthlyProjectStatus {
  project_id: string;
  project_name: string;
  target_seconds: number;
  logged_seconds: number;
  remaining_seconds: number;
  satisfied: boolean;
}

export interface MonthlyStatus {
  period: "monthly";
  has_goal: boolean;
  target_seconds: number | null;
  logged_seconds: number;
  remaining_seconds: number;
  days_total: number;
  days_left: number;
  derived_daily_target_seconds: number;
  feasibility: MonthlyFeasibility;
  shortfall_seconds: number;
  affordable_rest_days: number;
  projects: MonthlyProjectStatus[];
}

export interface GoalStatusBundle {
  daily: DailyCapStatus;
  weekly: FloorStatus;
  monthly: MonthlyStatus;
  yearly: FloorStatus;
}

export interface ActivityRollupRow {
  activity_id: string;
  activity_name: string;
  project_id: string;
  parent_id: string | null;
  own_seconds: number;
  rollup_seconds: number;
  entry_count: number;
  depth: number;
}

export interface SavedView {
  id: string;
  workspace_id: string;
  name: string;
  config: string;
  created_at: string;
}
