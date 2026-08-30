// Which Stage 3 analytics features are turned on — lets someone run a
// stripped-down tracker (just totals) or the full analytics suite.
// UI preference, not tracked data, so this lives in localStorage like
// sidebarPrefs.ts rather than the backend.
const KEY = "temporal-loom:feature-prefs";
const CHANGE_EVENT = "temporal-loom:feature-prefs-changed";

export interface FeaturePrefs {
  charts: boolean; // Dashboard's stacked bar + donut
  rollups: boolean; // hierarchical (parent + descendants) activity totals
  drillDown: boolean; // click a report row to see its underlying entries
  savedViews: boolean; // save/recall a named range+filter combo
  exportCsv: boolean;
  exportHtml: boolean;
  exportPdf: boolean;
}

// All on by default — Stage 3 is complete out of the box; toggles are for
// opting OUT of what you don't want, not opting in to what's missing.
const DEFAULTS: FeaturePrefs = {
  charts: true,
  rollups: true,
  drillDown: true,
  savedViews: true,
  exportCsv: true,
  exportHtml: true,
  exportPdf: true,
};

export function getFeaturePrefs(): FeaturePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function setFeaturePrefs(prefs: FeaturePrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onFeaturePrefsChanged(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
