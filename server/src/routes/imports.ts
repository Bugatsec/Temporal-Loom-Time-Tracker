import { Router } from "express";
import { importClockifyCsv } from "../services/importClockify.js";

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
