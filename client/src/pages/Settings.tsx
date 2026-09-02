export default function Settings() {
  return (
    <div className="main">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">
        Stage 1 has no configurable settings yet. The label/theme/field customization system described in
        Stage 5 of the product doc will live here.
      </p>
      <div className="card">
        <div className="dim">Server</div>
        <div className="mono" style={{ marginTop: 4 }}>
          http://127.0.0.1:4310 (localhost-only by default — see server/.env.example)
        </div>
      </div>
    </div>
  );
}
