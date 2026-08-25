import type { Activity, Project, ProjectBreakdownRow, RangeTotal, TimeEntry } from "./types";

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
    create: (name: string, color?: string) =>
      request<Project>("/projects", { method: "POST", body: JSON.stringify({ name, color }) }),
    archive: (id: string) => request<void>(`/projects/${id}/archive`, { method: "POST" }),
  },
  activities: {
    list: (projectId: string) => request<Activity[]>(`/activities?project_id=${projectId}`),
    create: (project_id: string, name: string, parent_id?: string) =>
      request<Activity>("/activities", { method: "POST", body: JSON.stringify({ project_id, name, parent_id }) }),
  },
  timeEntries: {
    list: (params: Record<string, string> = {}) =>
      request<TimeEntry[]>(`/time-entries?${new URLSearchParams(params)}`),
    running: () => request<TimeEntry | null>("/time-entries/running"),
    start: (project_id: string, activity_id: string, description?: string) =>
      request<TimeEntry>("/time-entries/start", {
        method: "POST",
        body: JSON.stringify({ project_id, activity_id, description }),
      }),
    stop: (id: string) => request<TimeEntry>(`/time-entries/${id}/stop`, { method: "POST" }),
    createManual: (input: {
      project_id: string;
      activity_id: string;
      start_at: string;
      end_at: string;
      description?: string;
    }) => request<TimeEntry>("/time-entries", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, updates: Partial<TimeEntry>) =>
      request<TimeEntry>(`/time-entries/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    remove: (id: string) => request<void>(`/time-entries/${id}`, { method: "DELETE" }),
  },
  reports: {
    summary: (from: string, to: string) =>
      request<RangeTotal>(`/reports/summary?from=${from}&to=${to}`),
    byProject: (from: string, to: string) =>
      request<ProjectBreakdownRow[]>(`/reports/by-project?from=${from}&to=${to}`),
  },
  exportUrl: () => `${BASE}/exports/json`,
};
