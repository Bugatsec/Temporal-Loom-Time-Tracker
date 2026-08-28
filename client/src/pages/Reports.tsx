import { useEffect, useState } from "react";
import { api } from "../api/client";
import { RangePicker } from "../components/RangePicker";
import { formatTotal } from "../utils/format";
import { rangeForPreset, type RangePreset } from "../utils/range";
import type { ProjectBreakdownRow, RangeTotal } from "../api/types";

export default function Reports() {
  const [rangeValue, setRangeValue] = useState<{
    preset: RangePreset;
    anchor: Date;
    customFrom?: Date;
    customTo?: Date;
  }>({ preset: "this_week", anchor: new Date() });
  const [summary, setSummary] = useState<RangeTotal | null>(null);
  const [breakdown, setBreakdown] = useState<ProjectBreakdownRow[]>([]);

  const range = rangeForPreset(rangeValue.preset, rangeValue.anchor, rangeValue.customFrom, rangeValue.customTo);

  useEffect(() => {
    const from = range.from.toISOString();
    const to = range.to.toISOString();
    api.reports.summary(from, to).then(setSummary);
    api.reports.byProject(from, to).then(setBreakdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeValue.preset, rangeValue.anchor.getTime(), rangeValue.customFrom?.getTime(), rangeValue.customTo?.getTime()]);

  return (
    <div className="main">
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">Totals for any range, broken down by project.</p>

      <div className="card">
        <RangePicker value={rangeValue} onChange={setRangeValue} />
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
