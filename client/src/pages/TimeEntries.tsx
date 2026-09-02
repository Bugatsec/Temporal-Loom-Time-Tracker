import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Combobox, type ComboboxOption } from "../components/Combobox";
import { EntryList } from "../components/EntryList";
import { TagInput } from "../components/TagInput";
import { useTimer } from "../context/TimerContext";
import type { Activity, Project, Tag, TimeEntry } from "../api/types";

function toOption(item: { id: string; name: string; color: string | null }): ComboboxOption {
  return { id: item.id, label: item.name, color: item.color };
}

export default function TimeEntries() {
  const { version } = useTimer();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [formProject, setFormProject] = useState<ComboboxOption | null>(null);
  const [formActivity, setFormActivity] = useState<ComboboxOption | null>(null);
  const [formActivities, setFormActivities] = useState<Activity[]>([]);
  const [formTags, setFormTags] = useState<Tag[]>([]);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.timeEntries.list({ limit: "200" }).then(setEntries);
    api.projects.list().then(setProjects);
    api.tags.list().then(setAllTags);
  }

  useEffect(refresh, [version]);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) =>
      setActivities(lists.flat())
    );
  }, [projects]);

  useEffect(() => {
    if (!formProject) {
      setFormActivities([]);
      return;
    }
    api.activities.list(formProject.id).then(setFormActivities);
  }, [formProject?.id]);

  function resetForm() {
    setFormProject(null);
    setFormActivity(null);
    setFormTags([]);
    setStartAt("");
    setEndAt("");
    setDescription("");
  }

  async function handleCreate() {
    if (!formProject || !formActivity || !startAt || !endAt) {
      setError("Project, activity, start, and end are all required");
      return;
    }
    try {
      await api.timeEntries.createManual({
        project_id: formProject.id,
        activity_id: formActivity.id,
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
            <Combobox
              options={projects.map(toOption)}
              value={formProject}
              placeholder="Project..."
              onSelect={(opt) => {
                setFormProject(opt);
                setFormActivity(null);
              }}
              onCreate={async (name) => {
                const project = await api.projects.create(name);
                setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
                return toOption(project);
              }}
              onClear={() => {
                setFormProject(null);
                setFormActivity(null);
              }}
            />
            <Combobox
              options={formActivities.map(toOption)}
              value={formActivity}
              placeholder="Activity..."
              disabled={!formProject}
              onSelect={setFormActivity}
              onCreate={async (name) => {
                if (!formProject) throw new Error("Pick a project first");
                const activity = await api.activities.create(formProject.id, name);
                setFormActivities((prev) => [...prev, activity].sort((a, b) => a.name.localeCompare(b.name)));
                return toOption(activity);
              }}
              onClear={() => setFormActivity(null)}
            />
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TagInput
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

      <div className="card">
        <EntryList entries={entries} projects={projects} activities={activities} onDelete={handleDelete} />
      </div>
    </div>
  );
}
