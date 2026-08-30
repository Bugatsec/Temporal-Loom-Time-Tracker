import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { ColorDot } from "../components/ColorDot";
import { formatDurationClock } from "../utils/date";
import { getSidebarPrefs, setSidebarPrefs } from "../utils/sidebarPrefs";
import type { ImportSummary } from "../api/importTypes";
import type { Goal, Project } from "../api/types";

function hmToSeconds(h: string, m: string): number {
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60;
}

function secondsToH(seconds: number): string {
  return String(Math.floor(seconds / 3600));
}

function secondsToM(seconds: number): string {
  return String(Math.floor((seconds % 3600) / 60));
}

export default function Settings() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [overall, setOverall] = useState<Goal | null>(null);
  const [byProject, setByProject] = useState<Goal[]>([]);

  const [overallH, setOverallH] = useState("6");
  const [overallM, setOverallM] = useState("0");

  const [newProjectId, setNewProjectId] = useState("");
  const [newH, setNewH] = useState("1");
  const [newM, setNewM] = useState("0");

  const [sidebarPrefs, setLocalSidebarPrefs] = useState(getSidebarPrefs());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  function refresh() {
    api.goals.get().then(({ overall, byProject }) => {
      setOverall(overall);
      setByProject(byProject);
      if (overall) {
        setOverallH(secondsToH(overall.target_seconds));
        setOverallM(secondsToM(overall.target_seconds));
      }
    });
    api.projects.list().then(setProjects);
  }

  useEffect(refresh, []);

  async function saveOverall() {
    const seconds = hmToSeconds(overallH, overallM);
    if (seconds <= 0) return;
    await api.goals.setOverall(seconds);
    refresh();
  }

  async function removeOverall() {
    await api.goals.removeOverall();
    setOverall(null);
  }

  async function addProjectGoal() {
    if (!newProjectId) return;
    const seconds = hmToSeconds(newH, newM);
    if (seconds <= 0) return;
    await api.goals.setProject(newProjectId, seconds);
    setNewProjectId("");
    setNewH("1");
    setNewM("0");
    refresh();
  }

  async function removeProjectGoal(projectId: string) {
    await api.goals.removeProject(projectId);
    refresh();
  }

  function toggleSidebarPref(key: "showTeam" | "showClients") {
    const next = { ...sidebarPrefs, [key]: !sidebarPrefs[key] };
    setLocalSidebarPrefs(next);
    setSidebarPrefs(next);
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

  const projectsWithoutGoal = projects.filter((p) => !byProject.some((g) => g.project_id === p.id));

  return (
    <div className="main">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Daily targets, data import/export, and sidebar layout.</p>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Overall daily goal
        </div>
        <div className="timer-form">
          <input type="number" min="0" style={{ width: 60 }} value={overallH} onChange={(e) => setOverallH(e.target.value)} />
          <span className="dim">h</span>
          <input type="number" min="0" max="59" style={{ width: 60 }} value={overallM} onChange={(e) => setOverallM(e.target.value)} />
          <span className="dim">m</span>
          <button className="primary" onClick={saveOverall}>
            {overall ? "Update" : "Set goal"}
          </button>
          {overall && <button onClick={removeOverall}>Remove</button>}
        </div>
        {overall && (
          <div className="dim mono" style={{ marginTop: 8, fontSize: 12 }}>
            Current: {formatDurationClock(overall.target_seconds)} / day
          </div>
        )}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Per-project daily goals
        </div>

        {byProject.length > 0 && (
          <table style={{ marginBottom: 14 }}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Target / day</th>
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
          <div className="timer-form">
            <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
              <option value="">Project...</option>
              {projectsWithoutGoal.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input type="number" min="0" style={{ width: 60 }} value={newH} onChange={(e) => setNewH(e.target.value)} />
            <span className="dim">h</span>
            <input type="number" min="0" max="59" style={{ width: 60 }} value={newM} onChange={(e) => setNewM(e.target.value)} />
            <span className="dim">m</span>
            <button className="primary" onClick={addProjectGoal} disabled={!newProjectId}>
              Add goal
            </button>
          </div>
        )}
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
          Export
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Downloads the full workspace — projects, activities, tags, and time entries — as versioned JSON.
        </p>
        <a href={api.exportUrl()}>
          <button className="primary">Download JSON export</button>
        </a>
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
