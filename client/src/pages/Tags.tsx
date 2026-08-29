import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ColorDot } from "../components/ColorDot";
import { COLOR_PALETTE } from "../utils/colors";
import type { Tag } from "../api/types";

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [editingColorFor, setEditingColorFor] = useState<string | null>(null);
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  function refresh() {
    api.tags.list().then(setTags);
  }

  useEffect(refresh, []);

  async function handleCreate() {
    if (!name.trim()) return;
    await api.tags.create(name.trim());
    setName("");
    refresh();
  }

  async function handleCreateSub(parentId: string) {
    if (!subName.trim()) return;
    await api.tags.create(subName.trim(), undefined, parentId);
    setSubName("");
    setAddingSubFor(null);
    refresh();
  }

  async function handleDelete(id: string) {
    await api.tags.remove(id);
    refresh();
  }

  async function handleColorChange(id: string, color: string, closeAfter = true) {
    await api.tags.update(id, { color });
    if (closeAfter) setEditingColorFor(null);
    refresh();
  }

  async function handleRename(id: string) {
    if (!renameText.trim()) return;
    await api.tags.update(id, { name: renameText.trim() });
    setRenamingId(null);
    refresh();
  }

  const topLevel = tags.filter((t) => !t.parent_id);
  const childrenOf = (id: string) => tags.filter((t) => t.parent_id === id);

  function renderRow(tag: Tag, depth: number) {
    const children = childrenOf(tag.id);
    return (
      <div key={tag.id}>
        <div className="ptp-project-row" style={{ paddingLeft: depth * 22 }}>
          <span className="ptp-project-name" style={{ cursor: "default" }}>
            <ColorDot color={tag.color} />
            {renamingId === tag.id ? (
              <input
                type="text"
                autoFocus
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename(tag.id)}
                onBlur={() => handleRename(tag.id)}
                style={{ width: 140 }}
              />
            ) : (
              <span onClick={() => { setRenamingId(tag.id); setRenameText(tag.name); }}>{tag.name}</span>
            )}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {editingColorFor === tag.id ? (
              <div className="color-swatches">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={"color-swatch" + (tag.color === c ? " selected" : "")}
                    style={{ background: c }}
                    onClick={() => handleColorChange(tag.id, c)}
                  />
                ))}
                <input
                  type="color"
                  className="color-swatch-custom"
                  value={tag.color || "#888888"}
                  onChange={(e) => handleColorChange(tag.id, e.target.value, false)}
                  title="Custom color"
                />
                <button type="button" onClick={() => setEditingColorFor(null)}>
                  Done
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingColorFor(tag.id)}>Color</button>
            )}
            <button onClick={() => { setAddingSubFor(tag.id); setSubName(""); }}>+ Sub-tag</button>
            <button className="danger" onClick={() => handleDelete(tag.id)}>
              Delete
            </button>
          </div>
        </div>

        {addingSubFor === tag.id && (
          <div className="ptp-task-draft" style={{ paddingLeft: (depth + 1) * 22 }}>
            <input
              type="text"
              autoFocus
              placeholder="Sub-tag name..."
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSub(tag.id)}
            />
            <button onClick={() => handleCreateSub(tag.id)}>Add</button>
            <button onClick={() => setAddingSubFor(null)}>Cancel</button>
          </div>
        )}

        {children.map((child) => renderRow(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="main">
      <h1 className="page-title">Tags</h1>
      <p className="page-subtitle">Label your entries — tags can have sub-tags, same as projects have tasks.</p>

      <div className="card timer-form">
        <input
          type="text"
          placeholder="New tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button className="primary" onClick={handleCreate}>
          Create tag
        </button>
      </div>

      <div className="card">
        {topLevel.length === 0 ? (
          <div className="empty-state">No tags yet.</div>
        ) : (
          topLevel.map((tag) => renderRow(tag, 0))
        )}
      </div>
    </div>
  );
}
