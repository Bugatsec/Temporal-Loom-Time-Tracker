import { Router } from "express";
import {
  createManualEntry,
  getRunningEntry,
  listEntries,
  softDeleteEntry,
  startTimer,
  stopTimer,
  updateEntry,
} from "../models/timeEntry.js";

export const timeEntriesRouter = Router();

// GET /api/v1/time-entries?from=&to=&project_id=&activity_id=&limit=
timeEntriesRouter.get("/", (req, res) => {
  const { from, to, project_id, activity_id, limit } = req.query;
  res.json(
    listEntries({
      from: from as string | undefined,
      to: to as string | undefined,
      project_id: project_id as string | undefined,
      activity_id: activity_id as string | undefined,
      limit: limit ? Number(limit) : undefined,
    })
  );
});

// GET /api/v1/time-entries/running — null if no timer is active
timeEntriesRouter.get("/running", (_req, res) => {
  res.json(getRunningEntry() ?? null);
});

// POST /api/v1/time-entries/start
timeEntriesRouter.post("/start", (req, res) => {
  const { project_id, activity_id, target_id, description, billable, tags } = req.body ?? {};
  if (!project_id || !activity_id) {
    return res.status(400).json({ error: "project_id and activity_id are required" });
  }
  try {
    res
      .status(201)
      .json(startTimer({ project_id, activity_id, target_id, description, billable, tags }));
  } catch (err: any) {
    if (err.code === "TIMER_ALREADY_RUNNING") {
      return res.status(409).json({ error: err.message, running_entry: err.entry });
    }
    throw err;
  }
});

// POST /api/v1/time-entries/:id/stop
timeEntriesRouter.post("/:id/stop", (req, res) => {
  try {
    res.json(stopTimer(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/time-entries — manual entry creation (doc 3.1 step: allow immediate edit)
timeEntriesRouter.post("/", (req, res) => {
  const { project_id, activity_id, target_id, start_at, end_at, description, billable, tags } =
    req.body ?? {};
  if (!project_id || !activity_id || !start_at || !end_at) {
    return res
      .status(400)
      .json({ error: "project_id, activity_id, start_at, and end_at are required" });
  }
  try {
    res
      .status(201)
      .json(
        createManualEntry({
          project_id,
          activity_id,
          target_id,
          start_at,
          end_at,
          description,
          billable,
          tags,
        })
      );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/v1/time-entries/:id
timeEntriesRouter.patch("/:id", (req, res) => {
  const updated = updateEntry(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "Entry not found" });
  res.json(updated);
});

// DELETE /api/v1/time-entries/:id — soft delete (doc 8.2: recoverable by default)
timeEntriesRouter.delete("/:id", (req, res) => {
  softDeleteEntry(req.params.id);
  res.status(204).end();
});
