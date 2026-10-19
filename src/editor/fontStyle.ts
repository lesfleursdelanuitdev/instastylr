/**
 * Font is stored as a CSS custom property in each TextNode's `style` string.
 *
 * Why style instead of a bespoke node field: Lexical already propagates a
 * collapsed caret's pending `style` to the next typed characters and splits
 * nodes when the style changes — the exact "type the next words in this font"
 * behavior we want. Riding the style channel means pending-font, split-survival,
 * undo/redo and persistence all come from Lexical for free.
 *
 * The property is a no-op visually (custom property, no rendering effect); it's
 * purely a data carrier that the output projection reads.
 */
import { FONTS } from "../fonts/mappings";
import { cleanMarks } from "../fonts/marks";

export const FONT_STYLE_PROP = "--ist-font";

const KNOWN_FONT_IDS = new Set(FONTS.map((f) => f.id));

export function isKnownFont(id: string): boolean {
  return KNOWN_FONT_IDS.has(id);
}

/** Parse the active fontId out of a node's raw style string. */
export function fontIdFromStyle(style: string): string {
  const match = new RegExp(`(?:^|;)\\s*${FONT_STYLE_PROP}\\s*:\\s*([^;]+)`).exec(style || "");
  const value = match ? match[1].trim() : "serif";
  return isKnownFont(value) ? value : "serif";
}

/**
 * Marks ride the same channel: `--ist-marks: strike,underline` (mark ids in the
 * order they stack; see fonts/marks.ts). Absent = no marks.
 */
export const MARKS_STYLE_PROP = "--ist-marks";

/** Parse a node's marks out of its raw style string (unknown ids dropped). */
export function marksFromStyle(style: string): string[] {
  const match = new RegExp(`(?:^|;)\\s*${MARKS_STYLE_PROP}\\s*:\\s*([^;]+)`).exec(style || "");
  return match ? cleanMarks(match[1].split(",").map((s) => s.trim())) : [];
}

/** The style value for a set of marks, or null to remove the property. */
export function marksStyleValue(ids: readonly string[]): string | null {
  const clean = cleanMarks(ids);
  return clean.length ? clean.join(",") : null;
}

/** Parse a `--ist-marks` value ("strike,underline") into mark ids. */
export function parseMarks(value: string | null | undefined): string[] {
  return value ? cleanMarks(value.split(",").map((s) => s.trim())) : [];
}
