import { useEffect, useRef, useState } from "react";
import { ColorDot } from "./ColorDot";

export interface ComboboxOption {
  id: string;
  label: string;
  color?: string | null;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: ComboboxOption | null;
  onSelect: (option: ComboboxOption) => void;
  onCreate: (label: string) => Promise<ComboboxOption>;
  placeholder?: string;
  disabled?: boolean;
  showColorDot?: boolean;
  onClear?: () => void;
}

export function Combobox({
  options,
  value,
  onSelect,
  onCreate,
  placeholder,
  disabled,
  showColorDot = true,
  onClear,
}: ComboboxProps) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value?.id]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = options.find((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const showCreateRow = query.trim().length > 0 && !exactMatch;
  const rowCount = filtered.length + (showCreateRow ? 1 : 0);

  function selectOption(opt: ComboboxOption) {
    onSelect(opt);
    setQuery(opt.label);
    setOpen(false);
  }

  async function createFromQuery() {
    const label = query.trim();
    if (!label || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(label);
      selectOption(created);
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight < filtered.length) {
        selectOption(filtered[highlight]);
      } else {
        createFromQuery();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value?.label ?? "");
    }
  }

  function handleChange(text: string) {
    setQuery(text);
    setOpen(true);
    setHighlight(0);
    if (text === "" && value) onClear?.();
  }

  return (
    <div className="combobox" ref={rootRef}>
      {showColorDot && value && <ColorDot color={value.color} />}
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
      />
      {open && !disabled && (
        <div className="combobox-dropdown">
          {filtered.length === 0 && !showCreateRow && (
            <div className="combobox-empty">No matches</div>
          )}
          {filtered.map((opt, i) => (
            <div
              key={opt.id}
              className={"combobox-option" + (i === highlight ? " highlighted" : "")}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => selectOption(opt)}
            >
              {showColorDot && <ColorDot color={opt.color} />}
              <span>{opt.label}</span>
            </div>
          ))}
          {showCreateRow && (
            <div
              className={"combobox-option combobox-create" + (highlight === filtered.length ? " highlighted" : "")}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(filtered.length)}
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
