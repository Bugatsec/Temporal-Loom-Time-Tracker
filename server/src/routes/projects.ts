import { Router } from "express";
import {
  archiveProject,
  getOrCreateProject,
  getProject,
  listProjects,
  updateProject,
} from "../models/project.js";

export const projectsRouter = Router();

// GET /api/v1/projects?includeArchived=true
projectsRouter.get("/", (req, res) => {
  res.json(listProjects(req.query.includeArchived === "true"));
});

projectsRouter.get("/:id", (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

// Get-or-create by name (case-insensitive) — lets the timer combobox
// "type a new project and it just gets added" without a separate page,
// while still deduping if you type the name of an existing project.
projectsRouter.post("/", (req, res) => {
  const { name, color } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const { project, created } = getOrCreateProject(name.trim(), color);
  res.status(created ? 201 : 200).json(project);
});

projectsRouter.patch("/:id", (req, res) => {
  const updated = updateProject(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "Project not found" });
  res.json(updated);
});

// Archive rather than delete — see doc 10.2: never orphan historical time entries.
projectsRouter.post("/:id/archive", (req, res) => {
  archiveProject(req.params.id);
  res.status(204).end();
});
