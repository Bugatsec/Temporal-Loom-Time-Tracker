import { Router } from "express";
import { importClockifyCsv } from "../services/importClockify.js";

export const importsRouter = Router();

// POST /api/v1/imports/clockify  { csv: "<raw file text>" }
importsRouter.post("/clockify", (req, res) => {
  const { csv } = req.body ?? {};
  if (!csv || typeof csv !== "string") {
    return res.status(400).json({ error: "csv (raw file text) is required" });
  }
  try {
    res.json(importClockifyCsv(csv));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
