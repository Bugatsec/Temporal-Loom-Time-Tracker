import { Router } from "express";
import { breakdownByProject, totalForRange } from "../services/reportService.js";

export const reportsRouter = Router();

// GET /api/v1/reports/summary?from=2026-08-25T00:00:00Z&to=2026-08-26T00:00:00Z
reportsRouter.get("/summary", (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  res.json(totalForRange(from as string, to as string));
});

// GET /api/v1/reports/by-project?from=&to=
reportsRouter.get("/by-project", (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to are required (ISO 8601)" });
  res.json(breakdownByProject(from as string, to as string));
});
