import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { ColorDot } from "../components/ColorDot";
import { formatDurationClock } from "../utils/date";
import { getFeaturePrefs, setFeaturePrefs, type FeaturePrefs } from "../utils/featurePrefs";
import { getGoalPeriodPrefs, setGoalPeriodPrefs, type GoalPeriodPrefs } from "../utils/goalPeriodPrefs";
import { getSidebarPrefs, setSidebarPrefs } from "../utils/sidebarPrefs";
import type { ImportSummary, SettingsImportSummary, WorkspaceImportSummary } from "../api/importTypes";
import type { DailyCaps, Goal, GoalPeriod, Project } from "../api/types";

function hmToSeconds(h: string, m: string): number {
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60;
}
function secondsToH(seconds: number): string {
  return String(Math.floor(seconds / 3600));
}
function secondsToM(seconds: number): string {
  return String(Math.floor((seconds % 3600) / 60));
}

const PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function HMInput({ h, m, onH, onM }: { h: string; m: string; onH: (v: string) => void; onM: (v: string) => void }) {
  return (
    <>
      <input type="number" min="0" style={{ width: 60 }} value={h} onChange={(e) => onH(e.target.value)} />
      <span className="dim">h</span>
      <input type="number" min="0" max="59" style={{ width: 60 }} value={m} onChange={(e) => onM(e.target.value)} />
      <span className="dim">m</span>
    </>
  );
}

