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
}
