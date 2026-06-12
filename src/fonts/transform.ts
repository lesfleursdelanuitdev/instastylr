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

export type StyledRun = {
  text: string;
  fontId: string;
  bold: boolean;
  italic: boolean;
};

/** Substitute a single run of uniformly-styled text. */
export function transformRun(run: StyledRun): string {
  const map = resolveVariantMap(run.fontId, run.bold, run.italic);
  if (!map) return run.text; // identity variant: pass through untouched

  let out = "";
  for (const ch of run.text) {
    out += map.get(ch) ?? ch; // fallback: leave unmapped codepoints as-is
  }
  return out;
}

/** Substitute a sequence of runs and concatenate (the output-box projection). */
export function transformRuns(runs: StyledRun[]): string {
  let out = "";
  for (const run of runs) out += transformRun(run);
  return out;
}
