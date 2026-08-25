import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EntryList } from "../components/EntryList";
import type { Activity, Project, TimeEntry } from "../api/types";

export default function Calendar() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    api.projects.list().then(setProjects);
  }, []);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  useEffect(() => {
    const from = new Date(`${date}T00:00:00`).toISOString();
    const to = new Date(`${date}T23:59:59`).toISOString();
    api.timeEntries.list({ from, to, limit: "200" }).then(setEntries);
  }, [date]);

  return (
    <div className="main">
      <h1 className="page-title">Calendar</h1>
      <p className="page-subtitle">
        Day-by-day view of tracked sessions. A full calendar grid is a natural Stage 3+ extension once the
        analytics engine lands.
      </p>

      <div className="card timer-form">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="card">
        <EntryList entries={entries} projects={projects} activities={activities} />
      </div>
    </div>
  );
}
