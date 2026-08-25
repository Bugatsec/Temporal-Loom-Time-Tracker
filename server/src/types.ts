export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Target {
  id: string;
  project_id: string;
  name: string;
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
}

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
}
