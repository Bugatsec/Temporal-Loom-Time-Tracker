import { Router } from "express";
import { createSavedView, deleteSavedView, listSavedViews } from "../models/savedView.js";

export const savedViewsRouter = Router();

savedViewsRouter.get("/", (_req, res) => {
  res.json(listSavedViews());
});

savedViewsRouter.post("/", (req, res) => {
  const { name, config } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (config === undefined) {
    return res.status(400).json({ error: "config is required" });
  }
  res.status(201).json(createSavedView(name.trim(), config));
});

savedViewsRouter.delete("/:id", (req, res) => {
  deleteSavedView(req.params.id);
  res.status(204).end();
});
