import { Router } from "express";
import { createTag, deleteTag, findTagByName, listTags, updateTag } from "../models/tag.js";

export const tagsRouter = Router();

// GET /api/v1/tags
tagsRouter.get("/", (_req, res) => {
  res.json(listTags());
});

// POST /api/v1/tags — get-or-create by name (dedupes, ignoring parent_id
// on an existing match), same pattern as projects/activities. parent_id
// lets the Tags management page create a sub-tag directly.
tagsRouter.post("/", (req, res) => {
  const { name, color, parent_id } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const existing = findTagByName(name.trim());
  if (existing) return res.status(200).json(existing);
  res.status(201).json(createTag(name.trim(), color, parent_id ?? null));
});

// PATCH /api/v1/tags/:id — name, color, and/or parent_id
tagsRouter.patch("/:id", (req, res) => {
  const { name, color, parent_id } = req.body ?? {};
  const updated = updateTag(req.params.id, { name, color, parent_id });
  if (!updated) return res.status(404).json({ error: "Tag not found" });
  res.json(updated);
});

tagsRouter.delete("/:id", (req, res) => {
  deleteTag(req.params.id);
  res.status(204).end();
});
