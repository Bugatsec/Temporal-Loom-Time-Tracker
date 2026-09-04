import { db } from "./client.js";

interface ColumnInfo {
  name: string;
}

function hasColumn(table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
  return columns.some((c) => c.name === column);
}

/** Additive, idempotent column migrations for databases created before a
 *  given column existed in schema.sql. Safe to run on every boot — each
 *  check is a no-op once the column is present. */
export function runMigrations(): void {
  if (!hasColumn("tags", "color")) {
    db.exec(`ALTER TABLE tags ADD COLUMN color TEXT`);
  }
  if (!hasColumn("tags", "parent_id")) {
    db.exec(`ALTER TABLE tags ADD COLUMN parent_id TEXT REFERENCES tags(id) ON DELETE SET NULL`);
  }
  if (!hasColumn("goals", "period")) {
    // Existing rows are all daily goals — that's the only kind that
    // existed before period goals were added, so the default backfills
    // them correctly with no further action needed.
    db.exec(`ALTER TABLE goals ADD COLUMN period TEXT NOT NULL DEFAULT 'daily'`);
  }
}
