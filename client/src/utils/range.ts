import { addDays, startOfDay, startOfWeek, weekLabel } from "./date";

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "all_time"
  | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "all_time", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export interface DateRange {
  from: Date;
  to: Date; // exclusive
}

/** Earliest bound for "All time" — arbitrary but well before any realistic
 *  entry, so it behaves as "no lower bound" against the existing
 *  from/to-range report endpoints without needing a backend change. */
const EPOCH = new Date(2000, 0, 1);

/** `anchor` stands in for "now" — prev/next stepping works by shifting the
 *  anchor and recomputing, so "this_week" with an anchor 7 days back
 *  naturally becomes the week before, etc. */
export function rangeForPreset(
  preset: RangePreset,
  anchor: Date,
  customFrom?: Date,
  customTo?: Date
): DateRange {
  const today = startOfDay(anchor);

  switch (preset) {
    case "today":
      return { from: today, to: addDays(today, 1) };
    case "yesterday": {
      const from = addDays(today, -1);
      return { from, to: today };
    }
    case "this_week": {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 7) };
    }
    case "last_week": {
      const from = addDays(startOfWeek(anchor), -7);
      return { from, to: addDays(from, 7) };
    }
    case "this_month": {
      const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      return { from, to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1) };
    }
    case "last_month": {
      const from = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
      return { from, to: new Date(anchor.getFullYear(), anchor.getMonth(), 1) };
    }
    case "this_year": {
      const from = new Date(anchor.getFullYear(), 0, 1);
      return { from, to: new Date(anchor.getFullYear() + 1, 0, 1) };
    }
    case "last_year": {
      const from = new Date(anchor.getFullYear() - 1, 0, 1);
      return { from, to: new Date(anchor.getFullYear(), 0, 1) };
    }
    case "all_time":
      return { from: EPOCH, to: addDays(startOfDay(new Date()), 1) };
    case "custom":
      return {
        from: customFrom ?? today,
        to: customTo ? addDays(customTo, 1) : addDays(today, 1),
      };
  }
}

/** null = preset has no meaningful "step forward/back" (all_time, custom). */
export function shiftableUnit(preset: RangePreset): "day" | "week" | "month" | "year" | null {
  switch (preset) {
    case "today":
    case "yesterday":
      return "day";
    case "this_week":
    case "last_week":
      return "week";
    case "this_month":
    case "last_month":
      return "month";
    case "this_year":
    case "last_year":
      return "year";
    default:
      return null;
  }
}

export function shiftAnchor(date: Date, unit: "day" | "week" | "month" | "year", dir: 1 | -1): Date {
  const d = new Date(date);
  if (unit === "day") d.setDate(d.getDate() + dir);
  else if (unit === "week") d.setDate(d.getDate() + dir * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

export function rangeLabel(preset: RangePreset, range: DateRange): string {
  switch (preset) {
    case "today":
    case "yesterday":
      return range.from.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    case "this_week":
    case "last_week":
      return weekLabel(range.from);
    case "this_month":
    case "last_month":
      return range.from.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    case "this_year":
    case "last_year":
      return String(range.from.getFullYear());
    case "all_time":
      return "All time";
    case "custom": {
      const to = addDays(range.to, -1);
      return `${range.from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
  }
}
