import { Router } from "express";
import { archiveActivity, getOrCreateActivity, listActivities } from "../models/activity.js";

export const activitiesRouter = Router();

// GET /api/v1/activities?project_id=proj_xxx
activitiesRouter.get("/", (req, res) => {
  const projectId = req.query.project_id as string | undefined;
  if (!projectId) return res.status(400).json({ error: "project_id query param is required" });
  res.json(listActivities(projectId, req.query.includeArchived === "true"));
});

// Get-or-create by name within the project (case-insensitive) — same
// combobox-friendly pattern as POST /projects.
activitiesRouter.post("/", (req, res) => {
  const { project_id, name, parent_id } = req.body ?? {};
  if (!project_id || !name || !String(name).trim()) {
    return res.status(400).json({ error: "project_id and name are required" });
  }
  const { activity, created } = getOrCreateActivity(project_id, String(name).trim(), parent_id);
  res.status(created ? 201 : 200).json(activity);
});

activitiesRouter.post("/:id/archive", (req, res) => {
  archiveActivity(req.params.id);
  res.status(204).end();
});
