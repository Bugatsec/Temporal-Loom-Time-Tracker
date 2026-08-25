import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EntryList } from "../components/EntryList";
import type { Activity, Project, TimeEntry } from "../api/types";

export default function TimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project_id: "",
    activity_id: "",
    start_at: "",
    end_at: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.timeEntries.list({ limit: "200" }).then(setEntries);
    api.projects.list().then(setProjects);
  }

  useEffect(refresh, []);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  useEffect(() => {
    if (!form.project_id) return;
    api.activities.list(form.project_id).then(setActivities);
  }, [form.project_id]);

  async function handleCreate() {
    if (!form.project_id || !form.activity_id || !form.start_at || !form.end_at) {
      setError("Project, activity, start, and end are all required");
      return;
    }
    try {
      await api.timeEntries.createManual({
        project_id: form.project_id,
        activity_id: form.activity_id,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        description: form.description || undefined,
      });
      setForm({ project_id: "", activity_id: "", start_at: "", end_at: "", description: "" });
      setShowForm(false);
      setError(null);
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(id: string) {
    await api.timeEntries.remove(id);
    refresh();
  }

  return (
    <div className="main">
      <h1 className="page-title">Time Entries</h1>
      <p className="page-subtitle">Every recorded interval — the source of truth for everything else.</p>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="dim">{entries.length} entries</span>
          <button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add manual entry"}
          </button>
        </div>

        {showForm && (
          <div className="timer-form" style={{ marginTop: 14 }}>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value, activity_id: "" })}
            >
              <option value="">Project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select value={form.activity_id} onChange={(e) => setForm({ ...form, activity_id: e.target.value })}>
              <option value="">Activity…</option>
              {activities
                .filter((a) => a.project_id === form.project_id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm({ ...form, start_at: e.target.value })}
            />
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm({ ...form, end_at: e.target.value })}
            />
            <input
              type="text"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button className="primary" onClick={handleCreate}>
              Save entry
            </button>
          </div>
        )}
        {error && <div style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}
      </div>

      <div className="card">
        <EntryList entries={entries} projects={projects} activities={activities} onDelete={handleDelete} />
      </div>
    </div>
  );
}
