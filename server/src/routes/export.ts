import { Router } from "express";
import { exportWorkspaceJson } from "../services/exportService.js";

export const exportRouter = Router();

// GET /api/v1/exports/json
exportRouter.get("/json", (_req, res) => {
  const payload = exportWorkspaceJson();
  const filename = `temporal-loom-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(payload);
});
