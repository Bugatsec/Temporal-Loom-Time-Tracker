import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Project } from "../api/types";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");

  function refresh() {
    api.projects.list().then(setProjects);
  }

  useEffect(refresh, []);

  async function handleCreate() {
    if (!name.trim()) return;
    await api.projects.create(name.trim());
    setName("");
    refresh();
  }

  async function handleArchive(id: string) {
    await api.projects.archive(id);
    refresh();
  }

  return (
    <div className="main">
      <h1 className="page-title">Projects</h1>
      <p className="page-subtitle">A meaningful body of work inside your workspace — e.g. "Bug Bounty".</p>

      <div className="card timer-form">
        <input
          type="text"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button className="primary" onClick={handleCreate}>
          Create project
        </button>
      </div>

      <div className="card">
        {projects.length === 0 ? (
          <div className="empty-state">No projects yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="mono dim">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleArchive(p.id)}>Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
