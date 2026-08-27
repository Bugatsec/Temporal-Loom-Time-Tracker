import { useEffect, useState } from "react";
import { api } from "../api/client";
import { formatTotal } from "../utils/format";
import type { ProjectBreakdownRow, RangeTotal } from "../api/types";

type RangeKey = "today" | "week" | "month";

function rangeFor(key: RangeKey): { from: string; to: string } {
  const now = new Date();
  const to = new Date();
  let from: Date;

  if (key === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (key === "week") {
    from = new Date(now);
    from.setDate(now.getDate() - now.getDay()); // configured week start — Stage 1 assumes Sunday
    from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Reports() {
  const [range, setRange] = useState<RangeKey>("week");
  const [summary, setSummary] = useState<RangeTotal | null>(null);
  const [breakdown, setBreakdown] = useState<ProjectBreakdownRow[]>([]);

  useEffect(() => {
    const { from, to } = rangeFor(range);
    api.reports.summary(from, to).then(setSummary);
    api.reports.byProject(from, to).then(setBreakdown);
  }, [range]);

  return (
    <div className="main">
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">
        Totals for a range, broken down by project. Full hierarchical drill-down arrives in Stage 3.
      </p>

      <div className="card timer-form">
        {(["today", "week", "month"] as RangeKey[]).map((k) => (
          <button key={k} className={range === k ? "primary" : ""} onClick={() => setRange(k)}>
            {k === "today" ? "Today" : k === "week" ? "This week" : "This month"}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 6 }}>
          Total
        </div>
        <div className="mono" style={{ fontSize: 22 }}>
          {summary ? formatTotal(summary.total_seconds) : "—"}
        </div>
        <div className="dim" style={{ marginTop: 4, fontSize: 12 }}>
          {summary?.entry_count ?? 0} entries
        </div>
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 12 }}>
          By project
        </div>
        {breakdown.length === 0 ? (
          <div className="empty-state">No entries in this range.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Entries</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.project_id}>
                  <td>{row.project_name}</td>
                  <td className="mono dim">{row.entry_count}</td>
                  <td className="mono">{formatTotal(row.total_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
