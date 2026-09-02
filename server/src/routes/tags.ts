import { Router } from "express";
import { getOrCreateTag, listTags, updateTagColor } from "../models/tag.js";

export const tagsRouter = Router();

// GET /api/v1/tags
tagsRouter.get("/", (_req, res) => {
  res.json(listTags());
});

// POST /api/v1/tags — get-or-create by name, same pattern as projects/activities
tagsRouter.post("/", (req, res) => {
  const { name, color } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  res.status(201).json(getOrCreateTag(name, color));
});

tagsRouter.patch("/:id", (req, res) => {
  const { color } = req.body ?? {};
  if (!color) return res.status(400).json({ error: "color is required" });
  const updated = updateTagColor(req.params.id, color);
  if (!updated) return res.status(404).json({ error: "Tag not found" });
  res.json(updated);
});
