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

export function createTag(name: string, color?: string, parentId?: string | null): Tag {
  const newId = id("tag");
  db.prepare(`INSERT INTO tags (id, workspace_id, name, color, parent_id) VALUES (?, ?, ?, ?, ?)`).run(
    newId,
    DEFAULT_WORKSPACE_ID,
    name,
    color ?? nextColor(tagCount()),
    parentId ?? null
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

export function updateTag(
  tagId: string,
  updates: { name?: string; color?: string; parent_id?: string | null }
): Tag | undefined {
  const current = getTag(tagId);
  if (!current) return undefined;
  db.prepare(`UPDATE tags SET name = ?, color = ?, parent_id = ? WHERE id = ?`).run(
    updates.name ?? current.name,
    updates.color ?? current.color,
    updates.parent_id !== undefined ? updates.parent_id : current.parent_id,
    tagId
  );
  return getTag(tagId);
}

/** Kept for compatibility with existing callers that only touch color. */
export function updateTagColor(tagId: string, color: string): Tag | undefined {
  return updateTag(tagId, { color });
}

/** Un-parents any children first (SET NULL via FK would do this too, but
 *  being explicit keeps the behavior obvious rather than relying on the
 *  FK action alone), then removes the tag and its entry associations. */
export function deleteTag(tagId: string): void {
  db.prepare(`UPDATE tags SET parent_id = NULL WHERE parent_id = ?`).run(tagId);
  db.prepare(`DELETE FROM time_entry_tags WHERE tag_id = ?`).run(tagId);
  db.prepare(`DELETE FROM tags WHERE id = ?`).run(tagId);
}
