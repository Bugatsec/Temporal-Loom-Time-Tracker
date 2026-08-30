import { localDateKey } from "../utils/date";
import { formatTotal } from "../utils/format";
import { ColorDot } from "./ColorDot";
import type { Goal, Project, TimeEntry } from "../api/types";

interface GoalsSummaryProps {
  entries: TimeEntry[];
  projects: Project[];
  overall: Goal | null;
  byProject: Goal[];
  compact?: boolean;
}

function ProgressBar({ fraction, color, compact }: { fraction: number; color?: string; compact?: boolean }) {
  const pct = Math.min(100, Math.round(fraction * 100));
  return (
    <div
      style={{
        flex: 1,
        background: "var(--border)",
        borderRadius: 3,
        height: compact ? 4 : 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          background: fraction >= 1 ? "var(--teal)" : color ?? "var(--accent)",
          height: "100%",
        }}
      />
    </div>
  );
}

export function GoalsSummary({ entries, projects, overall, byProject, compact = false }: GoalsSummaryProps) {
  if (!overall && byProject.length === 0) return null;

  const today = localDateKey(new Date().toISOString());
  const todayEntries = entries.filter((e) => localDateKey(e.start_at) === today);
  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const rowGap = compact ? 4 : 6;
  const labelWidth = compact ? 64 : 90;
  const fontSize = compact ? 12 : 13;
  const numbersWidth = compact ? 44 : 130;

  return (
    <div>
      {overall && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: byProject.length ? rowGap + 6 : 0,
          }}
        >
          <span style={{ width: labelWidth, fontSize, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Overall
          </span>
          <ProgressBar fraction={todayTotal / overall.target_seconds} compact={compact} />
          <span
            className="mono dim"
            style={{ fontSize: compact ? 11 : 12, minWidth: numbersWidth, textAlign: "right" }}
            title={`${formatTotal(todayTotal)} / ${formatTotal(overall.target_seconds)}`}
          >
            {compact
              ? `${Math.min(100, Math.round((todayTotal / overall.target_seconds) * 100))}%`
              : `${formatTotal(todayTotal)} / ${formatTotal(overall.target_seconds)}`}
          </span>
        </div>
      )}

      {byProject.map((g) => {
        const p = projects.find((pr) => pr.id === g.project_id);
        const logged = todayEntries
          .filter((e) => e.project_id === g.project_id)
          .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
        const fraction = logged / g.target_seconds;
        return (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: rowGap }}>
            <span
              style={{
                width: labelWidth,
                fontSize,
                display: "flex",
                alignItems: "center",
                gap: 6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <ColorDot color={p?.color} />
              {p?.name ?? "?"}
            </span>
            <ProgressBar fraction={fraction} color={p?.color ?? undefined} compact={compact} />
            <span
              className="mono dim"
              style={{ fontSize: compact ? 11 : 12, minWidth: numbersWidth, textAlign: "right" }}
              title={`${formatTotal(logged)} / ${formatTotal(g.target_seconds)}`}
            >
              {compact ? `${Math.min(100, Math.round(fraction * 100))}%` : `${formatTotal(logged)} / ${formatTotal(g.target_seconds)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
