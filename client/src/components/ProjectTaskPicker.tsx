import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { ColorDot } from "./ColorDot";
import type { Activity, Project } from "../api/types";

export interface ProjectTaskSelection {
  project: Project;
  activity: Activity;
}

const GENERAL_ACTIVITY_NAME = "General";

interface ProjectTaskPickerProps {
  value: ProjectTaskSelection | null;
  onChange: (selection: ProjectTaskSelection) => void;
  onProjectsLoaded?: (projects: Project[]) => void;
  disabled?: boolean;
}

/** True tasks — hides the internal "General" fallback activity that stands
 *  in for "no task picked" (see Timer/TimeEntries onSelect below). */
function realActivities(activities: Activity[]): Activity[] {
  return activities.filter((a) => a.name !== GENERAL_ACTIVITY_NAME);
}

export function ProjectTaskPicker({ value, onChange, onProjectsLoaded, disabled }: ProjectTaskPickerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activitiesByProject, setActivitiesByProject] = useState<Record<string, Activity[]>>({});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<{ projectId: string; text: string } | null>(null);
  const [newProjectDraft, setNewProjectDraft] = useState<string | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.projects.list().then((list) => {
      setProjects(list);
      onProjectsLoaded?.(list);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedProjectId(null);
        setTaskDraft(null);
        setNewProjectDraft(null);
        setRenamingProjectId(null);
        setRenamingTaskId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function ensureActivitiesLoaded(projectId: string): Promise<Activity[]> {
    const cached = activitiesByProject[projectId];
    if (cached) return cached;
    const list = await api.activities.list(projectId);
    setActivitiesByProject((prev) => ({ ...prev, [projectId]: list }));
    return list;
  }

  async function ensureGeneralActivity(project: Project): Promise<Activity> {
    const list = await ensureActivitiesLoaded(project.id);
    const existing = list.find((a) => a.name === GENERAL_ACTIVITY_NAME);
    if (existing) return existing;
    const created = await api.activities.create(project.id, GENERAL_ACTIVITY_NAME);
    setActivitiesByProject((prev) => ({ ...prev, [project.id]: [...list, created] }));
    return created;
  }

  function closeAll() {
    setOpen(false);
    setExpandedProjectId(null);
    setTaskDraft(null);
    setNewProjectDraft(null);
    setSearch("");
    setRenamingProjectId(null);
    setRenamingTaskId(null);
  }

  async function selectProjectOnly(project: Project) {
    setBusy(true);
    try {
      const general = await ensureGeneralActivity(project);
      onChange({ project, activity: general });
      closeAll();
    } finally {
      setBusy(false);
    }
  }

  function selectProjectAndTask(project: Project, activity: Activity) {
    onChange({ project, activity });
    closeAll();
  }

  async function toggleExpand(project: Project) {
    if (expandedProjectId === project.id) {
      setExpandedProjectId(null);
      return;
    }
    await ensureActivitiesLoaded(project.id);
    setExpandedProjectId(project.id);
    setTaskDraft(null);
  }

  async function submitTaskDraft() {
    if (!taskDraft || !taskDraft.text.trim()) return;
    const project = projects.find((p) => p.id === taskDraft.projectId);
    if (!project) return;
    setBusy(true);
    try {
      const created = await api.activities.create(project.id, taskDraft.text.trim());
      setActivitiesByProject((prev) => ({
        ...prev,
        [project.id]: [...(prev[project.id] ?? []), created],
      }));
      selectProjectAndTask(project, created);
    } finally {
      setBusy(false);
    }
  }

  async function submitNewProject() {
    if (!newProjectDraft || !newProjectDraft.trim()) return;
    setBusy(true);
    try {
      const created = await api.projects.create(newProjectDraft.trim());
      setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      await selectProjectOnly(created);
    } finally {
      setBusy(false);
    }
  }

  function startRenameProject(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingProjectId(project.id);
    setRenamingTaskId(null);
    setRenameText(project.name);
  }

  async function submitRenameProject(project: Project) {
    const name = renameText.trim();
    setRenamingProjectId(null);
    if (!name || name === project.name) return;
    const updated = await api.projects.update(project.id, { name });
    setProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name)));
    if (value?.project.id === project.id) onChange({ ...value, project: updated });
  }

  function startRenameTask(activity: Activity, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingTaskId(activity.id);
    setRenamingProjectId(null);
    setRenameText(activity.name);
  }

  async function submitRenameTask(project: Project, activity: Activity) {
    const name = renameText.trim();
    setRenamingTaskId(null);
    if (!name || name === activity.name) return;
    const updated = await api.activities.update(activity.id, { name });
    setActivitiesByProject((prev) => ({
      ...prev,
      [project.id]: (prev[project.id] ?? []).map((a) => (a.id === activity.id ? updated : a)),
    }));
    if (value?.activity.id === activity.id) onChange({ ...value, activity: updated });
  }

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  const label = !value
    ? "+ Project"
    : value.activity.name === GENERAL_ACTIVITY_NAME
      ? value.project.name
      : `${value.project.name}: ${value.activity.name}`;

  return (
    <div className="project-task-picker" ref={rootRef}>
      <button
        type="button"
        className={"ptp-trigger" + (!value ? " empty" : "")}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {value && <ColorDot color={value.project.color} />}
        {label}
      </button>

      {open && (
        <div className="combobox-dropdown ptp-dropdown">
          <input
            type="text"
            className="ptp-search"
            placeholder="Search project or client"
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ptp-list">
            {filtered.map((project) => {
              const activities = realActivities(activitiesByProject[project.id] ?? []);
              const isExpanded = expandedProjectId === project.id;
              return (
                <div key={project.id} className="ptp-project-group">
                  <div className="ptp-project-row">
                    {renamingProjectId === project.id ? (
                      <input
                        type="text"
                        className="ptp-rename-input"
                        autoFocus
                        value={renameText}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitRenameProject(project)}
                        onBlur={() => submitRenameProject(project)}
                      />
                    ) : (
                      <span className="ptp-project-name" onClick={() => selectProjectOnly(project)}>
                        <ColorDot color={project.color} />
                        {project.name}
                        <button type="button" className="ptp-rename-btn" onClick={(e) => startRenameProject(project, e)} title="Rename project">
                          &#9998;
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      className="ptp-expand"
                      onClick={() => toggleExpand(project)}
                    >
                      {activities.length > 0 ? `${activities.length} task${activities.length > 1 ? "s" : ""}` : "Add task"}
                      <span className={"ptp-chevron" + (isExpanded ? " open" : "")}>▾</span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ptp-tasks">
                      {activities.map((activity) =>
                        renamingTaskId === activity.id ? (
                          <div key={activity.id} className="ptp-task-draft">
                            <input
                              type="text"
                              autoFocus
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && submitRenameTask(project, activity)}
                              onBlur={() => submitRenameTask(project, activity)}
                            />
                          </div>
                        ) : (
                          <div
                            key={activity.id}
                            className="combobox-option ptp-task-row"
                            onClick={() => selectProjectAndTask(project, activity)}
                          >
                            <span>{activity.name}</span>
                            <button type="button" className="ptp-rename-btn" onClick={(e) => startRenameTask(activity, e)} title="Rename task">
                              &#9998;
                            </button>
                          </div>
                        )
                      )}
                      {taskDraft?.projectId === project.id ? (
                        <div className="ptp-task-draft">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Task name..."
                            value={taskDraft.text}
                            onChange={(e) => setTaskDraft({ projectId: project.id, text: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && submitTaskDraft()}
                          />
                          <button type="button" disabled={busy} onClick={submitTaskDraft}>
                            Add
                          </button>
                        </div>
                      ) : (
                        <div
                          className="combobox-option combobox-create"
                          onClick={() => setTaskDraft({ projectId: project.id, text: "" })}
                        >
                          + Create new task
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="combobox-empty">No projects match</div>}
          </div>

          <div className="ptp-footer">
            {newProjectDraft !== null ? (
              <div className="ptp-task-draft">
                <input
                  type="text"
                  autoFocus
                  placeholder="Project name..."
                  value={newProjectDraft}
                  onChange={(e) => setNewProjectDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitNewProject()}
                />
                <button type="button" disabled={busy} onClick={submitNewProject}>
                  Add
                </button>
              </div>
            ) : (
              <div className="combobox-option combobox-create" onClick={() => setNewProjectDraft("")}>
                + Create new project
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
