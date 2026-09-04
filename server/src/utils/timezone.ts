/** Converts a wall-clock time in a given IANA timezone into the correct
 *  UTC Date, using only built-in Intl. Extracted from the Clockify
 *  importer (see its history) — that's where this technique was first
 *  needed to fix entries landing on the wrong day when the server's own
 *  system timezone doesn't match the user's. The goal engine below needs
 *  the exact same correctness: "today" and period boundaries (start of
 *  week/month/year) have to be computed in the user's actual local day,
 *  not the server's, or a goal's day count silently drifts by the
 *  server/user timezone offset. */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcGuess)).map((p) => [p.type, p.value]));
  const displayedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = utcGuess - displayedAsUtc;
  return new Date(utcGuess + offsetMs);
}

/** The current Y/M/D as seen in the given timezone — i.e. "today" from
 *  that timezone's point of view, regardless of what day it is on the
 *  server. Used to anchor every period boundary below. */
export function todayInZone(timeZone: string): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The reverse of zonedWallClockToUtc — given a real UTC instant, what
 *  wall-clock Y/M/D H:M:S does it show as in the given timezone. Needed
 *  for exporting entries back into a format (like Clockify's CSV) that
 *  expects local wall-clock times rather than UTC instants. */
export function formatInZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour === "24" ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}
