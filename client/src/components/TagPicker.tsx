import { useEffect, useRef, useState } from "react";
import type { Tag } from "../api/types";

interface TagPickerProps {
  allTags: Tag[];
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  onCreate: (name: string, parentId?: string | null) => Promise<Tag>;
}

/** Mirrors ProjectTaskPicker's structure: top-level rows expand to reveal
 *  (and let you create) sub-tags, with a persistent "+ Create new tag"
 *  footer — same affordances as the project/task picker, just multi-select
 *  via checkboxes instead of single-select. */
export function TagPicker({ allTags, selected, onChange, onCreate }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subDraftFor, setSubDraftFor] = useState<string | null>(null);
  const [subDraftText, setSubDraftText] = useState("");
  const [newTagDraft, setNewTagDraft] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setExpandedId(null);
        setSubDraftFor(null);
        setNewTagDraft(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedIds = new Set(selected.map((t) => t.id));
  const isSearching = search.trim().length > 0;
  const searchResults = allTags.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()));
  const exactMatch = allTags.find((t) => t.name.toLowerCase() === search.trim().toLowerCase());
  const showSearchCreateRow = isSearching && !exactMatch;

  const topLevel = allTags.filter((t) => !t.parent_id);
  const childrenOf = (id: string) => allTags.filter((t) => t.parent_id === id);

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

  async function submitSubDraft(parentId: string) {
    if (!subDraftText.trim() || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(subDraftText.trim(), parentId);
      onChange([...selected, created]);
      setSubDraftText("");
      setSubDraftFor(null);
    } finally {
      setCreating(false);
    }
  }

  async function submitNewTag() {
    if (!newTagDraft?.trim() || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(newTagDraft.trim());
      onChange([...selected, created]);
      setNewTagDraft(null);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="tag-picker" ref={rootRef}>
      <button type="button" className="tag-picker-trigger" onClick={() => setOpen((o) => !o)} title="Tags">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" />
        </svg>
        {selected.length > 0 && <span className="tag-picker-count">{selected.length}</span>}
      </button>

      {open && (
        <div className="combobox-dropdown ptp-dropdown">
          <input
            type="text"
            className="ptp-search"
            placeholder="Add/Search tags"
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !exactMatch && createFromSearch()}
          />

          {isSearching ? (
            <div className="ptp-list">
              {searchResults.map((tag) => (
                <label key={tag.id} className="tag-picker-option">
                  <input type="checkbox" checked={selectedIds.has(tag.id)} onChange={() => toggle(tag)} />
                  <span>{tag.name}</span>
                </label>
              ))}
              {searchResults.length === 0 && !showSearchCreateRow && <div className="combobox-empty">No tags</div>}
              {showSearchCreateRow && (
                <div className="combobox-option combobox-create" onClick={createFromSearch}>
                  {creating ? "Creating..." : `+ Create "${search.trim()}"`}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="ptp-list">
                {topLevel.map((tag) => {
                  const children = childrenOf(tag.id);
                  const isExpanded = expandedId === tag.id;
                  return (
                    <div key={tag.id} className="ptp-project-group">
                      <div className="ptp-project-row">
                        <label className="tag-picker-option" style={{ flex: 1 }}>
                          <input type="checkbox" checked={selectedIds.has(tag.id)} onChange={() => toggle(tag)} />
                          <span>{tag.name}</span>
                        </label>
                        <button
                          type="button"
                          className="ptp-expand"
                          onClick={() => setExpandedId(isExpanded ? null : tag.id)}
                        >
                          {children.length > 0 ? `${children.length} sub-tag${children.length > 1 ? "s" : ""}` : "Add tag"}
                          <span className={"ptp-chevron" + (isExpanded ? " open" : "")}>&#9662;</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="ptp-tasks">
                          {children.map((child) => (
                            <label key={child.id} className="tag-picker-option">
                              <input type="checkbox" checked={selectedIds.has(child.id)} onChange={() => toggle(child)} />
                              <span>{child.name}</span>
                            </label>
                          ))}
                          {subDraftFor === tag.id ? (
                            <div className="ptp-task-draft">
                              <input
                                type="text"
                                autoFocus
                                placeholder="Sub-tag name..."
                                value={subDraftText}
                                onChange={(e) => setSubDraftText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && submitSubDraft(tag.id)}
                              />
                              <button type="button" disabled={creating} onClick={() => submitSubDraft(tag.id)}>
                                Add
                              </button>
                            </div>
                          ) : (
                            <div
                              className="combobox-option combobox-create"
                              onClick={() => {
                                setSubDraftFor(tag.id);
                                setSubDraftText("");
                              }}
                            >
                              + Create new sub-tag
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {topLevel.length === 0 && <div className="combobox-empty">No tags yet</div>}
              </div>

              <div className="ptp-footer">
                {newTagDraft !== null ? (
                  <div className="ptp-task-draft">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Tag name..."
                      value={newTagDraft}
                      onChange={(e) => setNewTagDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitNewTag()}
                    />
                    <button type="button" disabled={creating} onClick={submitNewTag}>
                      Add
                    </button>
                  </div>
                ) : (
                  <div className="combobox-option combobox-create" onClick={() => setNewTagDraft("")}>
                    + Create new tag
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
