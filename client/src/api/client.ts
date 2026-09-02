import type { Activity, Project, ProjectBreakdownRow, RangeTotal, Tag, TimeEntry } from "./types";
import type { ImportSummary } from "./importTypes";

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  projects: {
    list: () => request<Project[]>("/projects"),
    // Get-or-create by name — the server dedupes case-insensitively, so
    // this is safe to call both for "create a brand new project" and for
    // "select what might be an existing one" from a combobox.
    create: (name: string, color?: string) =>
      request<Project>("/projects", { method: "POST", body: JSON.stringify({ name, color }) }),
    update: (id: string, updates: Partial<Pick<Project, "name" | "color">>) =>
      request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    archive: (id: string) => request<void>(`/projects/${id}/archive`, { method: "POST" }),
  },
  activities: {
    list: (projectId: string) => request<Activity[]>(`/activities?project_id=${projectId}`),
    create: (project_id: string, name: string, parent_id?: string) =>
      request<Activity>("/activities", { method: "POST", body: JSON.stringify({ project_id, name, parent_id }) }),
  },
  tags: {
    list: () => request<Tag[]>("/tags"),
    create: (name: string, color?: string) =>
      request<Tag>("/tags", { method: "POST", body: JSON.stringify({ name, color }) }),
    update: (id: string, color: string) =>
      request<Tag>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify({ color }) }),
  },
  timeEntries: {
    list: (params: Record<string, string> = {}) =>
      request<TimeEntry[]>(`/time-entries?${new URLSearchParams(params)}`),
    running: () => request<TimeEntry | null>("/time-entries/running"),
    start: (input: {
      project_id: string;
      activity_id: string;
      description?: string;
      tags?: string[];
    }) =>
      request<TimeEntry>("/time-entries/start", { method: "POST", body: JSON.stringify(input) }),
    stop: (id: string) => request<TimeEntry>(`/time-entries/${id}/stop`, { method: "POST" }),
    createManual: (input: {
      project_id: string;
      activity_id: string;
      start_at: string;
      end_at: string;
      description?: string;
      tags?: string[];
    }) => request<TimeEntry>("/time-entries", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, updates: Partial<TimeEntry> & { tags?: string[] }) =>
      request<TimeEntry>(`/time-entries/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    remove: (id: string) => request<void>(`/time-entries/${id}`, { method: "DELETE" }),
  },
  reports: {
    summary: (from: string, to: string) =>
      request<RangeTotal>(`/reports/summary?from=${from}&to=${to}`),
    byProject: (from: string, to: string) =>
      request<ProjectBreakdownRow[]>(`/reports/by-project?from=${from}&to=${to}`),
  },
  imports: {
    clockify: (csv: string) =>
      request<ImportSummary>("/imports/clockify", { method: "POST", body: JSON.stringify({ csv }) }),
  },
  exportUrl: () => `${BASE}/exports/json`,
};
