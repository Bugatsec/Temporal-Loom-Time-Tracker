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
