/**
 * Transform engine.
 *
 * The one operation the whole tool reduces to: take a run of text with an active
 * (font, bold, italic) state and emit the substituted Unicode string.
 *
 * Pure and UI-agnostic. Iterates by code point (for..of), never by UTF-16 unit,
 * because the substituted characters are astral (surrogate pairs) — `charAt` and
 * index math would corrupt them. Characters with no mapping in the target block
 * (punctuation, accents, non-Latin) fall through unchanged, per the spec.
 */
import { resolveVariantMap } from "./mappings";
import { graphemes, markById } from "./marks";

export type StyledRun = {
  text: string;
  fontId: string;
  bold: boolean;
  italic: boolean;
  /** Mark ids (marks.ts), added after every character but spaces, in this order. */
  marks?: readonly string[];
};

/** Substitute a single run of uniformly-styled text. */
export function transformRun(run: StyledRun): string {
  const map = resolveVariantMap(run.fontId, run.bold, run.italic);
  const sub = (s: string) => {
    if (!map) return s; // identity variant: pass through untouched
    let out = "";
    for (const ch of s) out += map.get(ch) ?? ch; // fallback: leave unmapped codepoints as-is
    return out;
  };
  const marks = (run.marks ?? []).map((id) => markById(id)?.char ?? "").join("");
  if (!marks) return sub(run.text);

  // Marks go on each character as seen (so an emoji or an accented letter gets one
  // set, not one per code point), after its substitute; whitespace gets none.
  let out = "";
  for (const g of graphemes(run.text)) out += /^\s+$/u.test(g) ? g : sub(g) + marks;
  return out;
}

/** Substitute a sequence of runs and concatenate (the output-box projection). */
export function transformRuns(runs: StyledRun[]): string {
  let out = "";
  for (const run of runs) out += transformRun(run);
  return out;
}
