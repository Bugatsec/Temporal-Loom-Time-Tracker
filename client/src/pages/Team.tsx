export default function Team() {
  return (
    <div className="main">
      <h1 className="page-title">Team</h1>
      <p className="page-subtitle">Not applicable here — yet.</p>
      <div className="card">
        <p style={{ marginTop: 0, color: "var(--ink-dim)", fontSize: 13 }}>
          Temporal Loom is a self-hosted, single-user tracker — there's no multi-user auth or team
          membership under the hood, so there's nothing to manage on this page right now. It's kept
          in the sidebar (behind a toggle in Settings) for parity with Clockify's layout, in case
          multi-user support becomes worth building later.
        </p>
      </div>
    </div>
  );
}
