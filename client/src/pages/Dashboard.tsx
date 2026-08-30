import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { RangePicker } from "../components/RangePicker";
import { localDateKey } from "../utils/date";
import { formatTotal } from "../utils/format";
import { rangeForPreset, type RangePreset } from "../utils/range";
import type { Activity, Project, TimeEntry } from "../api/types";

interface DailyTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  projectById: Map<string, Project>;
}

/** Recharts renders one payload row per <Bar>, always — even for projects
 *  that logged nothing that day. Filter those out so the tooltip only
 *  shows what was actually worked on. */
function DailyTooltip({ active, payload, label, projectById }: DailyTooltipProps) {
  if (!active || !payload) return null;
  const logged = payload.filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  if (logged.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 6,
        fontSize: 12,
        padding: "8px 10px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 6,
          paddingBottom: 6,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span className="dim">{label}</span>
        <span className="mono" style={{ fontWeight: 600 }}>
          {logged.reduce((sum, p) => sum + p.value, 0).toFixed(2)}h
        </span>
      </div>
      {logged.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span>{projectById.get(p.dataKey)?.name ?? p.dataKey}</span>
          <span className="mono">{p.value.toFixed(2)}h</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [rangeValue, setRangeValue] = useState<{
    preset: RangePreset;
    anchor: Date;
    customFrom?: Date;
    customTo?: Date;
  }>({ preset: "this_month", anchor: new Date() });
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const range = rangeForPreset(rangeValue.preset, rangeValue.anchor, rangeValue.customFrom, rangeValue.customTo);

  useEffect(() => {
    api.projects.list().then(setProjects);
  }, []);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  useEffect(() => {
    api.timeEntries
      .list({ from: range.from.toISOString(), to: range.to.toISOString(), limit: "5000" })
      .then(setEntries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeValue.preset, rangeValue.anchor.getTime(), rangeValue.customFrom?.getTime(), rangeValue.customTo?.getTime()]);

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const activityById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.project_id, (map.get(e.project_id) ?? 0) + (e.duration_seconds ?? 0));
    return Array.from(map.entries())
      .map(([projectId, seconds]) => ({ projectId, seconds, project: projectById.get(projectId) }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [entries, projectById]);

  const byActivityName = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const name = activityById.get(e.activity_id)?.name ?? "—";
      if (name === "General") continue;
      map.set(name, (map.get(name) ?? 0) + (e.duration_seconds ?? 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries, activityById]);

  const topProject = byProject[0];
  const topActivity = byActivityName[0];

  // Fill every day in range (even zero days) so the bar chart's x-axis is
  // continuous. Capped so "All time"/large custom ranges don't try to
  // render thousands of empty bars.
  const dailyChartData = useMemo(() => {
    const days: { date: string; label: string; [projectId: string]: string | number }[] = [];
    const spanDays = Math.round((range.to.getTime() - range.from.getTime()) / 86400000);
    const cursor = new Date(range.from);
    const cap = 366;
    let i = 0;
    while (cursor < range.to && i < cap) {
      const key = localDateKey(cursor.toISOString());
      const row: { date: string; label: string; [projectId: string]: string | number } = {
        date: key,
        label: spanDays > 90 ? cursor.toLocaleDateString(undefined, { month: "short" }) : String(cursor.getDate()),
      };
      for (const p of projects) row[p.id] = 0;
      days.push(row);
      cursor.setDate(cursor.getDate() + 1);
      i++;
    }
    const byDate = new Map(days.map((d) => [d.date, d]));
    for (const e of entries) {
      const key = localDateKey(e.start_at);
      const row = byDate.get(key);
      if (row) row[e.project_id] = (Number(row[e.project_id]) || 0) + (e.duration_seconds ?? 0) / 3600;
    }
    return days;
  }, [entries, projects, range.from, range.to]);

  return (
    <div className="main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className="page-title">Dashboard</h1>
        <RangePicker value={rangeValue} onChange={setRangeValue} />
      </div>
      <p className="page-subtitle">Where your time actually went.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="dim" style={{ marginBottom: 6 }}>
            Total time
          </div>
          <div className="mono" style={{ fontSize: 20 }}>
            {formatTotal(totalSeconds)}
          </div>
        </div>
        <div className="card">
          <div className="dim" style={{ marginBottom: 6 }}>
            Top project
          </div>
          <div style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            {topProject ? (
              <>
                <span style={{ color: topProject.project?.color ?? undefined }}>●</span>
                {topProject.project?.name ?? "—"}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
        <div className="card">
          <div className="dim" style={{ marginBottom: 6 }}>
            Most logged activity
          </div>
          <div style={{ fontSize: 16 }}>{topActivity ? topActivity[0] : "—"}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="dim" style={{ marginBottom: 10 }}>
          Daily breakdown
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyChartData}>
            <XAxis dataKey="label" stroke="var(--ink-faint)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="var(--ink-faint)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}h`}
              width={32}
            />
            <Tooltip content={<DailyTooltip projectById={projectById} />} />
            {projects.map((p) => (
              <Bar key={p.id} dataKey={p.id} stackId="day" fill={p.color ?? "#666"} radius={0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginTop: 16, display: "flex", gap: 32, alignItems: "center" }}>
        <div style={{ position: "relative", width: 220, height: 220, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byProject}
                dataKey="seconds"
                nameKey="projectId"
                innerRadius={62}
                outerRadius={100}
                paddingAngle={2}
                stroke="none"
              >
                {byProject.map((row) => (
                  <Cell key={row.projectId} fill={row.project?.color ?? "#666"} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              pointerEvents: "none",
            }}
          >
            {formatTotal(totalSeconds)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {byProject.length === 0 && <div className="empty-state">No entries in this range.</div>}
          {byProject.map((row) => (
            <div key={row.projectId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <span style={{ color: row.project?.color ?? undefined, fontSize: 10 }}>●</span>
              <span style={{ width: 120, fontSize: 13 }}>{row.project?.name ?? "—"}</span>
              <div style={{ flex: 1, background: "var(--border)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${totalSeconds ? (row.seconds / totalSeconds) * 100 : 0}%`,
                    background: row.project?.color ?? "#666",
                    height: "100%",
                  }}
                />
              </div>
              <span className="mono dim" style={{ fontSize: 12, width: 60, textAlign: "right" }}>
                {formatTotal(row.seconds)}
              </span>
              <span className="mono dim" style={{ fontSize: 12, width: 44, textAlign: "right" }}>
                {totalSeconds ? ((row.seconds / totalSeconds) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
