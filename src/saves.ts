/**
 * Named saved posts, persisted in localStorage.
 *
 * Each entry stores the *serialized Lexical editor state* (lossless, round-trips
 * exactly) — never the output string, which isn't reversible. The one special
 * case is the seeded photo-caption template, stored as a marker (`kind:
 * "template"`) and rebuilt from real nodes on load (see template.ts), so it
 * never goes stale against the schema.
 */
export type SavedPost = {
  id: string;
  name: string;
  /** Serialized Lexical EditorState JSON. Empty for template entries. */
  state: string;
  /** "post" = user save; "template" = rebuilt from code on load. */
  kind: "post" | "template";
  createdAt: string;
};

const LS_KEY = "instastylr.saves.v1";
const SEEDED_KEY = "instastylr.saves.seeded.v1";
export const TEMPLATE_ID = "default-photo-template";

export function loadSaves(): SavedPost[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SavedPost[]) : [];
  } catch {
    return [];
  }
}

export function storeSaves(arr: SavedPost[]): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    // best-effort: quota / private mode
  }
}

export function addSave(name: string, state: string): SavedPost {
  const entry: SavedPost = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
    name,
    state,
    kind: "post",
    createdAt: new Date().toISOString(),
  };
  const saves = loadSaves();
  saves.push(entry);
  storeSaves(saves);
  return entry;
}

/**
 * Overwrite an existing post's state in place (the "Update" transition: the
 * editor is bound to this id and the user committed changes back to it). Name,
 * kind and createdAt are preserved; returns false if the id is gone.
 */
export function updateSave(id: string, state: string): boolean {
  const saves = loadSaves();
  const entry = saves.find((s) => s.id === id);
  if (!entry) return false;
  entry.state = state;
  entry.kind = "post"; // a once-template entry becomes a real saved post once edited & updated
  storeSaves(saves);
  return true;
}

export function deleteSave(id: string): void {
  storeSaves(loadSaves().filter((s) => s.id !== id));
}

export function getSave(id: string): SavedPost | undefined {
  return loadSaves().find((s) => s.id === id);
}

/**
 * Defense-in-depth: confirm a stored string really is a serialized Lexical
 * EditorState before handing it to `parseEditorState`/`setEditorState`. Lexical
 * already only instantiates registered node types (so this isn't what keeps us
 * XSS-safe — see the no-HTML-transport invariant), but a well-formed-root check
 * means a corrupt or foreign localStorage value fails fast and cleanly instead
 * of throwing deep inside Lexical. A valid state is `{ root: { children: [] } }`.
 */
export function isValidEditorStateJson(state: string): boolean {
  try {
    const parsed = JSON.parse(state) as { root?: { children?: unknown } };
    return (
      !!parsed &&
      typeof parsed === "object" &&
      !!parsed.root &&
      typeof parsed.root === "object" &&
      Array.isArray(parsed.root.children)
    );
  } catch {
    return false;
  }
}

/** Seed the default photo-caption template once (idempotent across sessions). */
export function seedTemplateOnce(): void {
  try {
    if (window.localStorage.getItem(SEEDED_KEY)) return;
  } catch {
    return;
  }
  const existing = loadSaves().filter((s) => s.id !== TEMPLATE_ID);
  existing.unshift({
    id: TEMPLATE_ID,
    name: "📸 Photo Caption Template",
    state: "",
    kind: "template",
    createdAt: new Date(0).toISOString(),
  });
  storeSaves(existing);
  try {
    window.localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    // ignore
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}
