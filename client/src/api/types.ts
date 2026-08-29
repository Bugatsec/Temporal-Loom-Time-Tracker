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

export interface Goal {
  id: string;
  workspace_id: string;
  project_id: string | null;
  target_seconds: number;
  created_at: string;
  updated_at: string;
}
