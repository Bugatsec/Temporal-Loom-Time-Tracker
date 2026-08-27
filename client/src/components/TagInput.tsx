import { useState } from "react";
import { ColorDot } from "./ColorDot";
import type { Tag } from "../api/types";

interface TagInputProps {
  allTags: Tag[];
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  onCreate: (name: string) => Promise<Tag>;
  placeholder?: string;
}

export function TagInput({ allTags, selected, onChange, onCreate, placeholder }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedIds = new Set(selected.map((t) => t.id));
  const filtered = allTags.filter(
    (t) => !selectedIds.has(t.id) && t.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const exactMatch = allTags.find((t) => t.name.toLowerCase() === query.trim().toLowerCase());
  const showCreateRow = query.trim().length > 0 && !exactMatch;

  function addTag(tag: Tag) {
    onChange([...selected, tag]);
    setQuery("");
    setOpen(false);
  }

  function removeTag(id: string) {
    onChange(selected.filter((t) => t.id !== id));
  }

  async function createFromQuery() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      addTag(created);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="tag-input">
      <div className="tag-input-chips">
        {selected.map((tag) => (
          <span key={tag.id} className="tag-pill" style={{ background: (tag.color || "#666") + "26", color: tag.color || "var(--ink)" }}>
            <ColorDot color={tag.color} size={6} />
            {tag.name}
            <button type="button" className="tag-pill-remove" onClick={() => removeTag(tag.id)}>
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          placeholder={selected.length === 0 ? placeholder ?? "Tags..." : "Add tag..."}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length > 0) addTag(filtered[0]);
              else createFromQuery();
            } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
              removeTag(selected[selected.length - 1].id);
            }
          }}
        />
      </div>
      {open && (query.trim().length > 0 || filtered.length > 0) && (
        <div className="combobox-dropdown">
          {filtered.map((tag) => (
            <div
              key={tag.id}
              className="combobox-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(tag)}
            >
              <ColorDot color={tag.color} />
              <span>{tag.name}</span>
            </div>
          ))}
          {showCreateRow && (
            <div
              className="combobox-option combobox-create"
              onMouseDown={(e) => e.preventDefault()}
              onClick={createFromQuery}
            >
              {creating ? "Creating..." : "+ Create \"" + query.trim() + "\""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
