import PDFDocument from "pdfkit";
import { breakdownByActivityRollup, breakdownByProject, totalForRange } from "./reportService.js";
import { toCsv } from "./csv.js";

function hms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function buildReportCsv(from: string, to: string): string {
  const byProject = breakdownByProject(from, to);
  const rows: (string | number)[][] = [["Project", "Entries", "Total (HH:MM:SS)", "Total (seconds)"]];
  for (const row of byProject) {
    rows.push([row.project_name, row.entry_count, hms(row.total_seconds), row.total_seconds]);
  }
  return toCsv(rows);
}

export function buildReportHtml(from: string, to: string): string {
  const summary = totalForRange(from, to);
  const byProject = breakdownByProject(from, to);
  const byActivity = breakdownByActivityRollup(from, to);

  const projectRows = byProject
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.project_name)}</td><td>${r.entry_count}</td><td>${hms(r.total_seconds)}</td></tr>`
    )
    .join("");

  const activityRows = byActivity
    .map(
      (r) =>
        `<tr><td style="padding-left:${16 + r.depth * 20}px">${escapeHtml(r.activity_name)}</td><td>${hms(r.rollup_seconds)}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Temporal Loom report — ${from.slice(0, 10)} to ${to.slice(0, 10)}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 720px; margin: 40px auto; color: #1a1a1a; }
  h1 { font-size: 20px; }
  .range { color: #666; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 13px; }
  th { color: #666; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
  .total { font-size: 24px; font-weight: 600; margin-bottom: 24px; }
</style>
</head>
<body>
  <h1>Temporal Loom report</h1>
  <div class="range">${from.slice(0, 10)} to ${to.slice(0, 10)}</div>
  <div class="total">${hms(summary.total_seconds)} total — ${summary.entry_count} entries</div>

  <h2>By project</h2>
  <table>
    <thead><tr><th>Project</th><th>Entries</th><th>Total</th></tr></thead>
    <tbody>${projectRows || `<tr><td colspan="3">No entries in this range.</td></tr>`}</tbody>
  </table>

  <h2>By activity (rolled up)</h2>
  <table>
    <thead><tr><th>Activity</th><th>Total</th></tr></thead>
    <tbody>${activityRows || `<tr><td colspan="2">No entries in this range.</td></tr>`}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Streams a simple PDF report directly to the response — summary total,
 *  per-project table, and the rolled-up per-activity table. */
export function streamReportPdf(from: string, to: string, res: NodeJS.WritableStream): void {
  const summary = totalForRange(from, to);
  const byProject = breakdownByProject(from, to);
  const byActivity = breakdownByActivityRollup(from, to);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Temporal Loom report", { continued: false });
  doc.fontSize(10).fillColor("#666").text(`${from.slice(0, 10)} to ${to.slice(0, 10)}`);
  doc.moveDown();
  doc.fontSize(22).fillColor("#000").text(`${hms(summary.total_seconds)} total`);
  doc.fontSize(10).fillColor("#666").text(`${summary.entry_count} entries`);
  doc.moveDown(1.5);

  doc.fontSize(13).fillColor("#000").text("By project");
  doc.moveDown(0.3);
  for (const row of byProject) {
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(row.project_name, { continued: true, width: 350 })
      .fillColor("#666")
      .text(`  ${row.entry_count} entries  —  ${hms(row.total_seconds)}`);
  }
  if (byProject.length === 0) doc.fontSize(10).fillColor("#666").text("No entries in this range.");
  doc.moveDown(1.5);

  doc.fontSize(13).fillColor("#000").text("By activity (rolled up)");
  doc.moveDown(0.3);
  for (const row of byActivity) {
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`${"  ".repeat(row.depth)}${row.activity_name}`, { continued: true, width: 350 })
      .fillColor("#666")
      .text(`  ${hms(row.rollup_seconds)}`);
  }
  if (byActivity.length === 0) doc.fontSize(10).fillColor("#666").text("No entries in this range.");

  doc.end();
}
