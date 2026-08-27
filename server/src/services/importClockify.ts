import { createManualEntry, listEntries } from "../models/timeEntry.js";
import { getOrCreateActivity } from "../models/activity.js";
import { getOrCreateProject } from "../models/project.js";
import { getOrCreateTagDetailed } from "../models/tag.js";
import { parseCsvRecords } from "./csv.js";

export interface ImportSummary {
  rows_read: number;
  entries_imported: number;
  entries_skipped_duplicate: number;
  rows_skipped_invalid: number;
  projects_created: number;
  activities_created: number;
  tags_created: number;
  errors: { row: number; message: string }[];
}

const FALLBACK_PROJECT_NAME = "Uncategorized";
const FALLBACK_ACTIVITY_NAME = "General";

/** Clockify exports "DD/MM/YYYY" + "HH:MM:SS" with no timezone attached.
 *  Converts that wall-clock time, interpreted in the given IANA timezone,
 *  into the correct UTC Date — using only built-in Intl (no dependency).
 *  This replaces an earlier version that assumed the *server's* OS
 *  timezone matched the export, which silently mis-dates entries near
 *  midnight whenever the two don't match (e.g. a server defaulting to UTC
 *  while the export is in IST). The caller now passes the *browser's*
 *  timezone instead, which is what actually matches the Clockify account. */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  // Guess the UTC instant naively, then ask Intl what wall-clock time that
  // instant displays as in the target zone. The difference between the
  // guess and that displayed time is the zone's offset at this date
  // (handles DST correctly, though not relevant for India).
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcGuess)).map((p) => [p.type, p.value]));
  const displayedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = utcGuess - displayedAsUtc;
  return new Date(utcGuess + offsetMs);
}

function parseClockifyDateTime(dateStr: string, timeStr: string, timeZone: string): Date | null {
  const dateParts = dateStr.split("/");
  const timeParts = timeStr.split(":");
  if (dateParts.length !== 3 || timeParts.length !== 3) return null;

  const [day, month, year] = dateParts.map(Number);
  const [hour, minute, second] = timeParts.map(Number);
  if ([day, month, year, hour, minute, second].some((n) => Number.isNaN(n))) return null;

  try {
    const date = zonedWallClockToUtc(year, month, day, hour, minute, second, timeZone);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null; // invalid IANA zone name — caller falls back
  }
}

/** Fast in-memory duplicate check for entries already tagged source='imported'
 *  with the same project/activity/start/end -- makes re-running an import
 *  on the same file a safe no-op instead of doubling every entry. */
function buildExistingImportedKeys(): Set<string> {
  const existing = listEntries({ limit: 100000 }).filter((e) => e.source === "imported");
  return new Set(existing.map((e) => `${e.project_id}|${e.activity_id}|${e.start_at}|${e.end_at}`));
}

export function importClockifyCsv(csvText: string, timeZone: string): ImportSummary {
  const records = parseCsvRecords(csvText);
  const summary: ImportSummary = {
    rows_read: records.length,
    entries_imported: 0,
    entries_skipped_duplicate: 0,
    rows_skipped_invalid: 0,
    projects_created: 0,
    activities_created: 0,
    tags_created: 0,
    errors: [],
  };

  const activityIdByProjectId = new Map<string, string>();
  const existingKeys = buildExistingImportedKeys();

  records.forEach((record, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header row

    const projectName = (record["Project"] || "").trim() || FALLBACK_PROJECT_NAME;
    const description = (record["Description"] || "").trim() || undefined;
    const tagsRaw = (record["Tags"] || "").trim();
    const startDate = record["Start Date"];
    const startTime = record["Start Time"];
    const endDate = record["End Date"];
    const endTime = record["End Time"];

    const start = parseClockifyDateTime(startDate, startTime, timeZone);
    const end = parseClockifyDateTime(endDate, endTime, timeZone);

    if (!start || !end) {
      summary.rows_skipped_invalid++;
      summary.errors.push({ row: rowNum, message: "Could not parse start/end date-time" });
      return;
    }
    if (end.getTime() < start.getTime()) {
      summary.rows_skipped_invalid++;
      summary.errors.push({ row: rowNum, message: "End time is before start time" });
      return;
    }

    const { project, created: projectCreated } = getOrCreateProject(projectName);
    if (projectCreated) summary.projects_created++;

    let activityId = activityIdByProjectId.get(project.id);
    if (!activityId) {
      const { activity, created: activityCreated } = getOrCreateActivity(project.id, FALLBACK_ACTIVITY_NAME);
      if (activityCreated) summary.activities_created++;
      activityId = activity.id;
      activityIdByProjectId.set(project.id, activityId);
    }

    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const dedupeKey = `${project.id}|${activityId}|${startIso}|${endIso}`;
    if (existingKeys.has(dedupeKey)) {
      summary.entries_skipped_duplicate++;
      return;
    }

    const tagNames = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    for (const tagName of tagNames) {
      const { created } = getOrCreateTagDetailed(tagName);
      if (created) summary.tags_created++;
    }

    createManualEntry({
      project_id: project.id,
      activity_id: activityId,
      start_at: startIso,
      end_at: endIso,
      description,
      source: "imported",
      tags: tagNames,
    });

    existingKeys.add(dedupeKey);
    summary.entries_imported++;
  });

  return summary;
}
