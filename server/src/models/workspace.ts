import { db } from "../db/client.js";
import type { Workspace } from "../types.js";

export const DEFAULT_WORKSPACE_ID = "ws_default";

export function getDefaultWorkspace(): Workspace {
  return db.prepare("SELECT * FROM workspaces WHERE id = ?").get(DEFAULT_WORKSPACE_ID) as Workspace;
}

export function listWorkspaces(): Workspace[] {
  return db.prepare("SELECT * FROM workspaces ORDER BY name").all() as Workspace[];
}
