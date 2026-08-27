import "dotenv/config";
import cors from "cors";
import express from "express";
import { applySchema } from "./db/client.js";
import { runMigrations } from "./db/migrations.js";
import { activitiesRouter } from "./routes/activities.js";
import { exportRouter } from "./routes/export.js";
import { importsRouter } from "./routes/imports.js";
import { projectsRouter } from "./routes/projects.js";
import { reportsRouter } from "./routes/reports.js";
import { tagsRouter } from "./routes/tags.js";
import { timeEntriesRouter } from "./routes/timeEntries.js";
import { workspacesRouter } from "./routes/workspaces.js";

applySchema();
runMigrations();

const app = express();
app.use(cors());
// Raised from Express's 100kb default — a year of Clockify export CSV,
// sent as a JSON string body by the importer, comfortably exceeds that.
app.use(express.json({ limit: "20mb" }));

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

app.use("/api/v1/workspaces", workspacesRouter);
app.use("/api/v1/projects", projectsRouter);
app.use("/api/v1/activities", activitiesRouter);
app.use("/api/v1/time-entries", timeEntriesRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/exports", exportRouter);
app.use("/api/v1/tags", tagsRouter);
app.use("/api/v1/imports", importsRouter);

// Centralized error handler — keeps route handlers free of try/catch boilerplate
// for anything that isn't a domain-specific 4xx already handled inline.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4310);
const host = process.env.HOST ?? "127.0.0.1"; // localhost-only by default — doc section 17

app.listen(port, host, () => {
  console.log(`Temporal Loom server listening on http://${host}:${port}`);
});
