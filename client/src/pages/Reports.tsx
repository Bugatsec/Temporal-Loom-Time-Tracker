import { useEffect, useState } from "react";
import { api } from "../api/client";
import { GroupedEntryList } from "../components/GroupedEntryList";
import { RangePicker } from "../components/RangePicker";
import { getFeaturePrefs, onFeaturePrefsChanged } from "../utils/featurePrefs";
import { formatTotal } from "../utils/format";
import { rangeForPreset, type RangePreset } from "../utils/range";
import type { Activity, ActivityRollupRow, Project, ProjectBreakdownRow, RangeTotal, SavedView, TimeEntry } from "../api/types";

interface RangeValue {
  preset: RangePreset;
  anchor: Date;
  customFrom?: Date;
  customTo?: Date;
}

function serializeRange(v: RangeValue) {
  return {
    preset: v.preset,
    customFrom: v.customFrom?.toISOString(),
    customTo: v.customTo?.toISOString(),
  };
}

function parseSavedView(view: SavedView): RangeValue {
  const cfg = JSON.parse(view.config) as { preset: RangePreset; customFrom?: string; customTo?: string };
  return {
    preset: cfg.preset,
    anchor: new Date(),
    customFrom: cfg.customFrom ? new Date(cfg.customFrom) : undefined,
    customTo: cfg.customTo ? new Date(cfg.customTo) : undefined,
  };
}

export default function Reports() {
  const [prefs, setPrefs] = useState(getFeaturePrefs());
  useEffect(() => onFeaturePrefsChanged(() => setPrefs(getFeaturePrefs())), []);

  const [rangeValue, setRangeValue] = useState<RangeValue>({ preset: "this_week", anchor: new Date() });
  const [summary, setSummary] = useState<RangeTotal | null>(null);
  const [breakdown, setBreakdown] = useState<ProjectBreakdownRow[]>([]);
  const [activityRollup, setActivityRollup] = useState<ActivityRollupRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [drilledProjectId, setDrilledProjectId] = useState<string | null>(null);
  const [drilledEntries, setDrilledEntries] = useState<TimeEntry[]>([]);

  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [savingViewName, setSavingViewName] = useState<string | null>(null);

  const range = rangeForPreset(rangeValue.preset, rangeValue.anchor, rangeValue.customFrom, rangeValue.customTo);
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  useEffect(() => {
    api.reports.summary(fromIso, toIso).then(setSummary);
    api.reports.byProject(fromIso, toIso).then(setBreakdown);
    if (prefs.rollups) api.reports.byActivity(fromIso, toIso).then(setActivityRollup);
    setDrilledProjectId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromIso, toIso, prefs.rollups]);

  useEffect(() => {
    api.projects.list().then(setProjects);
    if (prefs.savedViews) api.savedViews.list().then(setSavedViews);
  }, [prefs.savedViews]);

  useEffect(() => {
    Promise.all(projects.map((p) => api.activities.list(p.id))).then((lists) => setActivities(lists.flat()));
  }, [projects]);

  useEffect(() => {
    if (!drilledProjectId) {
      setDrilledEntries([]);
      return;
    }
    api.timeEntries.list({ from: fromIso, to: toIso, project_id: drilledProjectId, limit: "500" }).then(setDrilledEntries);
  }, [drilledProjectId, fromIso, toIso]);

  function toggleDrill(projectId: string) {
    setDrilledProjectId((cur) => (cur === projectId ? null : projectId));
  }

  async function saveCurrentView() {
    if (!savingViewName?.trim()) return;
    await api.savedViews.create(savingViewName.trim(), serializeRange(rangeValue));
    setSavingViewName(null);
    api.savedViews.list().then(setSavedViews);
  }

  async function deleteView(id: string) {
    await api.savedViews.remove(id);
    api.savedViews.list().then(setSavedViews);
  }

  return (
    <div className="main">
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">Totals for any range, broken down by project.</p>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <RangePicker value={rangeValue} onChange={setRangeValue} />
          <div style={{ display: "flex", gap: 8 }}>
            {prefs.exportCsv && (
              <a href={api.reports.exportCsvUrl(fromIso, toIso)}>
                <button>CSV</button>
              </a>
            )}
            {prefs.exportHtml && (
              <a href={api.reports.exportHtmlUrl(fromIso, toIso)} target="_blank" rel="noreferrer">
                <button>HTML</button>
              </a>
            )}
            {prefs.exportPdf && (
              <a href={api.reports.exportPdfUrl(fromIso, toIso)}>
                <button>PDF</button>
              </a>
            )}
          </div>
        </div>

        {prefs.savedViews && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {savedViews.map((v) => (
                <span key={v.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setRangeValue(parseSavedView(v))}>{v.name}</button>
                  <button className="entry-menu-btn" onClick={() => deleteView(v.id)} title="Delete view">
                    &times;
                  </button>
                </span>
              ))}
              {savingViewName !== null ? (
                <span style={{ display: "inline-flex", gap: 6 }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="View name..."
                    value={savingViewName}
                    onChange={(e) => setSavingViewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveCurrentView()}
                  />
                  <button className="primary" onClick={saveCurrentView}>
                    Save
                  </button>
                </span>
              ) : (
                <button onClick={() => setSavingViewName("")}>+ Save this view</button>
              )}
            </div>
          </div>
        )}
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
          By project{prefs.drillDown && breakdown.length > 0 ? " — click a row to see entries" : ""}
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
                <tr
                  key={row.project_id}
                  onClick={() => prefs.drillDown && toggleDrill(row.project_id)}
                  style={prefs.drillDown ? { cursor: "pointer" } : undefined}
                  className={drilledProjectId === row.project_id ? "active" : ""}
                >
                  <td>{row.project_name}</td>
                  <td className="mono dim">{row.entry_count}</td>
                  <td className="mono">{formatTotal(row.total_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {prefs.drillDown && drilledProjectId && (
          <div style={{ marginTop: 14 }}>
            <GroupedEntryList entries={drilledEntries} projects={projects} activities={activities} groupByDay />
          </div>
        )}
      </div>

      {prefs.rollups && (
        <div className="card">
          <div className="dim" style={{ marginBottom: 12 }}>
            By activity (rolled up — a parent's total includes its sub-tasks)
          </div>
          {activityRollup.length === 0 ? (
            <div className="empty-state">No entries in this range.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Total (rollup)</th>
                </tr>
              </thead>
              <tbody>
                {activityRollup.map((row) => (
                  <tr key={row.activity_id}>
                    <td style={{ paddingLeft: 12 + row.depth * 20 }}>{row.activity_name}</td>
                    <td className="mono">{formatTotal(row.rollup_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
