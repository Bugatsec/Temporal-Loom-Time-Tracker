import { Router } from "express";
import { importClockifyCsv } from "../services/importClockify.js";
import { importWorkspaceJson } from "../services/exportService.js";
import { importSettingsJson } from "../services/settingsExportService.js";

export const importsRouter = Router();

// POST /api/v1/imports/clockify  { csv: "<raw file text>", timeZone: "Asia/Kolkata" }
importsRouter.post("/clockify", (req, res) => {
  const { csv, timeZone } = req.body ?? {};
  if (!csv || typeof csv !== "string") {
    return res.status(400).json({ error: "csv (raw file text) is required" });
  }
  if (!timeZone || typeof timeZone !== "string") {
    return res.status(400).json({ error: "timeZone (IANA name, e.g. Asia/Kolkata) is required" });
  }
  try {
    // Fail fast on a garbage zone name rather than silently mis-dating every row.
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    return res.status(400).json({ error: `Unrecognized timeZone: ${timeZone}` });
  }
  try {
    res.json(importClockifyCsv(csv, timeZone));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/imports/temporal-loom — body is the raw JSON export file's
// contents (schema_version 1 or 2), not wrapped in an envelope.
importsRouter.post("/temporal-loom", (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "A Temporal Loom export JSON body is required" });
  }
  try {
    res.json(importWorkspaceJson(req.body));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/imports/settings — body is a settings export produced by
// GET /api/v1/exports/settings.json
importsRouter.post("/settings", (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "A settings export JSON body is required" });
  }
  try {
    res.json(importSettingsJson(req.body));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
