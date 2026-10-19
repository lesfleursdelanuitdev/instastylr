/**
 * The user's own styles: a font plus bold/italic and marks, saved under a name
 * on this device. They have the same shape as the built-in presets
 * (scraped/presets.ts), so picking one goes through the same code.
 *
 * Text that uses a style stores the font, bold/italic and marks themselves, so
 * renaming or deleting a style never changes text already written.
 */
import { FONTS } from "./mappings";
import { cleanMarks, markById } from "./marks";
import { fontLabel } from "./uiFonts";
import type { StylePreset } from "./scraped/presets";

export type MyStyle = StylePreset;
export type StyleParts = Pick<StylePreset, "font" | "bold" | "italic" | "marks">;
export type StyleResult = { ok: true; styles: MyStyle[]; style: MyStyle } | { ok: false; problem: string };

export const MY_STYLES_MAX = 30;
export const STYLE_NAME_MAX = 40;
const KEY = "instastylr.myStyles.v1";
const ID = /^my-[a-z0-9]+$/;
const KNOWN_FONTS = new Set(FONTS.map((f) => f.id));

// Fallback for when storage is blocked or full: styles still work for this visit.
let memory: MyStyle[] | null = null;

function clean(raw: unknown): MyStyle | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || !ID.test(s.id)) return null;
  if (typeof s.label !== "string" || !s.label.trim()) return null;
  if (typeof s.font !== "string" || !KNOWN_FONTS.has(s.font)) return null;
  const marks = Array.isArray(s.marks) ? cleanMarks(s.marks.filter((m): m is string => typeof m === "string")) : [];
  return {
    id: s.id,
    label: s.label.trim().slice(0, STYLE_NAME_MAX),
    font: s.font,
    bold: s.bold === true,
    italic: s.italic === true,
    marks,
  };
}

export function loadMyStyles(): MyStyle[] {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return [];
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .map(clean)
      .filter((s): s is MyStyle => s !== null)
      .slice(0, MY_STYLES_MAX);
  } catch {
    return [];
  }
}

function store(styles: MyStyle[]): MyStyle[] {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(styles));
    memory = null;
  } catch {
    memory = styles; // blocked or full: kept for this visit only
  }
  return styles;
}

/** For tests: forget the in-memory fallback. */
export function resetMyStylesMemory(): void {
  memory = null;
}

const sameLook = (s: StyleParts, p: StyleParts) =>
  s.font === p.font &&
  s.bold === p.bold &&
  s.italic === p.italic &&
  s.marks.length === p.marks.length &&
  s.marks.every((m, i) => m === p.marks[i]);

/** The saved style with exactly this look, if there is one. */
export function findMyStyle(styles: readonly MyStyle[], parts: StyleParts): MyStyle | undefined {
  return styles.find((s) => sameLook(s, parts));
}

/** Why a name can't be used (null = fine). `exceptId` is the style being renamed. */
export function styleNameProblem(name: string, styles: readonly MyStyle[], exceptId?: string): string | null {
  const n = name.trim();
  if (!n) return "Give your style a name.";
  if (n.length > STYLE_NAME_MAX) return `Keep the name to ${STYLE_NAME_MAX} characters or fewer.`;
  const key = n.toLocaleLowerCase();
  if (styles.some((s) => s.id !== exceptId && s.label.toLocaleLowerCase() === key))
    return "You already have a style with that name.";
  return null;
}

/** Why this look can't be saved as a new style (null = fine). */
export function saveProblem(parts: StyleParts, styles: readonly MyStyle[]): string | null {
  const same = findMyStyle(styles, parts);
  if (same) return `You already saved this look as “${same.label}”.`;
  if (!parts.bold && !parts.italic && parts.marks.length === 0)
    return `That’s just the ${fontLabel(parts.font)} font. Add bold, italic or marks to make it a style.`;
  if (styles.length >= MY_STYLES_MAX) return `You have ${MY_STYLES_MAX} styles. Delete one to save another.`;
  return null;
}

function newId(existing: readonly MyStyle[]): string {
  for (;;) {
    const id = `my-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    if (!existing.some((s) => s.id === id)) return id;
  }
}

export function addMyStyle(name: string, parts: StyleParts): StyleResult {
  const styles = loadMyStyles();
  const problem = saveProblem(parts, styles) ?? styleNameProblem(name, styles);
  if (problem) return { ok: false, problem };
  const style: MyStyle = {
    id: newId(styles),
    label: name.trim(),
    font: parts.font,
    bold: parts.bold,
    italic: parts.italic,
    marks: cleanMarks(parts.marks),
  };
  return { ok: true, styles: store([style, ...styles]), style };
}

export function renameMyStyle(id: string, name: string): StyleResult {
  const styles = loadMyStyles();
  const style = styles.find((s) => s.id === id);
  if (!style) return { ok: false, problem: "That style is gone." };
  const problem = styleNameProblem(name, styles, id);
  if (problem) return { ok: false, problem };
  const renamed = { ...style, label: name.trim() };
  return { ok: true, styles: store(styles.map((s) => (s.id === id ? renamed : s))), style: renamed };
}

export function removeMyStyle(id: string): MyStyle[] {
  return store(loadMyStyles().filter((s) => s.id !== id));
}

/** A name for the save box to start from, e.g. "Sans-Serif Bold + Strike". */
export function defaultStyleName(parts: StyleParts): string {
  const words = [fontLabel(parts.font)];
  if (parts.bold) words.push("Bold");
  if (parts.italic) words.push("Italic");
  const name = [words.join(" "), ...parts.marks.map((m) => markById(m)?.label ?? m)].join(" + ");
  return name.slice(0, STYLE_NAME_MAX);
}
