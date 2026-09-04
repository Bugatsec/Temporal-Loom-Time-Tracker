import { db } from "../db/client.js";
import { listEntries } from "../models/timeEntry.js";
import { DEFAULT_WORKSPACE_ID } from "../models/workspace.js";
import { toCsv } from "./csv.js";
import { formatInZone } from "../utils/timezone.js";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(y: number, m: number, d: number): string {
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

function formatTime(h: number, m: number, s: number): string {
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function hms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/** Builds a CSV in the exact column shape Clockify's own import accepts,
 *  the reverse of importClockify.ts. "General" — the internal fallback
 *  task used when no specific task was picked — is written back out as a
 *  blank Task, matching what a real Clockify export looks like when no
 *  task was ever set, rather than leaking our own implementation detail
 *  into the file. Client/User/Group/Email are left blank since we don't
 *  track any of that; inventing values would be worse than an empty cell. */
export function buildClockifyExportCsv(timeZone: string): string {
  const projects = db.prepare(`SELECT id, name FROM projects WHERE workspace_id = ?`).all(DEFAULT_WORKSPACE_ID) as {
    id: string;
    name: string;
  }[];
  const activities = db
    .prepare(
      `SELECT a.id, a.name FROM activities a JOIN projects p ON p.id = a.project_id WHERE p.workspace_id = ?`
    )
    .all(DEFAULT_WORKSPACE_ID) as { id: string; name: string }[];
  const projectById = new Map(projects.map((p) => [p.id, p.name]));
  const activityById = new Map(activities.map((a) => [a.id, a.name]));

  const entries = listEntries({ limit: 1000000 }).filter((e) => e.end_at != null);

  const rows: (string | number)[][] = [
    [
      "Project",
      "Client",
      "Description",
      "Task",
      "User",
      "Group",
      "Email",
      "Tags",
      "Start Date",
      "Start Time",
      "End Date",
      "End Time",
      "Duration (h)",
      "Duration (decimal)",
      "Date of creation",
    ],
  ];

  for (const entry of entries) {
    const start = formatInZone(new Date(entry.start_at), timeZone);
    const end = formatInZone(new Date(entry.end_at!), timeZone);
    const created = formatInZone(new Date(entry.created_at), timeZone);
    const activityName = activityById.get(entry.activity_id);
    const taskCell = activityName && activityName !== "General" ? activityName : "";
    const durationSeconds = entry.duration_seconds ?? 0;

    rows.push([
      projectById.get(entry.project_id) ?? "",
      "",
      entry.description ?? "",
      taskCell,
      "",
      "",
      "",
      (entry.tags ?? []).map((t) => t.name).join(", "),
      formatDate(start.year, start.month, start.day),
      formatTime(start.hour, start.minute, start.second),
      formatDate(end.year, end.month, end.day),
      formatTime(end.hour, end.minute, end.second),
      hms(durationSeconds),
      (durationSeconds / 3600).toFixed(2),
      formatDate(created.year, created.month, created.day),
    ]);
  }

  return toCsv(rows);
}
