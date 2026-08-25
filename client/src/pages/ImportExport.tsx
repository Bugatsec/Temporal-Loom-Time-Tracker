import { api } from "../api/client";

export default function ImportExport() {
  return (
    <div className="main">
      <h1 className="page-title">Import / Export</h1>
      <p className="page-subtitle">Your data, out at any time — no cloud service required.</p>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Export
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Downloads the full workspace — projects, activities, and time entries — as versioned JSON
          (schema_version 1), matching the canonical export format the Stage 2 importer will read back in.
        </p>
        <a href={api.exportUrl()}>
          <button className="primary">Download JSON export</button>
        </a>
      </div>

      <div className="card">
        <div className="dim" style={{ marginBottom: 10 }}>
          Import
        </div>
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Clockify import (preview, dry-run, conflict handling) is Stage 2 scope — not part of this
          foundation build.
        </p>
      </div>
    </div>
  );
}
