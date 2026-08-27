import { useRef, useState } from "react";
import { api } from "../api/client";
import type { ImportSummary } from "../api/importTypes";

export default function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFileChosen(file: File) {
    setImporting(true);
    setError(null);
    setSummary(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await api.imports.clockify(text, timeZone);
      setSummary(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="main">
      <h1 className="page-title">Import / Export</h1>
      <p className="page-subtitle">Your data, out at any time — no cloud service required.</p>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Import from Clockify
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Upload a Clockify CSV export. Projects, activities, and tags are matched by name (or
          created if they don't exist yet) — since Clockify's "Task" field wasn't used in your
          export, imported entries are filed under a "General" activity per project, with the
          original description and tags kept intact. Re-uploading the same file is safe — entries
          already imported are detected and skipped. Timestamps are converted using your browser's
          timezone, so start/end times land on the correct day even if this server itself is set
          to a different timezone.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChosen(file);
          }}
        />
        <button className="primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? "Importing…" : "Choose CSV file"}
        </button>

        {error && <div style={{ color: "var(--danger)", marginTop: 12 }}>{error}</div>}

        {summary && (
          <div style={{ marginTop: 16 }}>
            <div className="dim" style={{ marginBottom: 8 }}>
              Imported {fileName}
            </div>
            <table>
              <tbody>
                <tr>
                  <td>Rows read</td>
                  <td className="mono">{summary.rows_read}</td>
                </tr>
                <tr>
                  <td>Entries imported</td>
                  <td className="mono">{summary.entries_imported}</td>
                </tr>
                <tr>
                  <td>Skipped (already imported)</td>
                  <td className="mono">{summary.entries_skipped_duplicate}</td>
                </tr>
                <tr>
                  <td>Skipped (invalid row)</td>
                  <td className="mono">{summary.rows_skipped_invalid}</td>
                </tr>
                <tr>
                  <td>New projects created</td>
                  <td className="mono">{summary.projects_created}</td>
                </tr>
                <tr>
                  <td>New activities created</td>
                  <td className="mono">{summary.activities_created}</td>
                </tr>
                <tr>
                  <td>New tags created</td>
                  <td className="mono">{summary.tags_created}</td>
                </tr>
              </tbody>
            </table>
            {summary.errors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="dim" style={{ marginBottom: 6 }}>
                  Row errors
                </div>
                {summary.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="dim" style={{ fontSize: 12 }}>
                    Row {e.row}: {e.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Export
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Downloads the full workspace — projects, activities, tags, and time entries — as
          versioned JSON.
        </p>
        <a href={api.exportUrl()}>
          <button className="primary">Download JSON export</button>
        </a>
      </div>
    </div>
  );
}
