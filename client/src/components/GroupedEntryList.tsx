import { useMemo, useState } from "react";
import { ColorDot } from "./ColorDot";
import { useTimer } from "../context/TimerContext";
import type { Activity, Project, TimeEntry } from "../api/types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayLabel(dateKey: string): string {
  const today = localDateKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday.toISOString());

  if (dateKey === today) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "running...";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface ProjectGroup {
  key: string;
  projectId: string;
  activityId: string;
  entries: TimeEntry[];
  totalSeconds: number;
}

interface DayGroup {
  dateKey: string;
  totalSeconds: number;
  projectGroups: ProjectGroup[];
}

function buildGroups(entries: TimeEntry[], groupByDay: boolean): DayGroup[] {
  const dayMap = new Map<string, Map<string, ProjectGroup>>();

  for (const entry of entries) {
    const dateKey = groupByDay ? localDateKey(entry.start_at) : "all";
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, new Map());
    const projectMap = dayMap.get(dateKey)!;

    const groupKey = entry.project_id + "::" + entry.activity_id;
    if (!projectMap.has(groupKey)) {
      projectMap.set(groupKey, {
        key: dateKey + "::" + groupKey,
        projectId: entry.project_id,
        activityId: entry.activity_id,
        entries: [],
        totalSeconds: 0,
      });
    }
    const group = projectMap.get(groupKey)!;
    group.entries.push(entry);
    group.totalSeconds += entry.duration_seconds ?? 0;
  }

  const days: DayGroup[] = [];
  for (const [dateKey, projectMap] of dayMap) {
    const projectGroups = Array.from(projectMap.values()).sort(
      (a, b) => b.totalSeconds - a.totalSeconds
    );
    const totalSeconds = projectGroups.reduce((sum, g) => sum + g.totalSeconds, 0);
    days.push({ dateKey, totalSeconds, projectGroups });
  }
  return days.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
}

interface GroupedEntryListProps {
  entries: TimeEntry[];
  projects: Project[];
  activities: Activity[];
  groupByDay?: boolean;
  onDelete?: (id: string) => void;
}

export function GroupedEntryList({
  entries,
  projects,
  activities,
  groupByDay = true,
  onDelete,
}: GroupedEntryListProps) {
  const { running, start, stop } = useTimer();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const days = useMemo(() => buildGroups(entries, groupByDay), [entries, groupByDay]);
  const project = (id: string) => projects.find((p) => p.id === id);
  const activity = (id: string) => activities.find((a) => a.id === id);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function replay(entry: TimeEntry) {
    if (running) await stop().catch(() => {});
    await start({
      project_id: entry.project_id,
      activity_id: entry.activity_id,
      description: entry.description ?? undefined,
      tags: entry.tags?.map((t) => t.name) ?? [],
    }).catch(() => {});
  }

  if (entries.length === 0) {
    return <div className="empty-state">No time entries yet — start the timer or add one manually.</div>;
  }

  return (
    <div className="grouped-entries">
      {days.map((day) => (
        <div key={day.dateKey} className="day-section">
          {groupByDay && (
            <div className="day-header">
              <span>{dayLabel(day.dateKey)}</span>
              <span className="mono dim">Total: {formatDuration(day.totalSeconds)}</span>
            </div>
          )}
          {day.projectGroups.map((group) => {
            const p = project(group.projectId);
            const a = activity(group.activityId);
            const isOpen = expanded.has(group.key);
            const latest = group.entries[0];
            const label = a && a.name !== "General" ? p?.name + ": " + a.name : p?.name ?? "?";

            return (
              <div key={group.key} className="entry-group">
                <div className="entry-row entry-row-summary" onClick={() => toggle(group.key)}>
                  <span className="entry-main">
                    <ColorDot color={p?.color} />
                    <span>{label}</span>
                    {group.entries.length > 1 && (
                      <span className="entry-count-badge">{group.entries.length}</span>
                    )}
                  </span>
                  <span className="entry-side">
                    {group.entries.length > 1 && group.entries[0].description && (
                      <span className="dim" style={{ fontSize: 12 }}>
                        {group.entries[0].description}
                      </span>
                    )}
                    <span className="mono">{formatDuration(group.totalSeconds)}</span>
                    <button
                      className="entry-play"
                      onClick={(e) => {
                        e.stopPropagation();
                        replay(latest);
                      }}
                      title="Start this again"
                    >
                      &#9654;
                    </button>
                  </span>
                </div>

                {isOpen && (
                  <div className="entry-subrows">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="entry-row entry-row-detail">
                        <span className="entry-main">
                          <span className="mono dim" style={{ minWidth: 100 }}>
                            {formatClock(entry.start_at)}
                            {entry.end_at ? " - " + formatClock(entry.end_at) : " - running"}
                          </span>
                          <span className="dim">{entry.description || "—"}</span>
                          {entry.tags && entry.tags.length > 0 && (
                            <span style={{ display: "flex", gap: 4 }}>
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="tag-pill"
                                  style={{
                                    background: (tag.color || "#666") + "26",
                                    color: tag.color || "var(--ink)",
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        <span className="entry-side">
                          <span className="mono">{formatDuration(entry.duration_seconds)}</span>
                          <button className="entry-play" onClick={() => replay(entry)} title="Start this again">
                            &#9654;
                          </button>
                          {onDelete && (
                            <button className="danger" onClick={() => onDelete(entry.id)}>
                              Delete
                            </button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
