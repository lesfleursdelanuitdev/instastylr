/**
 * The fonts the user applied most recently, newest first, kept on this device.
 * The toolbar menu shows the newest few that aren't in its short list; the font
 * panel can filter down to them.
 */
export const RECENT_FONTS_MAX = 10;
const KEY = "instastylr.recentFonts.v1";

export function loadRecentFonts(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_FONTS_MAX) : [];
  } catch {
    return [];
  }
}

/** Move `fontId` to the front (no duplicates, at most RECENT_FONTS_MAX) and return the new list. */
export function recordFontUse(fontId: string, current: string[] = loadRecentFonts()): string[] {
  const next = [fontId, ...current.filter((id) => id !== fontId)].slice(0, RECENT_FONTS_MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  return next;
}
