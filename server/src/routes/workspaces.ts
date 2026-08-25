import { Router } from "express";
import { getDefaultWorkspace, listWorkspaces } from "../models/workspace.js";

export const workspacesRouter = Router();

// GET /api/v1/workspaces
workspacesRouter.get("/", (_req, res) => {
  res.json(listWorkspaces());
});

// GET /api/v1/workspaces/current — convenience for the Stage 1 single-workspace client
workspacesRouter.get("/current", (_req, res) => {
  res.json(getDefaultWorkspace());
});
