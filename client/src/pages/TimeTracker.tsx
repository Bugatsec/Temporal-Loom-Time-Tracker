import { useEffect, useState } from "react";
import { api } from "../api/client";
import { GroupedEntryList } from "../components/GroupedEntryList";
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

export default function TimeTracker() {
  const { version } = useTimer();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayTotal, setTodayTotal] = useState<RangeTotal | null>(null);

  function refresh() {
    const { from, to } = todayRange();
    // 14 days back covers "This week" + "Last week" boxes.
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    api.timeEntries.list({ from: twoWeeksAgo.toISOString(), limit: "1000" }).then(setEntries);
    api.projects.list().then(setProjects);
    api.reports.summary(from, to).then(setTodayTotal);
  }

  useEffect(refresh, [version]);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  return (
    <div className="main">
      <h1 className="page-title">Time Tracker</h1>
      <p className="page-subtitle">Start a timer, or see where your time went.</p>

      <Timer />

      <div className="card">
        <div className="dim" style={{ marginBottom: 6 }}>
          Today
        </div>
        <div className="mono" style={{ fontSize: 22 }}>
          {todayTotal ? formatTotal(todayTotal.total_seconds) : "—"}
        </div>
      </div>

      <GroupedEntryList
        entries={entries}
        projects={projects}
        activities={activities}
        groupByWeek
        onChanged={refresh}
      />
    </div>
  );
}
