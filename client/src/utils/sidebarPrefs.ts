// UI-only preference (which optional nav items are visible) — this isn't
// tracked data, so localStorage is the right home for it, not the backend.
const KEY = "temporal-loom:sidebar-prefs";
const CHANGE_EVENT = "temporal-loom:sidebar-prefs-changed";

export interface SidebarPrefs {
  showTeam: boolean;
  showClients: boolean;
}

const DEFAULTS: SidebarPrefs = {
  // Off by default — this is a self-hosted single-user tool, so
  // multi-user "Team" has nothing behind it, and "Clients" is a light
  // extra most solo users won't need turned on immediately.
  showTeam: false,
  showClients: false,
};

export function getSidebarPrefs(): SidebarPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function setSidebarPrefs(prefs: SidebarPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onSidebarPrefsChanged(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
