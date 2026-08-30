import { useEffect, useState } from "react";
import { api } from "../api/client";
import { GoalsSummary } from "../components/GoalsSummary";
import { GroupedEntryList } from "../components/GroupedEntryList";
import { Timer } from "../components/Timer";
import { useTimer } from "../context/TimerContext";
import { formatTotal } from "../utils/format";
import type { Activity, Goal, Project, RangeTotal, TimeEntry } from "../api/types";

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
  const [overallGoal, setOverallGoal] = useState<Goal | null>(null);
  const [projectGoals, setProjectGoals] = useState<Goal[]>([]);
  const [compactGoals, setCompactGoals] = useState(false);

  function refresh() {
    const { from, to } = todayRange();
    // 14 days back covers "This week" + "Last week" boxes.
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    api.timeEntries.list({ from: twoWeeksAgo.toISOString(), limit: "1000" }).then(setEntries);
    api.projects.list().then(setProjects);
    api.reports.summary(from, to).then(setTodayTotal);
    api.goals.get().then(({ overall, byProject }) => {
      setOverallGoal(overall);
      setProjectGoals(byProject);
    });
  }

  useEffect(refresh, [version]);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  const hasGoals = Boolean(overallGoal) || projectGoals.length > 0;

  return (
    <div className="main">
      <h1 className="page-title">Time Tracker</h1>
      <p className="page-subtitle">Start a timer, or see where your time went.</p>

      <Timer />

      {hasGoals ? (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span className="dim">Goals — today</span>
              <button className="compact-toggle" onClick={() => setCompactGoals((c) => !c)}>
                {compactGoals ? "Default" : "Compact"}
              </button>
            </div>
            <GoalsSummary
              entries={entries}
              projects={projects}
              overall={overallGoal}
              byProject={projectGoals}
              compact={compactGoals}
            />
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
