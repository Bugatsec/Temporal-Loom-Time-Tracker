import { Router } from "express";
import { getDailyCaps, setDailyCaps } from "../models/dailyCaps.js";
import {
  deleteOverallGoal,
  deleteProjectGoal,
  getOverallGoal,
  listProjectGoals,
  setOverallGoal,
  setProjectGoal,
  type GoalPeriod,
} from "../models/goal.js";
import { computeGoalStatus } from "../services/goalStatusService.js";
import { isValidTimeZone } from "../utils/timezone.js";

export const goalsRouter = Router();

const VALID_PERIODS: GoalPeriod[] = ["daily", "weekly", "monthly", "yearly"];

function isValidPeriod(p: string): p is GoalPeriod {
  return (VALID_PERIODS as string[]).includes(p);
}

// GET /api/v1/goals/status?timeZone=Asia/Kolkata — the live computed
// bundle the Time Tracker card renders from.
goalsRouter.get("/status", (req, res) => {
  const timeZone = req.query.timeZone as string | undefined;
  if (!timeZone) return res.status(400).json({ error: "timeZone (IANA name) is required" });
  if (!isValidTimeZone(timeZone)) return res.status(400).json({ error: `Unrecognized timeZone: ${timeZone}` });
  res.json(computeGoalStatus(timeZone));
});

// GET/PUT /api/v1/goals/caps — the three standing daily lines
goalsRouter.get("/caps", (_req, res) => {
  res.json(getDailyCaps() ?? null);
});

goalsRouter.put("/caps", (req, res) => {
  const { minimum_seconds, max_seconds, extreme_seconds } = req.body ?? {};
  for (const [key, val] of Object.entries({ minimum_seconds, max_seconds, extreme_seconds })) {
    if (val !== undefined && val !== null && (!Number.isFinite(val) || val < 0)) {
      return res.status(400).json({ error: `${key} must be a non-negative number or null` });
    }
  }
  res.json(setDailyCaps({ minimum_seconds, max_seconds, extreme_seconds }));
});

// GET /api/v1/goals/:period -> { overall: Goal|null, byProject: Goal[] }
goalsRouter.get("/:period", (req, res) => {
  const { period } = req.params;
  if (!isValidPeriod(period)) return res.status(400).json({ error: "Invalid period" });
  res.json({ overall: getOverallGoal(period) ?? null, byProject: listProjectGoals(period) });
});

goalsRouter.put("/:period/overall", (req, res) => {
  const { period } = req.params;
  if (!isValidPeriod(period)) return res.status(400).json({ error: "Invalid period" });
  const { target_seconds } = req.body ?? {};
  if (!Number.isFinite(target_seconds) || target_seconds <= 0) {
    return res.status(400).json({ error: "target_seconds must be a positive number" });
  }
  res.json(setOverallGoal(period, target_seconds));
});

goalsRouter.delete("/:period/overall", (req, res) => {
  const { period } = req.params;
  if (!isValidPeriod(period)) return res.status(400).json({ error: "Invalid period" });
  deleteOverallGoal(period);
  res.status(204).end();
});

goalsRouter.put("/:period/project/:projectId", (req, res) => {
  const { period, projectId } = req.params;
  if (!isValidPeriod(period)) return res.status(400).json({ error: "Invalid period" });
  const { target_seconds } = req.body ?? {};
  if (!Number.isFinite(target_seconds) || target_seconds <= 0) {
    return res.status(400).json({ error: "target_seconds must be a positive number" });
  }
  res.json(setProjectGoal(period, projectId, target_seconds));
});

goalsRouter.delete("/:period/project/:projectId", (req, res) => {
  const { period, projectId } = req.params;
  if (!isValidPeriod(period)) return res.status(400).json({ error: "Invalid period" });
  deleteProjectGoal(period, projectId);
  res.status(204).end();
});
