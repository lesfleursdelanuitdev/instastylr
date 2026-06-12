/**
 * Instagram-style character counting.
 *
 * The whole point of the tool is emitting astral codepoints (Mathematical
 * Alphanumeric Symbols live above U+FFFF), so a single styled glyph is two
 * UTF-16 code units. Raw `.length` would therefore roughly double the count for
 * styled text and badly mislead the user. We count *grapheme clusters* — what a
 * human perceives as one character — which also folds emoji ZWJ sequences into 1.
 *
 * NOTE: Instagram's exact counting rule is not officially documented. Grapheme
 * counting is the principled default and matches "characters you see"; if live
 * testing later shows Instagram uses code points or UTF-16 units, swap the
 * implementation of `instagramCount` — call sites won't change.
 */
export const IG_CAPTION_LIMIT = 2200;

// Minimal local typing for Intl.Segmenter (not in our TS lib target), so the
// feature is usable without pulling in a newer lib or casting at each use.
type SegmenterLike = { segment(input: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locales?: string, options?: { granularity: "grapheme" }) => SegmenterLike;
const SegmenterImpl = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;

const segmenter: SegmenterLike | null =
  typeof SegmenterImpl === "function" ? new SegmenterImpl(undefined, { granularity: "grapheme" }) : null;

export function instagramCount(text: string): number {
  if (!text) return 0;
  if (segmenter) {
    let count = 0;
    for (const _ of segmenter.segment(text)) count++;
    return count;
  }
  // Fallback: code points (still astral-correct, just no grapheme clustering).
  return [...text].length;
}
