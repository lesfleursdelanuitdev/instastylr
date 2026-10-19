/**
 * Marks: a combining character added after every character of a run, on top of
 * whatever font it is in (a strike through, a line under, a ring around…).
 *
 * A mark is one Unicode combining code point. A run can stack a few; they are
 * added in the order chosen. Spaces get none (a mark on a space shows as a stray
 * dot or line between words).
 *
 * Chosen by hand: the marks the font sites build their "marked" styles from,
 * plus a few common ones. Most of Unicode's other combining marks look the same
 * as one of these, or don't render on phones.
 */
export type MarkGroup = "through" | "under" | "over" | "around";

export type Mark = {
  id: string;
  label: string;
  /** The combining code point. */
  char: string;
  group: MarkGroup;
};

export const MARK_GROUPS: { id: MarkGroup; label: string }[] = [
  { id: "through", label: "Through" },
  { id: "under", label: "Under" },
  { id: "over", label: "Over" },
  { id: "around", label: "Around" },
];

const m = (id: string, label: string, cp: number, group: MarkGroup): Mark => ({
  id,
  label,
  char: String.fromCodePoint(cp),
  group,
});

export const MARKS: Mark[] = [
  m("strike", "Strike", 0x0336, "through"),
  m("slash", "Slash", 0x0338, "through"),
  m("wavyStrike", "Wavy strike", 0x0334, "through"),
  m("backslash", "Backslash", 0x20e5, "through"),
  m("doubleSlash", "Double slash", 0x20eb, "through"),
  m("arrowThrough", "Arrow", 0x20ea, "through"),

  m("underline", "Underline", 0x0332, "under"),
  m("doubleUnderline", "Double underline", 0x0333, "under"),
  m("tildeBelow", "Tilde", 0x0330, "under"),
  m("seagull", "Seagull", 0x033c, "under"),
  m("arrowBelow", "Arrow", 0x0362, "under"),
  m("smileBelow", "Smile", 0x035c, "under"),
  m("dotsBelow", "Dots", 0x20e8, "under"),

  m("overline", "Overline", 0x0305, "over"),
  m("dotAbove", "Dot", 0x0307, "over"),
  m("diaeresis", "Two dots", 0x0308, "over"),
  m("ringAbove", "Ring", 0x030a, "over"),

  m("circle", "Circle", 0x20dd, "around"),
  m("square", "Square", 0x20de, "around"),
  m("diamond", "Diamond", 0x20df, "around"),
  m("triangle", "Triangle", 0x20e4, "around"),
];

/** More than this and text turns into unreadable "zalgo". */
export const MAX_MARKS = 3;

const MARK_BY_ID = new Map(MARKS.map((x) => [x.id, x]));
const MARK_BY_CHAR = new Map(MARKS.map((x) => [x.char, x]));

export function markById(id: string): Mark | undefined {
  return MARK_BY_ID.get(id);
}

export function markByChar(ch: string): Mark | undefined {
  return MARK_BY_CHAR.get(ch);
}

/** Known ids only, no repeats, at most MAX_MARKS, in the order given. */
export function cleanMarks(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of ids) if (MARK_BY_ID.has(id) && !out.includes(id) && out.length < MAX_MARKS) out.push(id);
  return out;
}

/** "Around" marks are drawn by the phone's own fonts and often come out misplaced. */
export function marksMayNotShow(ids: readonly string[]): boolean {
  return ids.some((id) => MARK_BY_ID.get(id)?.group === "around");
}

type SegmenterLike = { segment(input: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (l?: string, o?: { granularity: "grapheme" }) => SegmenterLike;
const SegImpl = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
const segmenter = typeof SegImpl === "function" ? new SegImpl(undefined, { granularity: "grapheme" }) : null;

/** The characters as a person sees them (an emoji or an accented letter is one). */
export function graphemes(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return [...text];
}
