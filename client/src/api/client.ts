import type {
  Activity,
  ActivityRollupRow,
  DailyCaps,
  Goal,
  GoalPeriod,
  GoalStatusBundle,
  Project,
  ProjectBreakdownRow,
  RangeTotal,
  SavedView,
  Tag,
  TimeEntry,
} from "./types";
import type { ImportSummary, SettingsExportPayload, SettingsImportSummary, WorkspaceImportSummary } from "./importTypes";

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
    update: (id: string, updates: Partial<Pick<Project, "name" | "color">>) =>
      request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    archive: (id: string) => request<void>(`/projects/${id}/archive`, { method: "POST" }),
  },
  activities: {
    list: (projectId: string) => request<Activity[]>(`/activities?project_id=${projectId}`),
    create: (project_id: string, name: string, parent_id?: string) =>
      request<Activity>("/activities", { method: "POST", body: JSON.stringify({ project_id, name, parent_id }) }),
    update: (id: string, updates: Partial<Pick<Activity, "name" | "color" | "parent_id">>) =>
      request<Activity>(`/activities/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  },
  tags: {
    list: () => request<Tag[]>("/tags"),
    create: (name: string, color?: string, parent_id?: string | null) =>
      request<Tag>("/tags", { method: "POST", body: JSON.stringify({ name, color, parent_id }) }),
    update: (id: string, updates: Partial<Pick<Tag, "name" | "color" | "parent_id">>) =>
      request<Tag>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    remove: (id: string) => request<void>(`/tags/${id}`, { method: "DELETE" }),
  },
  goals: {
    get: (period: GoalPeriod) => request<{ overall: Goal | null; byProject: Goal[] }>(`/goals/${period}`),
    setOverall: (period: GoalPeriod, targetSeconds: number) =>
      request<Goal>(`/goals/${period}/overall`, {
        method: "PUT",
        body: JSON.stringify({ target_seconds: targetSeconds }),
      }),
    removeOverall: (period: GoalPeriod) => request<void>(`/goals/${period}/overall`, { method: "DELETE" }),
    setProject: (period: GoalPeriod, projectId: string, targetSeconds: number) =>
      request<Goal>(`/goals/${period}/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ target_seconds: targetSeconds }),
      }),
    removeProject: (period: GoalPeriod, projectId: string) =>
      request<void>(`/goals/${period}/project/${projectId}`, { method: "DELETE" }),
    getCaps: () => request<DailyCaps | null>("/goals/caps"),
    setCaps: (updates: { minimum_seconds?: number | null; max_seconds?: number | null; extreme_seconds?: number | null }) =>
      request<DailyCaps>("/goals/caps", { method: "PUT", body: JSON.stringify(updates) }),
    status: (timeZone: string) => request<GoalStatusBundle>(`/goals/status?timeZone=${encodeURIComponent(timeZone)}`),
  },
  timeEntries: {
    list: (params: Record<string, string> = {}) =>
      request<TimeEntry[]>(`/time-entries?${new URLSearchParams(params)}`),
    running: () => request<TimeEntry | null>("/time-entries/running"),
    start: (input: { project_id: string; activity_id: string; description?: string; tags?: string[] }) =>
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
    update: (id: string, updates: Partial<Omit<TimeEntry, "tags">> & { tags?: string[] }) =>
      request<TimeEntry>(`/time-entries/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    remove: (id: string) => request<void>(`/time-entries/${id}`, { method: "DELETE" }),
  },
  reports: {
    summary: (from: string, to: string) => request<RangeTotal>(`/reports/summary?from=${from}&to=${to}`),
    byProject: (from: string, to: string) =>
      request<ProjectBreakdownRow[]>(`/reports/by-project?from=${from}&to=${to}`),
    byActivity: (from: string, to: string, projectId?: string) =>
      request<ActivityRollupRow[]>(
        `/reports/by-activity?from=${from}&to=${to}${projectId ? `&project_id=${projectId}` : ""}`
      ),
    exportCsvUrl: (from: string, to: string) => `${BASE}/reports/export.csv?from=${from}&to=${to}`,
    exportHtmlUrl: (from: string, to: string) => `${BASE}/reports/export.html?from=${from}&to=${to}`,
    exportPdfUrl: (from: string, to: string) => `${BASE}/reports/export.pdf?from=${from}&to=${to}`,
  },
  savedViews: {
    list: () => request<SavedView[]>("/saved-views"),
    create: (name: string, config: unknown) =>
      request<SavedView>("/saved-views", { method: "POST", body: JSON.stringify({ name, config }) }),
    remove: (id: string) => request<void>(`/saved-views/${id}`, { method: "DELETE" }),
  },
  imports: {
    clockify: (csv: string, timeZone: string) =>
      request<ImportSummary>("/imports/clockify", { method: "POST", body: JSON.stringify({ csv, timeZone }) }),
    temporalLoom: (data: unknown) =>
      request<WorkspaceImportSummary>("/imports/temporal-loom", { method: "POST", body: JSON.stringify(data) }),
    settings: (data: unknown) =>
      request<SettingsImportSummary>("/imports/settings", { method: "POST", body: JSON.stringify(data) }),
  },
  exportUrl: () => `${BASE}/exports/json`,
  settingsExportUrl: () => `${BASE}/exports/settings.json`,
  clockifyExportUrl: (timeZone: string) => `${BASE}/exports/clockify.csv?timeZone=${encodeURIComponent(timeZone)}`,
  fetchSettingsExport: () => request<SettingsExportPayload>("/exports/settings.json"),
};
