import { db } from "../db/client.js";
import { nextColor } from "../db/colors.js";
import { id } from "../db/ids.js";
import type { Tag } from "../types.js";

const DEFAULT_WORKSPACE_ID = "ws_default";

export function listTags(): Tag[] {
  return db.prepare(`SELECT * FROM tags WHERE workspace_id = ? ORDER BY name`).all(DEFAULT_WORKSPACE_ID) as Tag[];
}

export function getTag(tagId: string): Tag | undefined {
  return db.prepare("SELECT * FROM tags WHERE id = ?").get(tagId) as Tag | undefined;
}

export function findTagByName(name: string): Tag | undefined {
  return db
    .prepare(`SELECT * FROM tags WHERE workspace_id = ? AND lower(name) = lower(?)`)
    .get(DEFAULT_WORKSPACE_ID, name) as Tag | undefined;
}

function tagCount(): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM tags WHERE workspace_id = ?`).get(DEFAULT_WORKSPACE_ID) as {
    n: number;
  };
  return row.n;
}

export function createTag(name: string, color?: string): Tag {
  const newId = id("tag");
  db.prepare(`INSERT INTO tags (id, workspace_id, name, color) VALUES (?, ?, ?, ?)`).run(
    newId,
    DEFAULT_WORKSPACE_ID,
    name,
    color ?? nextColor(tagCount())
  );
  return getTag(newId)!;
}

export function getOrCreateTag(name: string, color?: string): Tag {
  return getOrCreateTagDetailed(name, color).tag;
}

export function getOrCreateTagDetailed(name: string, color?: string): { tag: Tag; created: boolean } {
  const existing = findTagByName(name);
  if (existing) return { tag: existing, created: false };
  return { tag: createTag(name, color), created: true };
}

export function updateTagColor(tagId: string, color: string): Tag | undefined {
  db.prepare(`UPDATE tags SET color = ? WHERE id = ?`).run(color, tagId);
  return getTag(tagId);
}
