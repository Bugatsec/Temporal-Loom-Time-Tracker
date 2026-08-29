import { useEffect, useState } from "react";
import { api } from "../api/client";
import { localDateKey } from "../utils/date";
import { formatTotal } from "../utils/format";
import { ColorDot } from "./ColorDot";
import type { Goal, Project, TimeEntry } from "../api/types";

interface GoalsSummaryProps {
  entries: TimeEntry[];
  projects: Project[];
}

function ProgressBar({ fraction, color }: { fraction: number; color?: string }) {
  const pct = Math.min(100, Math.round(fraction * 100));
  return (
    <div style={{ flex: 1, background: "var(--border)", borderRadius: 3, height: 6, overflow: "hidden" }}>
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

export function GoalsSummary({ entries, projects }: GoalsSummaryProps) {
  const [overall, setOverall] = useState<Goal | null>(null);
  const [byProject, setByProject] = useState<Goal[]>([]);

  useEffect(() => {
    api.goals.get().then(({ overall, byProject }) => {
      setOverall(overall);
      setByProject(byProject);
    });
  }, []);

  if (!overall && byProject.length === 0) return null;

  const today = localDateKey(new Date().toISOString());
  const todayEntries = entries.filter((e) => localDateKey(e.start_at) === today);
  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  return (
    <div className="card">
      <div className="dim" style={{ marginBottom: 12 }}>
        Goals — today
      </div>

      {overall && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: byProject.length ? 12 : 0 }}>
          <span style={{ width: 90, fontSize: 13 }}>Overall</span>
          <ProgressBar fraction={todayTotal / overall.target_seconds} />
          <span className="mono dim" style={{ fontSize: 12, minWidth: 130, textAlign: "right" }}>
            {formatTotal(todayTotal)} / {formatTotal(overall.target_seconds)}
          </span>
        </div>
      )}

      {byProject.map((g) => {
        const p = projects.find((pr) => pr.id === g.project_id);
        const logged = todayEntries
          .filter((e) => e.project_id === g.project_id)
          .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
        return (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span style={{ width: 90, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <ColorDot color={p?.color} />
              {p?.name ?? "?"}
            </span>
            <ProgressBar fraction={logged / g.target_seconds} color={p?.color ?? undefined} />
            <span className="mono dim" style={{ fontSize: 12, minWidth: 130, textAlign: "right" }}>
              {formatTotal(logged)} / {formatTotal(g.target_seconds)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
