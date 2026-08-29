import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useTimer } from "../context/TimerContext";
import {
  dayLabel,
  formatDurationClock,
  localDateKey,
  startOfWeek,
  weekLabel,
} from "../utils/date";
import { ColorDot } from "./ColorDot";
import { ProjectTaskPicker, type ProjectTaskSelection } from "./ProjectTaskPicker";
import { TagPicker } from "./TagPicker";
import type { Activity, Project, Tag, TimeEntry } from "../api/types";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "running...";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function timeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Re-combines an existing entry's date with a new HH:MM — editing is
 *  time-only (same day), matching what the row's UI actually exposes. */
function combineDateAndTime(originalIso: string, timeStr: string): string {
  const d = new Date(originalIso);
  const [h, m] = timeStr.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

interface EntryGroup {
  key: string;
  projectId: string;
  activityId: string;
  description: string | null;
  entries: TimeEntry[];
  totalSeconds: number;
}

interface DayGroup {
  dateKey: string;
  totalSeconds: number;
  groups: EntryGroup[];
}

interface WeekGroup {
  weekKey: string;
  weekStart: Date;
  totalSeconds: number;
  days: DayGroup[];
}

function buildDayGroups(entries: TimeEntry[]): DayGroup[] {
  const dayMap = new Map<string, Map<string, EntryGroup>>();

  for (const entry of entries) {
    const dateKey = localDateKey(entry.start_at);
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, new Map());
    const groupMap = dayMap.get(dateKey)!;

    // Matches Clockify's own grouping: same project + task + description
    // collapse into one row, even across different times of day.
    const groupKey = `${entry.project_id}::${entry.activity_id}::${entry.description ?? ""}`;
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        key: `${dateKey}::${groupKey}`,
        projectId: entry.project_id,
        activityId: entry.activity_id,
        description: entry.description,
        entries: [],
        totalSeconds: 0,
      });
    }
    const group = groupMap.get(groupKey)!;
    group.entries.push(entry);
    group.totalSeconds += entry.duration_seconds ?? 0;
  }

  const days: DayGroup[] = [];
  for (const [dateKey, groupMap] of dayMap) {
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const aLatest = Math.max(...a.entries.map((e) => new Date(e.start_at).getTime()));
      const bLatest = Math.max(...b.entries.map((e) => new Date(e.start_at).getTime()));
      return bLatest - aLatest;
    });
    const totalSeconds = groups.reduce((sum, g) => sum + g.totalSeconds, 0);
    days.push({ dateKey, totalSeconds, groups });
  }
  return days.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
}

function buildWeekGroups(days: DayGroup[]): WeekGroup[] {
  const weekMap = new Map<string, WeekGroup>();
  for (const day of days) {
    const [y, m, d] = day.dateKey.split("-").map(Number);
    const dayDate = new Date(y, m - 1, d);
    const weekStart = startOfWeek(dayDate);
    const weekKey = localDateKey(weekStart.toISOString());
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { weekKey, weekStart, totalSeconds: 0, days: [] });
    }
    const week = weekMap.get(weekKey)!;
    week.days.push(day);
    week.totalSeconds += day.totalSeconds;
  }
  return Array.from(weekMap.values()).sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1));
}

interface GroupedEntryListProps {
  entries: TimeEntry[];
  projects: Project[];
  activities: Activity[];
  groupByDay?: boolean;
  groupByWeek?: boolean;
  onChanged?: () => void;
}

