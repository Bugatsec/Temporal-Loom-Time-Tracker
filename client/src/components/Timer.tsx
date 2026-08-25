import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Activity, Project, TimeEntry } from "../api/types";

function formatElapsed(startAt: string): string {
  const elapsedMs = Date.now() - new Date(startAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

interface TimerProps {
  onStopped?: () => void;
}

export function Timer({ onStopped }: TimerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projectId, setProjectId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [description, setDescription] = useState("");
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.projects.list().then(setProjects).catch((e) => setError(e.message));
    api.timeEntries.running().then(setRunning).catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) {
      setActivities([]);
      return;
    }
    api.activities.list(projectId).then(setActivities).catch((e) => setError(e.message));
  }, [projectId]);

  // Live tick for the running-timer readout — local interval only, no network chatter.
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const elapsed = useMemo(() => (running ? formatElapsed(running.start_at) : "00:00:00"), [running, tick]);

  async function handleStart() {
    if (!projectId || !activityId) {
      setError("Pick a project and activity first");
      return;
    }
    setError(null);
    try {
      const entry = await api.timeEntries.start(projectId, activityId, description || undefined);
      setRunning(entry);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleStop() {
    if (!running) return;
    try {
      await api.timeEntries.stop(running.id);
      setRunning(null);
      setDescription("");
      onStopped?.();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="card timer-card">
      <div>
        <div className={`timer-readout ${running ? "running" : ""}`}>
          {running && <span className="live-dot" />}
          {elapsed}
        </div>
        {running && (
          <div className="dim" style={{ marginTop: 4 }}>
            {projects.find((p) => p.id === running.project_id)?.name ?? "—"}
          </div>
        )}
        {error && <div style={{ color: "var(--danger)", marginTop: 6 }}>{error}</div>}
      </div>

      {!running ? (
        <div className="timer-form">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={activityId} onChange={(e) => setActivityId(e.target.value)} disabled={!projectId}>
            <option value="">Activity…</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="primary" onClick={handleStart}>
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
