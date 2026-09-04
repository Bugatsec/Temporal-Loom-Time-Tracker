import { getDailyCaps } from "../models/dailyCaps.js";
import { getOverallGoal, listProjectGoals, type GoalPeriod } from "../models/goal.js";
import { getProject } from "../models/project.js";
import { breakdownByProject, totalForRange } from "./reportService.js";
import { todayInZone, zonedWallClockToUtc } from "../utils/timezone.js";

const DAY_MS = 86400000;

/** Pure calendar arithmetic (never treated as a real instant) — just a
 *  convenient way to add days / read the weekday of a Y-M-D triple. */
function calcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}
function ymd(d: Date): { year: number; month: number; day: number } {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

interface PeriodRange {
  fromUtc: Date;
  toUtc: Date; // exclusive
  todayStartUtc: Date;
  daysTotal: number;
  daysLeft: number; // includes today, minimum 1
}

/** Computes a period's [start, end) boundary and "today"/"days left" —
 *  all anchored to the *caller's* timezone (via zonedWallClockToUtc), not
 *  the server's. Getting this wrong is exactly the class of bug the
 *  Clockify importer had before it took a timeZone param: a server
 *  defaulting to UTC would silently compute "today" and month boundaries
 *  a half-day-plus off from what the user actually sees on their clock. */
function periodRange(period: GoalPeriod, timeZone: string): PeriodRange {
  const today = todayInZone(timeZone);
  const todayStartUtc = zonedWallClockToUtc(today.year, today.month, today.day, 0, 0, 0, timeZone);

  let start: { year: number; month: number; day: number };
  let end: { year: number; month: number; day: number };

  if (period === "daily") {
    start = today;
    end = ymd(calcDate(today.year, today.month, today.day + 1));
  } else if (period === "weekly") {
    const todayCal = calcDate(today.year, today.month, today.day);
    const dow = todayCal.getUTCDay(); // 0=Sun..6=Sat
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = ymd(calcDate(today.year, today.month, today.day + diffToMonday));
    start = monday;
    end = ymd(calcDate(monday.year, monday.month, monday.day + 7));
  } else if (period === "monthly") {
    start = { year: today.year, month: today.month, day: 1 };
    end = ymd(calcDate(today.year, today.month + 1, 1));
  } else {
    start = { year: today.year, month: 1, day: 1 };
    end = { year: today.year + 1, month: 1, day: 1 };
  }

  const fromUtc = zonedWallClockToUtc(start.year, start.month, start.day, 0, 0, 0, timeZone);
  const toUtc = zonedWallClockToUtc(end.year, end.month, end.day, 0, 0, 0, timeZone);
  const daysTotal = Math.max(1, Math.round((toUtc.getTime() - fromUtc.getTime()) / DAY_MS));
  const daysLeft = Math.max(1, Math.round((toUtc.getTime() - todayStartUtc.getTime()) / DAY_MS));

  return { fromUtc, toUtc, todayStartUtc, daysTotal, daysLeft };
}

export interface DailyCapStatus {
  period: "daily";
  logged_seconds: number;
  minimum_seconds: number | null;
  max_seconds: number | null;
  extreme_seconds: number | null;
  met_minimum: boolean;
  over_max: boolean;
  over_extreme: boolean;
}

function computeDailyStatus(timeZone: string): DailyCapStatus {
  const range = periodRange("daily", timeZone);
  const { total_seconds } = totalForRange(range.fromUtc.toISOString(), range.toUtc.toISOString());
  const caps = getDailyCaps();
  const minimum = caps?.minimum_seconds ?? null;
  const max = caps?.max_seconds ?? null;
  const extreme = caps?.extreme_seconds ?? null;

  return {
    period: "daily",
    logged_seconds: total_seconds,
    minimum_seconds: minimum,
    max_seconds: max,
    extreme_seconds: extreme,
    met_minimum: minimum == null ? true : total_seconds >= minimum,
    over_max: max == null ? false : total_seconds > max,
    over_extreme: extreme == null ? false : total_seconds > extreme,
  };
}

export interface FloorProjectStatus {
  project_id: string;
  project_name: string;
  target_seconds: number;
  logged_seconds: number;
  remaining_seconds: number;
  met: boolean;
}

export interface FloorStatus {
  period: "weekly" | "yearly";
  has_goal: boolean;
  target_seconds: number | null;
  logged_seconds: number;
  remaining_seconds: number;
  met: boolean;
  projects: FloorProjectStatus[];
}

function loggedForProject(from: string, to: string, projectId: string): number {
  const row = breakdownByProject(from, to).find((r) => r.project_id === projectId);
  return row?.total_seconds ?? 0;
}

/** Weekly and yearly are plain "at least X" floors — no derived daily
 *  target, no feasibility math. Just what's logged so far against the
 *  target, the same way the original single daily goal always worked. */
function computeFloorStatus(period: "weekly" | "yearly", timeZone: string): FloorStatus {
  const range = periodRange(period, timeZone);
  const fromIso = range.fromUtc.toISOString();
  const toIso = range.toUtc.toISOString();

  const overall = getOverallGoal(period);
  const { total_seconds } = totalForRange(fromIso, toIso);
  const target = overall?.target_seconds ?? null;
  const remaining = target != null ? Math.max(0, target - total_seconds) : 0;

  const projectGoals = listProjectGoals(period);
  const projects: FloorProjectStatus[] = projectGoals.map((g) => {
    const logged = loggedForProject(fromIso, toIso, g.project_id!);
    return {
      project_id: g.project_id!,
      project_name: getProject(g.project_id!)?.name ?? g.project_id!,
      target_seconds: g.target_seconds,
      logged_seconds: logged,
      remaining_seconds: Math.max(0, g.target_seconds - logged),
      met: logged >= g.target_seconds,
    };
  });

  return {
    period,
    has_goal: overall != null,
    target_seconds: target,
    logged_seconds: total_seconds,
    remaining_seconds: remaining,
    met: target != null && total_seconds >= target,
    projects,
  };
}

export type MonthlyFeasibility = "comfortable" | "tight" | "impossible" | "no_goal" | "no_cap";

export interface MonthlyProjectStatus {
  project_id: string;
  project_name: string;
  target_seconds: number;
  logged_seconds: number;
  remaining_seconds: number;
  satisfied: boolean;
}

export interface MonthlyStatus {
  period: "monthly";
  has_goal: boolean;
  target_seconds: number | null;
  logged_seconds: number;
  remaining_seconds: number;
  days_total: number;
  days_left: number;
  derived_daily_target_seconds: number;
  feasibility: MonthlyFeasibility;
  shortfall_seconds: number;
  affordable_rest_days: number;
  projects: MonthlyProjectStatus[];
}

/** The full engine: remaining/days-left derived daily target, three-tier
 *  feasibility against the standing daily max/extreme caps, and the live
 *  "how many rest days can I still afford" projection. Recomputed fresh
 *  on every call from actual logged time — that's what makes "miss a day"
 *  need no special handling: the shortfall is just still there tomorrow,
 *  spread over one fewer day automatically. */
function computeMonthlyStatus(timeZone: string): MonthlyStatus {
  const range = periodRange("monthly", timeZone);
  const fromIso = range.fromUtc.toISOString();
  const toIso = range.toUtc.toISOString();

  const overall = getOverallGoal("monthly");
  const { total_seconds } = totalForRange(fromIso, toIso);
  const target = overall?.target_seconds ?? null;
  const remaining = target != null ? Math.max(0, target - total_seconds) : 0;

  const projectGoals = listProjectGoals("monthly");
  const projects: MonthlyProjectStatus[] = projectGoals.map((g) => {
    const logged = loggedForProject(fromIso, toIso, g.project_id!);
    return {
      project_id: g.project_id!,
      project_name: getProject(g.project_id!)?.name ?? g.project_id!,
      target_seconds: g.target_seconds,
      logged_seconds: logged,
      remaining_seconds: Math.max(0, g.target_seconds - logged),
      satisfied: logged >= g.target_seconds,
    };
  });

  if (target == null) {
    return {
      period: "monthly",
      has_goal: false,
      target_seconds: null,
      logged_seconds: total_seconds,
      remaining_seconds: 0,
      days_total: range.daysTotal,
      days_left: range.daysLeft,
      derived_daily_target_seconds: 0,
      feasibility: "no_goal",
      shortfall_seconds: 0,
      affordable_rest_days: 0,
      projects,
    };
  }

  const caps = getDailyCaps();
  const max = caps?.max_seconds ?? null;
  const extreme = caps?.extreme_seconds ?? null;

  let feasibility: MonthlyFeasibility;
  let derivedDaily: number;
  let shortfall = 0;

  if (remaining <= 0) {
    feasibility = "comfortable";
    derivedDaily = 0;
  } else if (max == null) {
    // No cap configured — nothing to be infeasible against.
    feasibility = "no_cap";
    derivedDaily = remaining / range.daysLeft;
  } else if (remaining <= range.daysLeft * max) {
    feasibility = "comfortable";
    derivedDaily = remaining / range.daysLeft;
  } else if (extreme != null && remaining <= range.daysLeft * extreme) {
    feasibility = "tight";
    derivedDaily = remaining / range.daysLeft;
  } else {
    feasibility = "impossible";
    const bestPerDay = extreme ?? max;
    derivedDaily = bestPerDay;
    shortfall = remaining - range.daysLeft * bestPerDay;
  }

  // Largest number of full rest days still affordable while keeping every
  // working day at or under the normal max — i.e. remaining <=
  // (daysLeft - restDays) * max, solved for the largest restDays.
  let affordableRestDays = 0;
  if (remaining <= 0) {
    affordableRestDays = range.daysLeft;
  } else if (max != null && max > 0) {
    const workDaysNeeded = Math.ceil(remaining / max);
    affordableRestDays = Math.max(0, range.daysLeft - workDaysNeeded);
  }

  return {
    period: "monthly",
    has_goal: true,
    target_seconds: target,
    logged_seconds: total_seconds,
    remaining_seconds: remaining,
    days_total: range.daysTotal,
    days_left: range.daysLeft,
    derived_daily_target_seconds: Math.round(derivedDaily),
    feasibility,
    shortfall_seconds: Math.round(shortfall),
    affordable_rest_days: affordableRestDays,
    projects,
  };
}

export interface GoalStatusBundle {
  daily: DailyCapStatus;
  weekly: FloorStatus;
  monthly: MonthlyStatus;
  yearly: FloorStatus;
}

export function computeGoalStatus(timeZone: string): GoalStatusBundle {
  return {
    daily: computeDailyStatus(timeZone),
    weekly: computeFloorStatus("weekly", timeZone),
    monthly: computeMonthlyStatus(timeZone),
    yearly: computeFloorStatus("yearly", timeZone),
  };
}
