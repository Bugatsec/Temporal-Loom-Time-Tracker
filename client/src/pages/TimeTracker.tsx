import { useEffect, useState } from "react";
import { api } from "../api/client";
import { GoalsSummary } from "../components/GoalsSummary";
import { GroupedEntryList } from "../components/GroupedEntryList";
import { Timer } from "../components/Timer";
import { useTimer } from "../context/TimerContext";
import { formatTotal } from "../utils/format";
import type { Activity, GoalStatusBundle, Project, RangeTotal, TimeEntry } from "../api/types";

function todayRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function hasAnyGoal(status: GoalStatusBundle | null): boolean {
  if (!status) return false;
  return (
    status.daily.minimum_seconds != null ||
    status.daily.max_seconds != null ||
    status.weekly.has_goal ||
    status.weekly.projects.length > 0 ||
    status.monthly.has_goal ||
    status.monthly.projects.length > 0 ||
    status.yearly.has_goal ||
    status.yearly.projects.length > 0
  );
}

export default function TimeTracker() {
  const { version } = useTimer();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayTotal, setTodayTotal] = useState<RangeTotal | null>(null);
  const [goalStatus, setGoalStatus] = useState<GoalStatusBundle | null>(null);
  const [compactGoals, setCompactGoals] = useState(false);

  function refresh() {
    const { from, to } = todayRange();
    // 14 days back covers "This week" + "Last week" boxes.
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    api.timeEntries.list({ from: twoWeeksAgo.toISOString(), limit: "1000" }).then(setEntries);
    api.projects.list().then(setProjects);
    api.reports.summary(from, to).then(setTodayTotal);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    api.goals.status(timeZone).then(setGoalStatus);
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

      {hasAnyGoal(goalStatus) && goalStatus ? (
        <div className="card today-goals-card">
          <div className="today-goals-left">
            <div className="dim" style={{ marginBottom: 6 }}>
              Today
            </div>
            <div className="mono" style={{ fontSize: 32 }}>
              {todayTotal ? formatTotal(todayTotal.total_seconds) : "—"}
            </div>
          </div>
          <div className="today-goals-divider" />
          <div className="today-goals-right">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button className="compact-toggle" onClick={() => setCompactGoals((c) => !c)}>
                {compactGoals ? "Default" : "Compact"}
              </button>
            </div>
            <GoalsSummary status={goalStatus} projects={projects} compact={compactGoals} />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="dim" style={{ marginBottom: 6 }}>
            Today
          </div>
          <div className="mono" style={{ fontSize: 22 }}>
            {todayTotal ? formatTotal(todayTotal.total_seconds) : "—"}
          </div>
        </div>
      )}

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
