type SegmenterLike = { segment(input: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (l?: string, o?: { granularity: "grapheme" }) => SegmenterLike;
const SegImpl = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
const segmenter = typeof SegImpl === "function" ? new SegImpl(undefined, { granularity: "grapheme" }) : null;

export function firstGrapheme(s: string): string {
  if (!s) return "";
  if (segmenter) {
    for (const seg of segmenter.segment(s)) return seg.segment;
    return "";
  }
  return [...s][0] ?? "";
}
