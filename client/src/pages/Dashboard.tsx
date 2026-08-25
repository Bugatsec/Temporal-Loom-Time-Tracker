import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { EntryList } from "../components/EntryList";
import { Timer } from "../components/Timer";
import type { Activity, Project, RangeTotal, TimeEntry } from "../api/types";

function todayRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatTotal(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function Dashboard() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayTotal, setTodayTotal] = useState<RangeTotal | null>(null);

  const refresh = useCallback(() => {
    const { from, to } = todayRange();
    api.timeEntries.list({ limit: "10" }).then(setEntries);
    api.projects.list().then(setProjects);
    api.reports.summary(from, to).then(setTodayTotal);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    // Pull activities for every project so EntryList can resolve names.
    // Stage 1 scale doesn't need pagination here — fine for a single user's dataset.
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  return (
    <div className="main">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Start a timer, or see where today went.</p>

      <Timer onStopped={refresh} />

      <div className="card">
        <div className="dim" style={{ marginBottom: 6 }}>
          Today
        </div>
        <div className="mono" style={{ fontSize: 22 }}>
          {todayTotal ? formatTotal(todayTotal.total_seconds) : "—"}
        </div>
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 12 }}>
          Latest entries
        </div>
        <EntryList entries={entries} projects={projects} activities={activities} />
      </div>
    </div>
  );
}
