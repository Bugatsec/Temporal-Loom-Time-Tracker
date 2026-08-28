import { useEffect, useState } from "react";
import { api } from "../api/client";
import { GroupedEntryList } from "../components/GroupedEntryList";
import { ProjectTaskPicker, type ProjectTaskSelection } from "../components/ProjectTaskPicker";
import { TagPicker } from "../components/TagPicker";
import { useTimer } from "../context/TimerContext";
import type { Activity, Project, Tag, TimeEntry } from "../api/types";

export default function TimeEntries() {
  const { version } = useTimer();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [selection, setSelection] = useState<ProjectTaskSelection | null>(null);
  const [formTags, setFormTags] = useState<Tag[]>([]);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.timeEntries.list({ limit: "500" }).then(setEntries);
    api.projects.list().then(setProjects);
    api.tags.list().then(setAllTags);
  }

  useEffect(refresh, [version]);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  function resetForm() {
    setSelection(null);
    setFormTags([]);
    setStartAt("");
    setEndAt("");
    setDescription("");
  }

  async function handleCreate() {
    if (!selection || !startAt || !endAt) {
      setError("Project, start, and end are all required");
      return;
    }
    try {
      await api.timeEntries.createManual({
        project_id: selection.project.id,
        activity_id: selection.activity.id,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        description: description || undefined,
        tags: formTags.map((t) => t.name),
      });
      resetForm();
      setShowForm(false);
      setError(null);
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
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
            <ProjectTaskPicker value={selection} onChange={setSelection} />
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TagPicker
              allTags={allTags}
              selected={formTags}
              onChange={setFormTags}
              onCreate={async (name) => {
                const tag = await api.tags.create(name);
                setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
                return tag;
              }}
            />
            <button className="primary" onClick={handleCreate}>
              Save entry
            </button>
          </div>
        )}
        {error && <div style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}
      </div>

      <GroupedEntryList entries={entries} projects={projects} activities={activities} groupByWeek onChanged={refresh} />
    </div>
  );
}
