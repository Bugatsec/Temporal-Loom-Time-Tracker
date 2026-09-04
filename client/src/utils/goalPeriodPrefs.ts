// Which goal-period tabs (Daily/Weekly/Monthly/Yearly) show in the Time
// Tracker's goal card toggle row. Display preference, not tracked data,
// so it lives in localStorage like sidebarPrefs.ts and featurePrefs.ts.
const KEY = "temporal-loom:goal-period-prefs";
const CHANGE_EVENT = "temporal-loom:goal-period-prefs-changed";

export interface GoalPeriodPrefs {
  showDaily: boolean;
  showWeekly: boolean;
  showMonthly: boolean;
  showYearly: boolean;
}

const DEFAULTS: GoalPeriodPrefs = {
  showDaily: true,
  showWeekly: true,
  showMonthly: true,
  showYearly: true,
};

export function getGoalPeriodPrefs(): GoalPeriodPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function setGoalPeriodPrefs(prefs: GoalPeriodPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onGoalPeriodPrefsChanged(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
