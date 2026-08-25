import "dotenv/config";
import cors from "cors";
import express from "express";
import { applySchema } from "./db/client.js";
import { activitiesRouter } from "./routes/activities.js";
import { exportRouter } from "./routes/export.js";
import { projectsRouter } from "./routes/projects.js";
import { reportsRouter } from "./routes/reports.js";
import { timeEntriesRouter } from "./routes/timeEntries.js";
import { workspacesRouter } from "./routes/workspaces.js";

applySchema();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

app.use("/api/v1/workspaces", workspacesRouter);
app.use("/api/v1/projects", projectsRouter);
app.use("/api/v1/activities", activitiesRouter);
app.use("/api/v1/time-entries", timeEntriesRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/exports", exportRouter);

// Centralized error handler — keeps route handlers free of try/catch boilerplate
// for anything that isn't a domain-specific 4xx already handled inline.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4310);
const host = process.env.HOST ?? "127.0.0.1"; // localhost-only by default — doc section 17

app.listen(port, host, () => {
  console.log(`bug-bounty-life server listening on http://${host}:${port}`);
});
