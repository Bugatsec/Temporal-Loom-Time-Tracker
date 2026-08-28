import { useEffect, useRef, useState } from "react";
import { RANGE_PRESETS, rangeForPreset, rangeLabel, shiftableUnit, shiftAnchor, type RangePreset, type DateRange } from "../utils/range";

interface RangePickerProps {
  value: { preset: RangePreset; anchor: Date; customFrom?: Date; customTo?: Date };
  onChange: (value: { preset: RangePreset; anchor: Date; customFrom?: Date; customTo?: Date }) => void;
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RangePicker({ value, onChange }: RangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customFromText, setCustomFromText] = useState(
    value.customFrom ? toInputDate(value.customFrom) : toInputDate(new Date())
  );
  const [customToText, setCustomToText] = useState(
    value.customTo ? toInputDate(value.customTo) : toInputDate(new Date())
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const range: DateRange = rangeForPreset(value.preset, value.anchor, value.customFrom, value.customTo);
  const unit = shiftableUnit(value.preset);

  function selectPreset(preset: RangePreset) {
    if (preset === "custom") {
      onChange({ ...value, preset });
      return; // keep open for date inputs
    }
    onChange({ preset, anchor: new Date() });
    setOpen(false);
  }

  function applyCustom() {
    onChange({
      preset: "custom",
      anchor: value.anchor,
      customFrom: new Date(customFromText),
      customTo: new Date(customToText),
    });
    setOpen(false);
  }

  function step(dir: 1 | -1) {
    if (!unit) return;
    onChange({ ...value, anchor: shiftAnchor(value.anchor, unit, dir) });
  }

  return (
    <div className="range-picker" ref={rootRef}>
      <div className="timer-form" style={{ gap: 6 }}>
        {unit && <button onClick={() => step(-1)}>&larr;</button>}
        <button className="ptp-trigger" onClick={() => setOpen((o) => !o)} style={{ minWidth: 160 }}>
          {rangeLabel(value.preset, range)}
        </button>
        {unit && <button onClick={() => step(1)}>&rarr;</button>}
      </div>

      {open && (
        <div className="combobox-dropdown range-dropdown">
          {RANGE_PRESETS.map((p) => (
            <div
              key={p.value}
              className={"combobox-option" + (value.preset === p.value ? " highlighted" : "")}
              onClick={() => selectPreset(p.value)}
            >
              {p.label}
            </div>
          ))}
          {value.preset === "custom" && (
            <div className="range-custom-inputs">
              <input type="date" value={customFromText} onChange={(e) => setCustomFromText(e.target.value)} />
              <span className="dim">to</span>
              <input type="date" value={customToText} onChange={(e) => setCustomToText(e.target.value)} />
              <button className="primary" onClick={applyCustom}>
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
