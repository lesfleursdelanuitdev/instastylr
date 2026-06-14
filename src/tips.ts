/**
 * Suppressible advisory tips.
 *
 * Two kinds of toast exist (see App.tsx): *confirmations* of explicit user
 * actions (always shown) and *advisories* that explain a behavior the user
 * didn't directly ask for — e.g. a bold/italic bit dropped when switching to a
 * font that can't render it. Advisories can be silenced per class via the
 * toast's "Don't show again" action, and re-enabled from the Settings panel.
 *
 * Suppression is per class, not per message: silencing `format-stripped` once
 * quiets every strip notice, whatever font/style triggered it. Persisted as a
 * set of dismissed class ids in localStorage.
 */

/** Every advisory class the app can raise. The Settings panel iterates this. */
export const TIP_CLASSES = [
  {
    id: "format-stripped",
    label: "Style removed on font change",
    blurb: "When a font can't show bold or italic, that styling is removed.",
  },
] as const;

export type TipClassId = (typeof TIP_CLASSES)[number]["id"];

const LS_KEY = "instastylr.tips.dismissed.v1";

export function loadDismissed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function store(set: Set<string>): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  } catch {
    // best-effort: quota / private mode
  }
}

export function isDismissed(id: TipClassId): boolean {
  return loadDismissed().has(id);
}

/** Silence an advisory class (the toast's "Don't show again"). */
export function dismissTip(id: TipClassId): void {
  const set = loadDismissed();
  set.add(id);
  store(set);
}

/** Bring a silenced class back (Settings panel). */
export function reenableTip(id: TipClassId): void {
  const set = loadDismissed();
  set.delete(id);
  store(set);
}

/** Clear every dismissal at once ("Reset all tips"). */
export function resetTips(): void {
  store(new Set());
}
