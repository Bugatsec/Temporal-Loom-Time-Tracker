import { db } from "../db/client.js";
import { id } from "../db/ids.js";

const DEFAULT_WORKSPACE_ID = "ws_default";

export interface SavedView {
  id: string;
  workspace_id: string;
  name: string;
  config: string; // opaque JSON, shaped by the client
  created_at: string;
}

export function listSavedViews(): SavedView[] {
  return db
    .prepare(`SELECT * FROM saved_views WHERE workspace_id = ? ORDER BY created_at DESC`)
    .all(DEFAULT_WORKSPACE_ID) as SavedView[];
}

export function createSavedView(name: string, config: unknown): SavedView {
  const newId = id("view");
  db.prepare(`INSERT INTO saved_views (id, workspace_id, name, config) VALUES (?, ?, ?, ?)`).run(
    newId,
    DEFAULT_WORKSPACE_ID,
    name,
    JSON.stringify(config)
  );
  return db.prepare(`SELECT * FROM saved_views WHERE id = ?`).get(newId) as SavedView;
}

export function deleteSavedView(viewId: string): void {
  db.prepare(`DELETE FROM saved_views WHERE id = ?`).run(viewId);
}
