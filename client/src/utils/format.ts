function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "34:22" under an hour, "1:04:22" at/over an hour — matches Clockify's
 *  own timer/tab-title formatting instead of a fixed HH:MM:SS. */
export function formatElapsed(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** "2h 14m" style — used for report/summary totals where sub-minute
 *  precision doesn't matter. */
export function formatTotal(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
