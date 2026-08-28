import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useTimer } from "../context/TimerContext";
import { formatElapsed } from "../utils/format";
import { ProjectTaskPicker, type ProjectTaskSelection } from "./ProjectTaskPicker";
import { TagPicker } from "./TagPicker";
import type { Project, Tag } from "../api/types";

export function Timer() {
  const { running, elapsedSeconds, start, stop, error } = useTimer();

  const [selection, setSelection] = useState<ProjectTaskSelection | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    api.tags.list().then(setAllTags);
  }, []);

  async function handleStart() {
    if (!selection) return;
    await start({
      project_id: selection.project.id,
      activity_id: selection.activity.id,
      description: description || undefined,
      tags: selectedTags.map((t) => t.name),
    }).catch(() => {});
  }

  async function handleStop() {
    await stop().catch(() => {});
    setDescription("");
    setSelectedTags([]);
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
            {runningProject?.name ?? "—"}
            {running.description ? ` · ${running.description}` : ""}
          </div>
        )}
        {error && <div style={{ color: "var(--danger)", marginTop: 6 }}>{error}</div>}
      </div>

      {!running ? (
        <div className="timer-form">
          <ProjectTaskPicker value={selection} onChange={setSelection} onProjectsLoaded={setProjects} />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TagPicker
            allTags={allTags}
            selected={selectedTags}
            onChange={setSelectedTags}
            onCreate={async (name) => {
              const tag = await api.tags.create(name);
              setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
              return tag;
            }}
          />
          <button className="primary" onClick={handleStart} disabled={!selection}>
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
