import { Router } from "express";
import { archiveActivity, createActivity, listActivities } from "../models/activity.js";

export const activitiesRouter = Router();

// GET /api/v1/activities?project_id=proj_xxx
activitiesRouter.get("/", (req, res) => {
  const projectId = req.query.project_id as string | undefined;
  if (!projectId) return res.status(400).json({ error: "project_id query param is required" });
  res.json(listActivities(projectId, req.query.includeArchived === "true"));
});

activitiesRouter.post("/", (req, res) => {
  const { project_id, name, parent_id, color } = req.body ?? {};
  if (!project_id || !name) {
    return res.status(400).json({ error: "project_id and name are required" });
  }
  res.status(201).json(createActivity(project_id, name, parent_id, color));
});

activitiesRouter.post("/:id/archive", (req, res) => {
  archiveActivity(req.params.id);
  res.status(204).end();
});