export default function Settings() {
  const [projects, setProjects] = useState<Project[]>([]);

  // Daily caps (min / max / extreme)
  const [caps, setCaps] = useState<DailyCaps | null>(null);
  const [minH, setMinH] = useState("6");
  const [minM, setMinM] = useState("0");
  const [maxH, setMaxH] = useState("9");
  const [maxM, setMaxM] = useState("0");
  const [extH, setExtH] = useState("11");
  const [extM, setExtM] = useState("0");

  // Period goal editor
  const [activePeriod, setActivePeriod] = useState<GoalPeriod>("daily");
  const [overall, setOverall] = useState<Goal | null>(null);
  const [byProject, setByProject] = useState<Goal[]>([]);
  const [overallH, setOverallH] = useState("6");
  const [overallM, setOverallM] = useState("0");
  const [newProjectId, setNewProjectId] = useState("");
  const [newH, setNewH] = useState("1");
  const [newM, setNewM] = useState("0");

  const [featurePrefs, setLocalFeaturePrefs] = useState(getFeaturePrefs());
  const [sidebarPrefs, setLocalSidebarPrefs] = useState(getSidebarPrefs());
  const [goalPeriodPrefs, setLocalGoalPeriodPrefs] = useState(getGoalPeriodPrefs());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [backupImporting, setBackupImporting] = useState(false);
  const [backupSummary, setBackupSummary] = useState<WorkspaceImportSummary | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const settingsFileInputRef = useRef<HTMLInputElement>(null);
  const [settingsImporting, setSettingsImporting] = useState(false);
  const [settingsSummary, setSettingsSummary] = useState<SettingsImportSummary | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  useEffect(() => {
    api.projects.list().then(setProjects);
    api.goals.getCaps().then((c) => {
      setCaps(c);
      if (c) {
        if (c.minimum_seconds != null) {
          setMinH(secondsToH(c.minimum_seconds));
          setMinM(secondsToM(c.minimum_seconds));
        }
        if (c.max_seconds != null) {
          setMaxH(secondsToH(c.max_seconds));
          setMaxM(secondsToM(c.max_seconds));
        }
        if (c.extreme_seconds != null) {
          setExtH(secondsToH(c.extreme_seconds));
          setExtM(secondsToM(c.extreme_seconds));
        }
      }
    });
  }, []);

  function refreshPeriodGoals(period: GoalPeriod) {
    api.goals.get(period).then(({ overall, byProject }) => {
      setOverall(overall);
      setByProject(byProject);
      if (overall) {
        setOverallH(secondsToH(overall.target_seconds));
        setOverallM(secondsToM(overall.target_seconds));
      } else {
        setOverallH("6");
        setOverallM("0");
      }
    });
  }

  useEffect(() => refreshPeriodGoals(activePeriod), [activePeriod]);

  async function saveCaps() {
    const updated = await api.goals.setCaps({
      minimum_seconds: hmToSeconds(minH, minM) || null,
      max_seconds: hmToSeconds(maxH, maxM) || null,
      extreme_seconds: hmToSeconds(extH, extM) || null,
    });
    setCaps(updated);
  }

  async function saveOverall() {
    const seconds = hmToSeconds(overallH, overallM);
    if (seconds <= 0) return;
    await api.goals.setOverall(activePeriod, seconds);
    refreshPeriodGoals(activePeriod);
  }

  async function removeOverall() {
    await api.goals.removeOverall(activePeriod);
    setOverall(null);
  }

  async function addProjectGoal() {
    if (!newProjectId) return;
    const seconds = hmToSeconds(newH, newM);
    if (seconds <= 0) return;
    await api.goals.setProject(activePeriod, newProjectId, seconds);
    setNewProjectId("");
    setNewH("1");
    setNewM("0");
    refreshPeriodGoals(activePeriod);
  }

  async function removeProjectGoal(projectId: string) {
    await api.goals.removeProject(activePeriod, projectId);
    refreshPeriodGoals(activePeriod);
  }

  function toggleFeaturePref(key: keyof FeaturePrefs) {
    const next = { ...featurePrefs, [key]: !featurePrefs[key] };
    setLocalFeaturePrefs(next);
    setFeaturePrefs(next);
  }

  function toggleSidebarPref(key: "showTeam" | "showClients") {
    const next = { ...sidebarPrefs, [key]: !sidebarPrefs[key] };
    setLocalSidebarPrefs(next);
    setSidebarPrefs(next);
  }

  function toggleGoalPeriodPref(key: keyof GoalPeriodPrefs) {
    const next = { ...goalPeriodPrefs, [key]: !goalPeriodPrefs[key] };
    setLocalGoalPeriodPrefs(next);
    setGoalPeriodPrefs(next);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportError(null);
    setImportSummary(null);
    setImportFileName(file.name);
    try {
      const text = await file.text();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await api.imports.clockify(text, timeZone);
      setImportSummary(result);
    } catch (e: any) {
      setImportError(e.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleBackupImportFile(file: File) {
    setBackupImporting(true);
    setBackupError(null);
    setBackupSummary(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.imports.temporalLoom(data);
      setBackupSummary(result);
      // The import can create new projects/tags — refresh what this page shows.
      api.projects.list().then(setProjects);
      refreshPeriodGoals(activePeriod);
      api.goals.getCaps().then(setCaps);
    } catch (e: any) {
      setBackupError(e.message);
    } finally {
      setBackupImporting(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = "";
    }
  }

  async function handleExportSettings() {
    const serverPortion = await api.fetchSettingsExport();
    const combined = {
      ...serverPortion,
      client_prefs: {
        features: getFeaturePrefs(),
        sidebar: getSidebarPrefs(),
        goalPeriods: getGoalPeriodPrefs(),
      },
    };
    const blob = new Blob([JSON.stringify(combined, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `temporal-loom-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSettingsImportFile(file: File) {
    setSettingsImporting(true);
    setSettingsError(null);
    setSettingsSummary(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.imports.settings(data);
      setSettingsSummary(result);

      if (data.client_prefs?.features) {
        setLocalFeaturePrefs(data.client_prefs.features);
        setFeaturePrefs(data.client_prefs.features);
      }
      if (data.client_prefs?.sidebar) {
        setLocalSidebarPrefs(data.client_prefs.sidebar);
        setSidebarPrefs(data.client_prefs.sidebar);
      }
      if (data.client_prefs?.goalPeriods) {
        setLocalGoalPeriodPrefs(data.client_prefs.goalPeriods);
        setGoalPeriodPrefs(data.client_prefs.goalPeriods);
      }

      api.goals.getCaps().then(setCaps);
      refreshPeriodGoals(activePeriod);
    } catch (e: any) {
      setSettingsError(e.message);
    } finally {
      setSettingsImporting(false);
      if (settingsFileInputRef.current) settingsFileInputRef.current.value = "";
    }
  }

  const projectsWithoutGoal = projects.filter((p) => !byProject.some((g) => g.project_id === p.id));
  const periodNoun = activePeriod === "daily" ? "day" : activePeriod === "weekly" ? "week" : activePeriod === "monthly" ? "month" : "year";

  return (
    <div className="main">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Goals, daily caps, data import/export, and layout.</p>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Daily caps
        </div>
        <p style={{ marginTop: 0, marginBottom: 12, color: "var(--ink-dim)", fontSize: 13 }}>
          Three standing lines that apply every day, regardless of any period goal below. Minimum is
          a floor you must hit; max is your normal ceiling; extreme is a hard ceiling only leaned on
          when a monthly goal's math genuinely requires it.
        </p>
        <div className="timer-form" style={{ marginBottom: 8 }}>
          <span style={{ width: 70, fontSize: 13 }}>Minimum</span>
          <HMInput h={minH} m={minM} onH={setMinH} onM={setMinM} />
        </div>
        <div className="timer-form" style={{ marginBottom: 8 }}>
          <span style={{ width: 70, fontSize: 13 }}>Max</span>
          <HMInput h={maxH} m={maxM} onH={setMaxH} onM={setMaxM} />
        </div>
        <div className="timer-form" style={{ marginBottom: 12 }}>
          <span style={{ width: 70, fontSize: 13 }}>Extreme</span>
          <HMInput h={extH} m={extM} onH={setExtH} onM={setExtM} />
        </div>
        <button className="primary" onClick={saveCaps}>
          Save caps
        </button>
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Goals
        </div>
        <div className="timer-form" style={{ marginBottom: 14 }}>
          {PERIODS.map((p) => (
            <button key={p.value} className={activePeriod === p.value ? "primary" : ""} onClick={() => setActivePeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>

        {activePeriod === "monthly" && (
          <p style={{ marginTop: 0, marginBottom: 12, color: "var(--ink-dim)", fontSize: 13 }}>
            Monthly is the only period with a full schedule behind it — the app works out how much
            you need per day from what's left and how many days remain, tells you if it's realistic
            against your daily caps, and how many rest days you can afford.
          </p>
        )}
        {(activePeriod === "weekly" || activePeriod === "yearly") && (
          <p style={{ marginTop: 0, marginBottom: 12, color: "var(--ink-dim)", fontSize: 13 }}>
            {PERIODS.find((p) => p.value === activePeriod)?.label} is a simple "at least this much"
            floor — just your total logged against the target, no derived daily schedule.
          </p>
        )}

        <div className="timer-form">
          <span style={{ width: 70, fontSize: 13 }}>Overall</span>
          <HMInput h={overallH} m={overallM} onH={setOverallH} onM={setOverallM} />
          <button className="primary" onClick={saveOverall}>
            {overall ? "Update" : "Set goal"}
          </button>
          {overall && <button onClick={removeOverall}>Remove</button>}
        </div>
        {overall && (
          <div className="dim mono" style={{ marginTop: 8, fontSize: 12 }}>
            Current: {formatDurationClock(overall.target_seconds)} / {periodNoun}
          </div>
        )}

        {byProject.length > 0 && (
          <table style={{ marginTop: 16, marginBottom: 14 }}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Target / {periodNoun}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((g) => {
                const p = projects.find((pr) => pr.id === g.project_id);
                return (
                  <tr key={g.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <ColorDot color={p?.color} />
                        {p?.name ?? g.project_id}
                      </span>
                    </td>
                    <td className="mono">{formatDurationClock(g.target_seconds)}</td>
                    <td>
                      <button className="danger" onClick={() => removeProjectGoal(g.project_id!)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {projectsWithoutGoal.length > 0 && (
          <div className="timer-form" style={{ marginTop: 12 }}>
            <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
              <option value="">Project...</option>
              {projectsWithoutGoal.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <HMInput h={newH} m={newM} onH={setNewH} onM={setNewM} />
            <button className="primary" onClick={addProjectGoal} disabled={!newProjectId}>
              Add goal
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Goal tabs shown in Time Tracker
        </div>
        {PERIODS.map((p) => {
          const key = `show${p.label}` as keyof GoalPeriodPrefs;
          return (
            <label key={p.value} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, padding: "5px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={goalPeriodPrefs[key]} onChange={() => toggleGoalPeriodPref(key)} />
              {p.label}
            </label>
          );
        })}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Tracker features
        </div>
        <p style={{ marginTop: 0, marginBottom: 10, color: "var(--ink-dim)", fontSize: 13 }}>
          Choose what kind of tracker this is — leave everything on for the full analytics suite,
          or turn off what you don't want and keep it simple.
        </p>
        {(
          [
            ["charts", "Dashboard charts (stacked daily bar + donut breakdown)"],
            ["rollups", "Hierarchical rollups (a parent task's total includes its sub-tasks)"],
            ["drillDown", "Drill-down (click a report row to see its underlying entries)"],
            ["savedViews", "Saved report views"],
            ["exportCsv", "CSV report export"],
            ["exportHtml", "HTML report export"],
            ["exportPdf", "PDF report export"],
          ] as [keyof FeaturePrefs, string][]
        ).map(([key, label]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, padding: "5px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={featurePrefs[key]} onChange={() => toggleFeaturePref(key)} />
            {label}
          </label>
        ))}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Sidebar
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, padding: "6px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={sidebarPrefs.showTeam} onChange={() => toggleSidebarPref("showTeam")} />
          Show "Team" (placeholder — no multi-user support exists yet)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, padding: "6px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={sidebarPrefs.showClients} onChange={() => toggleSidebarPref("showClients")} />
          Show "Clients" (placeholder — not built yet)
        </label>
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Import from Clockify
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Upload a Clockify CSV export. Projects, activities, and tags are matched by name (or
          created if they don't exist yet). Re-uploading the same file is safe — entries already
          imported are detected and skipped. Timestamps are converted using your browser's timezone.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
          }}
        />
        <button className="primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? "Importing..." : "Choose CSV file"}
        </button>

        {importError && <div style={{ color: "var(--danger)", marginTop: 12 }}>{importError}</div>}

        {importSummary && (
          <div style={{ marginTop: 16 }}>
            <div className="dim" style={{ marginBottom: 8 }}>
              Imported {importFileName}
            </div>
            <table>
              <tbody>
                <tr>
                  <td>Rows read</td>
                  <td className="mono">{importSummary.rows_read}</td>
                </tr>
                <tr>
                  <td>Entries imported</td>
                  <td className="mono">{importSummary.entries_imported}</td>
                </tr>
                <tr>
                  <td>Skipped (already imported)</td>
                  <td className="mono">{importSummary.entries_skipped_duplicate}</td>
                </tr>
                <tr>
                  <td>Skipped (invalid row)</td>
                  <td className="mono">{importSummary.rows_skipped_invalid}</td>
                </tr>
                <tr>
                  <td>New projects created</td>
                  <td className="mono">{importSummary.projects_created}</td>
                </tr>
                <tr>
                  <td>New activities created</td>
                  <td className="mono">{importSummary.activities_created}</td>
                </tr>
                <tr>
                  <td>New tags created</td>
                  <td className="mono">{importSummary.tags_created}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Export to Clockify
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Downloads every time entry as a CSV in the same column layout Clockify's own import
          accepts — useful if you ever want to move the other direction. Times are converted using
          your browser's timezone.
        </p>
        <a href={api.clockifyExportUrl(Intl.DateTimeFormat().resolvedOptions().timeZone)}>
          <button className="primary">Download Clockify-format CSV</button>
        </a>
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Temporal Loom backup
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Export downloads everything — projects, tasks, tags, time entries, goals, daily caps, and
          saved views — as one JSON file. Import restores from that same file: projects/tasks/tags
          are matched by name (created if missing), entries are deduped so re-running an import is
          always safe, and goals/caps/saved views are upserted.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={api.exportUrl()}>
            <button className="primary">Download full backup</button>
          </a>
          <input
            ref={backupFileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBackupImportFile(file);
            }}
          />
          <button onClick={() => backupFileInputRef.current?.click()} disabled={backupImporting}>
            {backupImporting ? "Importing..." : "Restore from backup"}
          </button>
        </div>

        {backupError && <div style={{ color: "var(--danger)", marginTop: 12 }}>{backupError}</div>}
        {backupSummary && (
          <table style={{ marginTop: 16 }}>
            <tbody>
              <tr>
                <td>Projects created</td>
                <td className="mono">{backupSummary.projects_created}</td>
              </tr>
              <tr>
                <td>Tasks created</td>
                <td className="mono">{backupSummary.activities_created}</td>
              </tr>
              <tr>
                <td>Tags created</td>
                <td className="mono">{backupSummary.tags_created}</td>
              </tr>
              <tr>
                <td>Entries imported</td>
                <td className="mono">{backupSummary.entries_imported}</td>
              </tr>
              <tr>
                <td>Entries skipped (already present)</td>
                <td className="mono">{backupSummary.entries_skipped_duplicate}</td>
              </tr>
              <tr>
                <td>Goals restored</td>
                <td className="mono">{backupSummary.goals_restored}</td>
              </tr>
              <tr>
                <td>Daily caps restored</td>
                <td className="mono">{backupSummary.daily_caps_restored ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td>Saved views restored</td>
                <td className="mono">{backupSummary.saved_views_restored}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          App settings
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          A smaller export covering just configuration, not tracked data: daily caps, all four goal
          periods (project goals matched by name so this is portable to a different database), saved
          views, and this browser's display preferences (tracker features, sidebar visibility, goal
          tabs). Useful for moving your setup to a new browser or a fresh install without re-entering
          everything by hand.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="primary" onClick={handleExportSettings}>
            Export settings
          </button>
          <input
            ref={settingsFileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSettingsImportFile(file);
            }}
          />
          <button onClick={() => settingsFileInputRef.current?.click()} disabled={settingsImporting}>
            {settingsImporting ? "Importing..." : "Import settings"}
          </button>
        </div>

        {settingsError && <div style={{ color: "var(--danger)", marginTop: 12 }}>{settingsError}</div>}
        {settingsSummary && (
          <table style={{ marginTop: 16 }}>
            <tbody>
              <tr>
                <td>Daily caps restored</td>
                <td className="mono">{settingsSummary.daily_caps_restored ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td>Goals restored</td>
                <td className="mono">{settingsSummary.goals_restored}</td>
              </tr>
              <tr>
                <td>Saved views restored</td>
                <td className="mono">{settingsSummary.saved_views_restored}</td>
              </tr>
            </tbody>
            {settingsSummary.errors.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ color: "var(--danger)", fontSize: 12 }}>
                    {settingsSummary.errors.join("; ")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <div className="card">
        <div className="dim">Server</div>
        <div className="mono" style={{ marginTop: 4 }}>
          http://0.0.0.0:4310 — see server/.env.example
        </div>
      </div>
    </div>
  );
}
