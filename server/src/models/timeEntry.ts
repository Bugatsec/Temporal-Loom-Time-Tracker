import { db } from "../db/client.js";
import { id } from "../db/ids.js";
import { DEFAULT_WORKSPACE_ID } from "./workspace.js";
import type { TimeEntry, TimeEntrySource } from "../types.js";

export function getEntry(entryId: string): TimeEntry | undefined {
  return db
    .prepare("SELECT * FROM time_entries WHERE id = ? AND deleted_at IS NULL")
    .get(entryId) as TimeEntry | undefined;
}

/** Doc 8.2: "Only one active timer is allowed per configured scope unless
 *  multi-timer mode is explicitly enabled." Stage 1 does not implement
 *  multi-timer mode, so this is the single source of truth for that rule. */
export function getRunningEntry(): TimeEntry | undefined {
  return db
    .prepare(
      `SELECT * FROM time_entries WHERE workspace_id = ? AND end_at IS NULL AND deleted_at IS NULL`
    )
    .get(DEFAULT_WORKSPACE_ID) as TimeEntry | undefined;
}

export interface StartTimerInput {
  project_id: string;
  activity_id: string;
  target_id?: string | null;
  description?: string;
  billable?: boolean;
}

export function startTimer(input: StartTimerInput): TimeEntry {
  const existing = getRunningEntry();
  if (existing) {
    throw Object.assign(new Error("A timer is already running"), {
      code: "TIMER_ALREADY_RUNNING",
      entry: existing,
    });
  }

  const newId = id("te");
  db.prepare(
    `INSERT INTO time_entries
       (id, workspace_id, project_id, target_id, activity_id, start_at, description, billable, source)
     VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?, ?, 'timer')`
  ).run(
    newId,
    DEFAULT_WORKSPACE_ID,
    input.project_id,
    input.target_id ?? null,
    input.activity_id,
    input.description ?? null,
    input.billable ? 1 : 0
  );
  return getEntry(newId)!;
}

export function stopTimer(entryId: string): TimeEntry {
  const entry = getEntry(entryId);
  if (!entry) throw new Error("Entry not found");
  if (entry.end_at) throw new Error("Entry is not running");

  db.prepare(
    `UPDATE time_entries
     SET end_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
         duration_seconds = CAST((julianday(strftime('%Y-%m-%dT%H:%M:%fZ','now')) - julianday(start_at)) * 86400 AS INTEGER),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(entryId);

  return getEntry(entryId)!;
}

export interface CreateManualEntryInput {
  project_id: string;
  activity_id: string;
  target_id?: string | null;
  start_at: string;
  end_at: string;
  description?: string;
  billable?: boolean;
  source?: TimeEntrySource;
}

export function createManualEntry(input: CreateManualEntryInput): TimeEntry {
  const newId = id("te");
  const durationSeconds = Math.round(
    (new Date(input.end_at).getTime() - new Date(input.start_at).getTime()) / 1000
  );
  if (durationSeconds < 0) throw new Error("end_at must be after start_at");

  db.prepare(
    `INSERT INTO time_entries
       (id, workspace_id, project_id, target_id, activity_id, start_at, end_at, duration_seconds, description, billable, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId,
    DEFAULT_WORKSPACE_ID,
    input.project_id,
    input.target_id ?? null,
    input.activity_id,
    input.start_at,
    input.end_at,
    durationSeconds,
    input.description ?? null,
    input.billable ? 1 : 0,
    input.source ?? "manual"
  );
  return getEntry(newId)!;
}

export interface UpdateEntryInput {
  project_id?: string;
  activity_id?: string;
  target_id?: string | null;
  start_at?: string;
  end_at?: string | null;
  description?: string;
  billable?: boolean;
}

/** Doc 8.2: "Manual edits must retain updated_at and source information" —
 *  source is deliberately never overwritten by an edit. */
export function updateEntry(entryId: string, updates: UpdateEntryInput): TimeEntry | undefined {
  const current = getEntry(entryId);
  if (!current) return undefined;

  const next = {
    project_id: updates.project_id ?? current.project_id,
    activity_id: updates.activity_id ?? current.activity_id,
    target_id: updates.target_id !== undefined ? updates.target_id : current.target_id,
    start_at: updates.start_at ?? current.start_at,
    end_at: updates.end_at !== undefined ? updates.end_at : current.end_at,
    description: updates.description ?? current.description,
    billable: updates.billable !== undefined ? (updates.billable ? 1 : 0) : current.billable,
  };

  const durationSeconds = next.end_at
    ? Math.round((new Date(next.end_at).getTime() - new Date(next.start_at).getTime()) / 1000)
    : null;

  db.prepare(
    `UPDATE time_entries
     SET project_id = ?, activity_id = ?, target_id = ?, start_at = ?, end_at = ?,
         duration_seconds = ?, description = ?, billable = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(
    next.project_id,
    next.activity_id,
    next.target_id,
    next.start_at,
    next.end_at,
    durationSeconds,
    next.description,
    next.billable,
    entryId
  );

  return getEntry(entryId);
}

/** Soft delete (doc 8.2 / 10.2) — recoverable, never a hard DELETE from Stage 1 UI. */
export function softDeleteEntry(entryId: string): void {
  db.prepare(
    `UPDATE time_entries SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).run(entryId);
}

export interface ListEntriesFilter {
  from?: string;
  to?: string;
  project_id?: string;
  activity_id?: string;
  limit?: number;
}

export function listEntries(filter: ListEntriesFilter = {}): TimeEntry[] {
  const clauses = ["deleted_at IS NULL", "workspace_id = ?"];
  const params: unknown[] = [DEFAULT_WORKSPACE_ID];

  if (filter.from) {
    clauses.push("start_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push("start_at <= ?");
    params.push(filter.to);
  }
  if (filter.project_id) {
    clauses.push("project_id = ?");
    params.push(filter.project_id);
  }
  if (filter.activity_id) {
    clauses.push("activity_id = ?");
    params.push(filter.activity_id);
  }

  const limit = filter.limit ?? 200;
  return db
    .prepare(
      `SELECT * FROM time_entries WHERE ${clauses.join(" AND ")} ORDER BY start_at DESC LIMIT ?`
    )
    .all(...params, limit) as TimeEntry[];
}
