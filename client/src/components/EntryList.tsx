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
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
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
          <th>Duration</th>
          {onDelete && <th></th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td className="mono dim">{formatWhen(entry.start_at)}</td>
            <td>{projectName(entry.project_id)}</td>
            <td>{activityName(entry.activity_id)}</td>
            <td className="dim">{entry.description ?? "—"}</td>
            <td className="mono">{formatDuration(entry.duration_seconds)}</td>
            {onDelete && (
              <td>
                <button className="danger" onClick={() => onDelete(entry.id)}>
                  Delete
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
