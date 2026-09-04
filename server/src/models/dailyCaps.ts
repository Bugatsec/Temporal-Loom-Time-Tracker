import { db } from "../db/client.js";
import { id } from "../db/ids.js";

const DEFAULT_WORKSPACE_ID = "ws_default";

export interface DailyCaps {
  id: string;
  workspace_id: string;
  minimum_seconds: number | null;
  max_seconds: number | null;
  extreme_seconds: number | null;
  updated_at: string;
}

export function getDailyCaps(): DailyCaps | undefined {
  return db.prepare(`SELECT * FROM daily_caps WHERE workspace_id = ?`).get(DEFAULT_WORKSPACE_ID) as
    | DailyCaps
    | undefined;
}

export function setDailyCaps(updates: {
  minimum_seconds?: number | null;
  max_seconds?: number | null;
  extreme_seconds?: number | null;
}): DailyCaps {
  const current = getDailyCaps();
  const next = {
    minimum_seconds: updates.minimum_seconds !== undefined ? updates.minimum_seconds : current?.minimum_seconds ?? null,
    max_seconds: updates.max_seconds !== undefined ? updates.max_seconds : current?.max_seconds ?? null,
    extreme_seconds: updates.extreme_seconds !== undefined ? updates.extreme_seconds : current?.extreme_seconds ?? null,
  };

  if (current) {
    db.prepare(
      `UPDATE daily_caps SET minimum_seconds = ?, max_seconds = ?, extreme_seconds = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    ).run(next.minimum_seconds, next.max_seconds, next.extreme_seconds, current.id);
    return { ...current, ...next };
  }

  const newId = id("caps");
  db.prepare(
    `INSERT INTO daily_caps (id, workspace_id, minimum_seconds, max_seconds, extreme_seconds) VALUES (?, ?, ?, ?, ?)`
  ).run(newId, DEFAULT_WORKSPACE_ID, next.minimum_seconds, next.max_seconds, next.extreme_seconds);
  return getDailyCaps()!;
}
