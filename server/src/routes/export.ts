import { Router } from "express";
import { buildClockifyExportCsv } from "../services/clockifyExportService.js";
import { exportWorkspaceJson } from "../services/exportService.js";
import { exportSettingsJson } from "../services/settingsExportService.js";
import { isValidTimeZone } from "../utils/timezone.js";

export const exportRouter = Router();

// GET /api/v1/exports/json
exportRouter.get("/json", (_req, res) => {
  const payload = exportWorkspaceJson();
  const filename = `temporal-loom-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(payload);
});

// GET /api/v1/exports/settings.json — caps, goals, saved views only (not
// tracked data). The client merges this with its own localStorage
// preferences before offering it as a single download.
exportRouter.get("/settings.json", (_req, res) => {
  res.json(exportSettingsJson());
});

// GET /api/v1/exports/clockify.csv?timeZone=Asia/Kolkata
exportRouter.get("/clockify.csv", (req, res) => {
  const timeZone = req.query.timeZone as string | undefined;
  if (!timeZone) return res.status(400).json({ error: "timeZone (IANA name) is required" });
  if (!isValidTimeZone(timeZone)) return res.status(400).json({ error: `Unrecognized timeZone: ${timeZone}` });
  const csv = buildClockifyExportCsv(timeZone);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="temporal-loom-clockify-export-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
