import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useTimer } from "../context/TimerContext";
import { formatElapsed } from "../utils/format";
import { Combobox, type ComboboxOption } from "./Combobox";
import { TagInput } from "./TagInput";
import type { Activity, Project, Tag } from "../api/types";

function toOption(item: { id: string; name: string; color: string | null }): ComboboxOption {
  return { id: item.id, label: item.name, color: item.color };
}

export function Timer() {
  const { running, elapsedSeconds, start, stop, error } = useTimer();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [selectedProject, setSelectedProject] = useState<ComboboxOption | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ComboboxOption | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    api.projects.list().then(setProjects);
    api.tags.list().then(setAllTags);
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setActivities([]);
      return;
    }
    api.activities.list(selectedProject.id).then(setActivities);
  }, [selectedProject?.id]);

  async function handleStart() {
    if (!selectedProject || !selectedActivity) return;
    await start({
      project_id: selectedProject.id,
      activity_id: selectedActivity.id,
      description: description || undefined,
      tags: selectedTags.map((t) => t.name),
    }).catch(() => {});
  }

  async function handleStop() {
    await stop().catch(() => {});
    setDescription("");
    setSelectedTags([]);
    // Project/activity stay selected — most people track the same thing repeatedly.
  }

  const runningProject = running ? projects.find((p) => p.id === running.project_id) : undefined;

  return (
    <div className="card timer-card">
      <div>
        <div className={"timer-readout" + (running ? " running" : "")}>
          {running && <span className="live-dot" />}
          {formatElapsed(elapsedSeconds)}
        </div>
        {running && (
          <div className="dim" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            {runningProject && <span style={{ color: runningProject.color ?? undefined }}>●</span>}
            {runningProject?.name ?? "—"}
            {running.description ? ` · ${running.description}` : ""}
          </div>
        )}
        {error && <div style={{ color: "var(--danger)", marginTop: 6 }}>{error}</div>}
      </div>

      {!running ? (
        <div className="timer-form">
          <Combobox
            options={projects.map(toOption)}
            value={selectedProject}
            placeholder="Project..."
            onSelect={(opt) => {
              setSelectedProject(opt);
              setSelectedActivity(null);
            }}
            onCreate={async (name) => {
              const project = await api.projects.create(name);
              setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
              return toOption(project);
            }}
            onClear={() => {
              setSelectedProject(null);
              setSelectedActivity(null);
            }}
          />
          <Combobox
            options={activities.map(toOption)}
            value={selectedActivity}
            placeholder="Activity..."
            disabled={!selectedProject}
            onSelect={setSelectedActivity}
            onCreate={async (name) => {
              if (!selectedProject) throw new Error("Pick a project first");
              const activity = await api.activities.create(selectedProject.id, name);
              setActivities((prev) => [...prev, activity].sort((a, b) => a.name.localeCompare(b.name)));
              return toOption(activity);
            }}
            onClear={() => setSelectedActivity(null)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TagInput
            allTags={allTags}
            selected={selectedTags}
            onChange={setSelectedTags}
            onCreate={async (name) => {
              const tag = await api.tags.create(name);
              setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
              return tag;
            }}
          />
          <button className="primary" onClick={handleStart} disabled={!selectedProject || !selectedActivity}>
            Start
          </button>
        </div>
      ) : (
        <button className="danger" onClick={handleStop}>
          Stop
        </button>
      )}
    </div>
  );
}
