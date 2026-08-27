import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EntryList } from "../components/EntryList";
import { Timer } from "../components/Timer";
import { useTimer } from "../context/TimerContext";
import { formatTotal } from "../utils/format";
import type { Activity, Project, RangeTotal, TimeEntry } from "../api/types";

function todayRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function Dashboard() {
  const { version } = useTimer();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayTotal, setTodayTotal] = useState<RangeTotal | null>(null);

  useEffect(() => {
    const { from, to } = todayRange();
    api.timeEntries.list({ limit: "10" }).then(setEntries);
    api.projects.list().then(setProjects);
    api.reports.summary(from, to).then(setTodayTotal);
    // version bumps whenever the timer starts/stops (see TimerContext) —
    // refetch so "today" and the recent-entries list reflect it immediately.
  }, [version]);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  return (
    <div className="main">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Start a timer, or see where today went.</p>

      <Timer />

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
