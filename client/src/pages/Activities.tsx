import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Activity, Project } from "../api/types";

export default function Activities() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    api.projects.list().then((list) => {
      setProjects(list);
      if (list.length > 0) setProjectId(list[0].id);
    });
  }, []);

  function refresh() {
    if (!projectId) return;
    api.activities.list(projectId).then(setActivities);
  }

  useEffect(refresh, [projectId]);

  async function handleCreate() {
    if (!name.trim() || !projectId) return;
    await api.activities.create(projectId, name.trim());
    setName("");
    refresh();
  }

  return (
    <div className="main">
      <h1 className="page-title">Activities</h1>
      <p className="page-subtitle">What the timer is actually tracking — e.g. Recon, Testing, Reporting.</p>

      <div className="card timer-form">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="New activity name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button className="primary" onClick={handleCreate} disabled={!projectId}>
          Add activity
        </button>
      </div>

      <div className="card">
        {activities.length === 0 ? (
          <div className="empty-state">No activities in this project yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="mono dim">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
