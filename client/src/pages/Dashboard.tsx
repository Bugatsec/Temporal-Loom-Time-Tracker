import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { formatTotal } from "../utils/format";
import type { Activity, Project, TimeEntry } from "../api/types";

type RangeMode = "week" | "month";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function rangeFor(mode: RangeMode, anchor: Date): { from: Date; to: Date } {
  if (mode === "week") {
    const from = new Date(anchor);
    from.setDate(anchor.getDate() - anchor.getDay());
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return { from, to };
  }
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { from, to };
}

function rangeLabel(mode: RangeMode, from: Date): string {
  if (mode === "week") {
    return `Week of ${from.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return from.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function Dashboard() {
  const [mode, setMode] = useState<RangeMode>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const { from, to } = rangeFor(mode, anchor);

  useEffect(() => {
    api.projects.list().then(setProjects);
  }, []);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  useEffect(() => {
    api.timeEntries.list({ from: from.toISOString(), to: to.toISOString(), limit: "5000" }).then(setEntries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, anchor.getTime()]);

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
      if (name === "General") continue; // the invisible fallback task isn't a real "activity"
      map.set(name, (map.get(name) ?? 0) + (e.duration_seconds ?? 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries, activityById]);

  const topProject = byProject[0];
  const topActivity = byActivityName[0];

  // Fill every day in range (even zero days) so the bar chart's x-axis is continuous.
  const dailyChartData = useMemo(() => {
    const days: { date: string; label: string; [projectId: string]: string | number }[] = [];
    const cursor = new Date(from);
    while (cursor < to) {
      const key = dateKey(cursor);
      const row: { date: string; label: string; [projectId: string]: string | number } = {
        date: key,
        label: String(cursor.getDate()),
      };
      for (const p of projects) row[p.id] = 0;
      days.push(row);
      cursor.setDate(cursor.getDate() + 1);
    }
    const byDate = new Map(days.map((d) => [d.date, d]));
    for (const e of entries) {
      const key = dateKey(new Date(e.start_at));
      const row = byDate.get(key);
      if (row) row[e.project_id] = (Number(row[e.project_id]) || 0) + (e.duration_seconds ?? 0) / 3600;
    }
    return days;
  }, [entries, projects, from, to]);

  function shiftAnchor(dir: 1 | -1) {
    const next = new Date(anchor);
    if (mode === "week") next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setAnchor(next);
  }

  return (
    <div className="main" style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className="page-title">Dashboard</h1>
        <div className="timer-form">
          <button className={mode === "week" ? "primary" : ""} onClick={() => setMode("week")}>
            This week
          </button>
          <button className={mode === "month" ? "primary" : ""} onClick={() => setMode("month")}>
            This month
          </button>
          <button onClick={() => shiftAnchor(-1)}>&larr;</button>
          <span className="dim mono" style={{ fontSize: 12 }}>
            {rangeLabel(mode, from)}
          </span>
          <button onClick={() => shiftAnchor(1)}>&rarr;</button>
        </div>
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
            <Tooltip
              contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 12 }}
              formatter={(value: number, key: string) => [`${value.toFixed(2)}h`, projectById.get(key)?.name ?? key]}
            />
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
