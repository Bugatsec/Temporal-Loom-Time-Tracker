import { db } from "../db/client.js";
import { id } from "../db/ids.js";
import type { Project } from "../types.js";

const DEFAULT_WORKSPACE_ID = "ws_default";

export function listProjects(includeArchived = false): Project[] {
  const where = includeArchived ? "" : "WHERE archived_at IS NULL";
  return db.prepare(`SELECT * FROM projects ${where} ORDER BY name`).all() as Project[];
}

export function getProject(projectId: string): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Project | undefined;
}

export function createProject(name: string, color?: string): Project {
  const newId = id("proj");
  db.prepare(
    `INSERT INTO projects (id, workspace_id, name, color) VALUES (?, ?, ?, ?)`
  ).run(newId, DEFAULT_WORKSPACE_ID, name, color ?? null);
  return getProject(newId)!;
}

export function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "color">>
): Project | undefined {
  const current = getProject(projectId);
  if (!current) return undefined;

  db.prepare(
    `UPDATE projects SET name = ?, color = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).run(updates.name ?? current.name, updates.color ?? current.color, projectId);

  return getProject(projectId);
}

export function archiveProject(projectId: string): void {
  db.prepare(
    `UPDATE projects SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).run(projectId);
}
