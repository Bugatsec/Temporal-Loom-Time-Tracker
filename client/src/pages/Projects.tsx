import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ColorDot } from "../components/ColorDot";
import { COLOR_PALETTE } from "../utils/colors";
import type { Project } from "../api/types";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [editingColorFor, setEditingColorFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

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

  async function handleColorChange(id: string, color: string, closeAfter = true) {
    await api.projects.update(id, { color });
    if (closeAfter) setEditingColorFor(null);
    refresh();
  }

  async function handleRename(id: string) {
    const trimmed = renameText.trim();
    setRenamingId(null);
    if (!trimmed) return;
    await api.projects.update(id, { name: trimmed });
    refresh();
  }

  return (
    <div className="main">
      <h1 className="page-title">Projects</h1>
      <p className="page-subtitle">A meaningful body of work inside your workspace — e.g. "Bug Bounty" or "Life".</p>

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
                <th>Color</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <ColorDot color={p.color} />
                      {renamingId === p.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                          onBlur={() => handleRename(p.id)}
                          style={{ width: 160 }}
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setRenamingId(p.id);
                            setRenameText(p.name);
                          }}
                          style={{ cursor: "pointer" }}
                          title="Click to rename"
                        >
                          {p.name}
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    {editingColorFor === p.id ? (
                      <div className="color-swatches">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={"color-swatch" + (p.color === c ? " selected" : "")}
                            style={{ background: c }}
                            onClick={() => handleColorChange(p.id, c)}
                          />
                        ))}
                        <input
                          type="color"
                          className="color-swatch-custom"
                          value={p.color || "#888888"}
                          onChange={(e) => handleColorChange(p.id, e.target.value, false)}
                          title="Custom color"
                        />
                        <button type="button" onClick={() => setEditingColorFor(null)}>
                          Done
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingColorFor(p.id)}>Change color</button>
                    )}
                  </td>
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
