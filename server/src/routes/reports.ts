import { Router, type Request } from "express";
import { breakdownByActivityRollup, breakdownByProject, totalForRange } from "../services/reportService.js";
import { buildReportCsv, buildReportHtml, streamReportPdf } from "../services/reportExportService.js";

export const reportsRouter = Router();

function requireRange(req: Request): { from: string; to: string } | null {
  const { from, to } = req.query;
  if (!from || !to) return null;
  return { from: from as string, to: to as string };
}

// GET /api/v1/reports/summary?from=&to=
reportsRouter.get("/summary", (req, res) => {
  const range = requireRange(req);
  if (!range) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  res.json(totalForRange(range.from, range.to));
});

// GET /api/v1/reports/by-project?from=&to=
reportsRouter.get("/by-project", (req, res) => {
  const range = requireRange(req);
  if (!range) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  res.json(breakdownByProject(range.from, range.to));
});

// GET /api/v1/reports/by-activity?from=&to=&project_id=  — hierarchical rollup
reportsRouter.get("/by-activity", (req, res) => {
  const range = requireRange(req);
  if (!range) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  res.json(breakdownByActivityRollup(range.from, range.to, req.query.project_id as string | undefined));
});

// GET /api/v1/reports/export.csv?from=&to=
reportsRouter.get("/export.csv", (req, res) => {
  const range = requireRange(req);
  if (!range) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  const csv = buildReportCsv(range.from, range.to);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="report-${range.from.slice(0, 10)}-${range.to.slice(0, 10)}.csv"`);
  res.send(csv);
});

// GET /api/v1/reports/export.html?from=&to=
reportsRouter.get("/export.html", (req, res) => {
  const range = requireRange(req);
  if (!range) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  res.setHeader("Content-Type", "text/html");
  res.send(buildReportHtml(range.from, range.to));
});

// GET /api/v1/reports/export.pdf?from=&to=
reportsRouter.get("/export.pdf", (req, res) => {
  const range = requireRange(req);
  if (!range) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="report-${range.from.slice(0, 10)}-${range.to.slice(0, 10)}.pdf"`);
  streamReportPdf(range.from, range.to, res);
});