export function GroupedEntryList({
  entries,
  projects,
  activities,
  groupByDay = true,
  groupByWeek = false,
  onChanged,
}: GroupedEntryListProps) {
  const { running, start, stop } = useTimer();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<Tag[]>([]);

  useEffect(() => {
    api.tags.list().then(setAllTags);
  }, []);

  const days = useMemo(() => buildDayGroups(entries), [entries]);
  const weeks = useMemo(() => (groupByWeek ? buildWeekGroups(days) : []), [days, groupByWeek]);
  const project = (id: string) => projects.find((p) => p.id === id);

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

  async function handleDelete(id: string) {
    await api.timeEntries.remove(id);
    onChanged?.();
  }

  function renderDayBox(day: DayGroup) {
    return (
      <div key={day.dateKey} className="day-box">
        {groupByDay && (
          <div className="day-header">
            <span>{dayLabel(day.dateKey)}</span>
            <span className="mono">Total: {formatDurationClock(day.totalSeconds)}</span>
          </div>
        )}
        {day.groups.map((group) => {
          const p = project(group.projectId);
          const isOpen = expanded.has(group.key);
          const latest = group.entries[0];

          return (
            <div key={group.key} className="entry-group">
              <div className="entry-row entry-row-summary" onClick={() => toggle(group.key)}>
                {group.entries.length > 1 ? (
                  <span className="entry-count-badge">{group.entries.length}</span>
                ) : (
                  <span className="entry-count-spacer" />
                )}
                <span className="entry-description">{group.description || "(no description)"}</span>
                <span className="entry-project">
                  <ColorDot color={p?.color} />
                  {p?.name ?? "?"}
                </span>
                <span className="entry-tags-cell">
                  {latest.tags && latest.tags.length > 0 && (
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Array.from(new Map(latest.tags.map((t) => [t.id, t])).values()).map((tag) => (
                        <span
                          key={tag.id}
                          className="tag-pill"
                          style={{ background: (tag.color || "#666") + "26", color: tag.color || "var(--ink)" }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="entry-time-range mono dim">
                  {group.entries.length === 1
                    ? `${formatClock(latest.start_at)} - ${latest.end_at ? formatClock(latest.end_at) : "running"}`
                    : ""}
                </span>
                <span className="mono entry-total">{formatDuration(group.totalSeconds)}</span>
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
                {group.entries.length === 1 ? (
                  <button
                    className="entry-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(latest.id);
                    }}
                    title="Delete"
                  >
                    &#128465;
                  </button>
                ) : (
                  <span />
                )}
              </div>

              {isOpen && (
                <div className="entry-subrows">
                  {group.entries.map((entry) => (
                    <EntryDetailRow
                      key={entry.id}
                      entry={entry}
                      projects={projects}
                      activities={activities}
                      allTags={allTags}
                      onSaved={() => onChanged?.()}
                      onDelete={() => handleDelete(entry.id)}
                      onReplay={() => replay(entry)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (entries.length === 0) {
    return <div className="empty-state">No time entries yet — start the timer or add one manually.</div>;
  }

  if (groupByWeek) {
    return (
      <div className="grouped-entries">
        {weeks.map((week) => (
          <div key={week.weekKey} className="week-section">
            <div className="week-header">
              <span>{weekLabel(week.weekStart)}</span>
              <span className="mono">Week total: {formatDurationClock(week.totalSeconds)}</span>
            </div>
            {week.days.map(renderDayBox)}
          </div>
        ))}
      </div>
    );
  }

  return <div className="grouped-entries">{days.map(renderDayBox)}</div>;
}

interface EntryDetailRowProps {
  entry: TimeEntry;
  projects: Project[];
  activities: Activity[];
  allTags: Tag[];
  onSaved: () => void;
  onDelete: () => void;
  onReplay: () => void;
}

/** Every field here is always directly editable — no separate "Edit mode"
 *  to enter first. Description and times are low-chrome inputs (invisible
 *  border until hovered/focused, so they read as plain text at rest);
 *  project/task and tags reuse their existing picker triggers. Each field
 *  saves independently on change/blur. */
function EntryDetailRow({ entry, projects, activities, allTags, onSaved, onDelete, onReplay }: EntryDetailRowProps) {
  const p = projects.find((pr) => pr.id === entry.project_id);
  const a = activities.find((ac) => ac.id === entry.activity_id);

  const [selection, setSelection] = useState<ProjectTaskSelection | null>(
    p && a ? { project: p, activity: a } : null
  );
  const [description, setDescription] = useState(entry.description ?? "");
  const [tags, setTags] = useState<Tag[]>(entry.tags ?? []);
  const [startTime, setStartTime] = useState(timeInputValue(entry.start_at));
  const [endTime, setEndTime] = useState(entry.end_at ? timeInputValue(entry.end_at) : "");

  async function saveField(updates: Parameters<typeof api.timeEntries.update>[1]) {
    await api.timeEntries.update(entry.id, updates);
    onSaved();
  }

  function handleProjectTaskChange(sel: ProjectTaskSelection) {
    setSelection(sel);
    saveField({ project_id: sel.project.id, activity_id: sel.activity.id });
  }

  function handleDescriptionBlur() {
    if (description !== (entry.description ?? "")) {
      saveField({ description: description || undefined });
    }
  }

  function handleTagsChange(next: Tag[]) {
    setTags(next);
    saveField({ tags: next.map((t) => t.name) });
  }

  function handleStartBlur() {
    if (startTime && startTime !== timeInputValue(entry.start_at)) {
      saveField({ start_at: combineDateAndTime(entry.start_at, startTime) });
    }
  }

  function handleEndBlur() {
    if (endTime && endTime !== (entry.end_at ? timeInputValue(entry.end_at) : "")) {
      saveField({ end_at: combineDateAndTime(entry.end_at ?? entry.start_at, endTime) });
    }
  }

  return (
    <div className="entry-row entry-row-detail" onClick={(e) => e.stopPropagation()}>
      <span className="entry-count-spacer" />
      <input
        type="text"
        className="inline-edit-field"
        value={description}
        placeholder="(no description)"
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleDescriptionBlur}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <ProjectTaskPicker value={selection} onChange={handleProjectTaskChange} />
      <TagPicker
        allTags={allTags}
        selected={tags}
        onChange={handleTagsChange}
        onCreate={async (name) => api.tags.create(name)}
      />
      <span className="entry-time-inline">
        <input type="time" className="inline-edit-field" value={startTime} onChange={(e) => setStartTime(e.target.value)} onBlur={handleStartBlur} />
        <span className="dim">-</span>
        <input type="time" className="inline-edit-field" value={endTime} onChange={(e) => setEndTime(e.target.value)} onBlur={handleEndBlur} />
      </span>
      <span className="mono entry-total">{formatDuration(entry.duration_seconds)}</span>
      <button className="entry-play" onClick={onReplay} title="Start this again">
        &#9654;
      </button>
      <button className="entry-menu-btn" onClick={onDelete} title="Delete">
        &#128465;
      </button>
    </div>
  );
}
