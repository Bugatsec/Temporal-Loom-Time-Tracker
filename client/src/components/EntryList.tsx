import { ColorDot } from "./ColorDot";
import type { Activity, Project, TimeEntry } from "../api/types";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "running…";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface EntryListProps {
  entries: TimeEntry[];
  projects: Project[];
  activities: Activity[];
  onDelete?: (id: string) => void;
}

export function EntryList({ entries, projects, activities, onDelete }: EntryListProps) {
  const project = (id: string) => projects.find((p) => p.id === id);
  const activityName = (id: string) => activities.find((a) => a.id === id)?.name ?? id;

  if (entries.length === 0) {
    return <div className="empty-state">No time entries yet — start the timer or add one manually.</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Start</th>
          <th>Project</th>
          <th>Activity</th>
          <th>Description</th>
          <th>Tags</th>
          <th>Duration</th>
          {onDelete && <th></th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const p = project(entry.project_id);
          return (
            <tr key={entry.id}>
              <td className="mono dim">{formatWhen(entry.start_at)}</td>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <ColorDot color={p?.color} />
                  {p?.name ?? entry.project_id}
                </span>
              </td>
              <td className="dim">{activityName(entry.activity_id)}</td>
              <td className="dim">{entry.description ?? "—"}</td>
              <td>
                {entry.tags && entry.tags.length > 0 ? (
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {entry.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="tag-pill"
                        style={{ background: (tag.color || "#666") + "26", color: tag.color || "var(--ink)" }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="dim">—</span>
                )}
              </td>
              <td className="mono">{formatDuration(entry.duration_seconds)}</td>
              {onDelete && (
                <td>
                  <button className="danger" onClick={() => onDelete(entry.id)}>
                    Delete
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
