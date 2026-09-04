export interface ImportSummary {
  rows_read: number;
  entries_imported: number;
  entries_skipped_duplicate: number;
  rows_skipped_invalid: number;
  projects_created: number;
  activities_created: number;
  tags_created: number;
  errors: { row: number; message: string }[];
}

export interface WorkspaceImportSummary {
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

export interface SettingsImportSummary {
  daily_caps_restored: boolean;
  goals_restored: number;
  saved_views_restored: number;
  errors: string[];
}

export interface SettingsExportPayload {
  schema_version: number;
  exported_at: string;
  daily_caps: unknown;
  goals: unknown;
  saved_views: { name: string; config: string }[];
}
