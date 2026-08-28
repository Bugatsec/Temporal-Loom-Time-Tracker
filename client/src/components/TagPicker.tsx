import { useEffect, useRef, useState } from "react";
import type { Tag } from "../api/types";

interface TagPickerProps {
  allTags: Tag[];
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  onCreate: (name: string) => Promise<Tag>;
}

export function TagPicker({ allTags, selected, onChange, onCreate }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedIds = new Set(selected.map((t) => t.id));
  const filtered = allTags.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()));
  const exactMatch = allTags.find((t) => t.name.toLowerCase() === search.trim().toLowerCase());
  const showCreateRow = search.trim().length > 0 && !exactMatch;

  function toggle(tag: Tag) {
    if (selectedIds.has(tag.id)) onChange(selected.filter((t) => t.id !== tag.id));
    else onChange([...selected, tag]);
  }

  async function createFromSearch() {
    const name = search.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      onChange([...selected, created]);
      setSearch("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="tag-picker" ref={rootRef}>
      <button
        type="button"
        className={"tag-picker-trigger" + (selected.length > 0 ? " active" : "")}
        onClick={() => setOpen((o) => !o)}
        title="Tags"
      >
        &#127991;
        {selected.length > 0 && <span className="tag-picker-count">{selected.length}</span>}
      </button>

      {open && (
        <div className="combobox-dropdown tag-picker-dropdown">
          <input
            type="text"
            className="ptp-search"
            placeholder="Add/Search tags"
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !exactMatch && createFromSearch()}
          />
          <div className="ptp-list">
            {filtered.map((tag) => (
              <label key={tag.id} className="tag-picker-option">
                <input type="checkbox" checked={selectedIds.has(tag.id)} onChange={() => toggle(tag)} />
                <span>{tag.name}</span>
              </label>
            ))}
            {filtered.length === 0 && !showCreateRow && <div className="combobox-empty">No tags</div>}
            {showCreateRow && (
              <div className="combobox-option combobox-create" onClick={createFromSearch}>
                {creating ? "Creating..." : `+ Create "${search.trim()}"`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
