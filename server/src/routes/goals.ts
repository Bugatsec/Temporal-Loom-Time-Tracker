import { Router } from "express";
import {
  deleteOverallGoal,
  deleteProjectGoal,
  getOverallGoal,
  listProjectGoals,
  setOverallGoal,
  setProjectGoal,
} from "../models/goal.js";

export const goalsRouter = Router();

// GET /api/v1/goals -> { overall: Goal|null, byProject: Goal[] }
goalsRouter.get("/", (_req, res) => {
  res.json({ overall: getOverallGoal() ?? null, byProject: listProjectGoals() });
});

goalsRouter.put("/overall", (req, res) => {
  const { target_seconds } = req.body ?? {};
  if (!Number.isFinite(target_seconds) || target_seconds <= 0) {
    return res.status(400).json({ error: "target_seconds must be a positive number" });
  }
  res.json(setOverallGoal(target_seconds));
});

goalsRouter.delete("/overall", (_req, res) => {
  deleteOverallGoal();
  res.status(204).end();
});

goalsRouter.put("/project/:projectId", (req, res) => {
  const { target_seconds } = req.body ?? {};
  if (!Number.isFinite(target_seconds) || target_seconds <= 0) {
    return res.status(400).json({ error: "target_seconds must be a positive number" });
  }
  res.json(setProjectGoal(req.params.projectId, target_seconds));
});

goalsRouter.delete("/project/:projectId", (req, res) => {
  deleteProjectGoal(req.params.projectId);
  res.status(204).end();
});
