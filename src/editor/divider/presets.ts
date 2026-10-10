import { renderDividerConfig } from "./render";
import type { DividerCategory, DividerPreset, DividerRecipe, DividerWrapper } from "./types";

function preset(
  id: string,
  category: DividerCategory,
  recipe: DividerRecipe,
  wrapper?: DividerWrapper | null,
): DividerPreset {
  const line = renderDividerConfig({ recipe, wrapper: wrapper ?? null });
  return { id, category, line, recipe, wrapper: wrapper ?? null };
}

function raw(id: string, category: DividerCategory, text: string): DividerPreset {
  return { id, category, line: text, recipe: { kind: "raw", text } };
}

function repeat(
  id: string,
  category: DividerCategory,
  char: string,
  count: number,
  mode: "solid" | "spaced" | "grouped" = "solid",
  groupSize?: number,
): DividerPreset {
  return preset(id, category, { kind: "repeat", char, count, mode, groupSize });
}

function framedSingle(id: string, category: DividerCategory, center: string, flankLen = 4, flankChar = "─"): DividerPreset {
  return preset(id, category, {
    kind: "framed",
    flankChar,
    flankLen,
    center: { mode: "single", char: center },
    gap: "space",
  });
}

function framedRepeat(id: string, category: DividerCategory, center: string, count = 3, flankLen = 3): DividerPreset {
  return preset(id, category, {
    kind: "framed",
    flankChar: "─",
    flankLen,
    center: { mode: "repeat", char: center, count, gap: "space" },
    gap: "space",
  });
}

function framedSequence(id: string, category: DividerCategory, chars: string[], flankLen = 3): DividerPreset {
  return preset(id, category, {
    kind: "framed",
    flankChar: "─",
    flankLen,
    center: { mode: "sequence", chars, gap: "space" },
    gap: "space",
  });
}

function bookend(id: string, category: DividerCategory, cap: string, rightCap?: string, spanLen = 11): DividerPreset {
  return preset(id, category, {
    kind: "bookend",
    leftCap: cap,
    spanChar: "─",
    spanLen,
    rightCap: rightCap ?? cap,
    gap: "space",
  });
}

function motif(id: string, category: DividerCategory, text: string): DividerPreset {
  return preset(id, category, { kind: "motif", text });
}

function wrapped(id: string, category: DividerCategory, inner: DividerRecipe, left: string, right: string): DividerPreset {
  return preset(id, category, inner, { left, right });
}

function pattern(id: string, category: DividerCategory, tokens: string[], joiner: string, cycles: number): DividerPreset {
  return preset(id, category, { kind: "pattern", tokens, joiner, cycles });
}

/** Full preset library — 209 presets across 12 categories. */
export const DIVIDER_PRESETS: DividerPreset[] = [
  // 1. Simple (20)
  repeat("simple-dash-20", "simple", "-", 30),
  repeat("simple-dash-24", "simple", "-", 40),
  repeat("simple-dash-30", "simple", "-", 40),
  repeat("simple-underscore-20", "simple", "_", 22),
  repeat("simple-underscore-24", "simple", "_", 32),
  repeat("simple-equals-20", "simple", "=", 30),
  repeat("simple-equals-24", "simple", "=", 40),
  repeat("simple-star-20", "simple", "*", 30),
  repeat("simple-star-24", "simple", "*", 40),
  repeat("simple-tilde-20", "simple", "~", 29),
  repeat("simple-tilde-24", "simple", "~", 39),
  repeat("simple-dot-20", "simple", ".", 29),
  repeat("simple-dot-24", "simple", ".", 39),
  repeat("simple-colon-20", "simple", ":", 30),
  repeat("simple-semi-20", "simple", ";", 29),
  repeat("simple-comma-20", "simple", ",", 29),
  repeat("simple-minus-12", "simple", "-", 12),
  repeat("simple-eq-12", "simple", "=", 12),
  repeat("simple-hash-20", "simple", "#", 20),
  repeat("simple-plus-20", "simple", "+", 20),

  // 2. Spaced (18)
  repeat("spaced-dash", "spaced", "-", 13, "spaced"),
  raw("spaced-dash-wide", "spaced", "-  -  -  -  -  -  -  -  -  -"),
  repeat("spaced-underscore", "spaced", "_", 13, "spaced"),
  repeat("spaced-equals", "spaced", "=", 13, "spaced"),
  repeat("spaced-star", "spaced", "*", 13, "spaced"),
  repeat("spaced-tilde", "spaced", "~", 13, "spaced"),
  repeat("spaced-dot", "spaced", ".", 13, "spaced"),
  repeat("spaced-colon", "spaced", ":", 13, "spaced"),
  repeat("spaced-semi", "spaced", ";", 13, "spaced"),
  repeat("spaced-comma", "spaced", ",", 13, "spaced"),
  repeat("spaced-bullet", "spaced", "•", 12, "spaced"),
  repeat("spaced-middot", "spaced", "·", 12, "spaced"),
  repeat("spaced-dot-op", "spaced", "⋅", 12, "spaced"),
  repeat("spaced-ring", "spaced", "◦", 12, "spaced"),
  repeat("spaced-circle", "spaced", "○", 12, "spaced"),
  repeat("spaced-bullet-solid", "spaced", "●", 12, "spaced"),
  repeat("spaced-ring-op", "spaced", "∘", 12, "spaced"),
  repeat("spaced-ellipsis", "spaced", "⋯", 12, "spaced"),

  // 3. Grouped (12)
  repeat("group-dash-2", "grouped", "-", 8, "grouped", 2),
  repeat("group-dash-3", "grouped", "-", 5, "grouped", 3),
  repeat("group-underscore-2", "grouped", "_", 7, "grouped", 2),
  repeat("group-equals-2", "grouped", "=", 7, "grouped", 2),
  repeat("group-equals-3", "grouped", "=", 5, "grouped", 3),
  repeat("group-star-2", "grouped", "*", 7, "grouped", 2),
  repeat("group-star-3", "grouped", "*", 5, "grouped", 3),
  repeat("group-tilde-2", "grouped", "~", 7, "grouped", 2),
  repeat("group-tilde-3", "grouped", "~", 5, "grouped", 3),
  repeat("group-dot-2", "grouped", ".", 7, "grouped", 2),
  repeat("group-dot-3", "grouped", ".", 5, "grouped", 3),
  repeat("group-plus-2", "grouped", "+", 7, "grouped", 2),

  // 4. Unicode strokes (15)
  repeat("stroke-light-16", "unicode", "─", 16),
  repeat("stroke-light-24", "unicode", "─", 24),
  repeat("stroke-heavy-16", "unicode", "━", 16),
  repeat("stroke-heavy-24", "unicode", "━", 24),
  repeat("stroke-ellipsis-16", "unicode", "⋯", 16),
  repeat("stroke-dot-op-16", "unicode", "⋅", 16),
  repeat("stroke-middot-16", "unicode", "·", 16),
  repeat("stroke-bullet-16", "unicode", "•", 16),
  repeat("stroke-dash-16", "unicode", "╌", 16),
  repeat("stroke-dotted-16", "unicode", "┄", 16),
  repeat("stroke-dotted-16b", "unicode", "┈", 16),
  repeat("stroke-heavy-dash-16", "unicode", "┅", 16),
  repeat("stroke-double-16", "unicode", "┉", 16),
  repeat("stroke-double-line-16", "unicode", "╍", 16),
  repeat("stroke-light-12", "unicode", "─", 12),

  // 5. Center accent (24)
  framedSingle("frame-star-4", "accent", "✦"),
  framedSingle("frame-star-bright-4", "accent", "✧"),
  framedSingle("frame-sparkle-4", "accent", "✨"),
  framedSingle("frame-star-black-4", "accent", "★"),
  framedSingle("frame-star-white-4", "accent", "☆"),
  framedSingle("frame-star-op-4", "accent", "⋆"),
  framedSingle("frame-flower-4", "accent", "❀"),
  framedSingle("frame-flower-4b", "accent", "✿"),
  framedSingle("frame-flower-4c", "accent", "❁"),
  framedSingle("frame-flower-4d", "accent", "✾"),
  framedSingle("frame-flower-4e", "accent", "❃"),
  framedSingle("frame-snowflake-4", "accent", "❋"),
  framedSingle("frame-blossom-4", "accent", "❊"),
  framedSingle("frame-floral-4", "accent", "❈"),
  framedSingle("frame-diamond-4", "accent", "❖"),
  framedSingle("frame-diamond-4b", "accent", "◆"),
  framedSingle("frame-diamond-4c", "accent", "◇"),
  framedSingle("frame-diamond-4d", "accent", "◈"),
  framedSingle("frame-heart-4", "accent", "♡"),
  framedSingle("frame-heart-4b", "accent", "♥"),
  framedSingle("frame-heart-4c", "accent", "❥"),
  framedSingle("frame-heart-4d", "accent", "❦"),
  framedSingle("frame-moon-4", "accent", "☽"),
  framedSingle("frame-moon-4b", "accent", "☾"),

  // 6. Center repeat / triple (20)
  framedRepeat("frame-triple-star", "triple", "✦"),
  framedRepeat("frame-triple-star-b", "triple", "✧"),
  framedRepeat("frame-triple-star-c", "triple", "★"),
  framedRepeat("frame-triple-star-d", "triple", "☆"),
  framedRepeat("frame-triple-star-e", "triple", "⋆"),
  framedRepeat("frame-triple-flower", "triple", "❀"),
  framedRepeat("frame-triple-flower-b", "triple", "✿"),
  framedRepeat("frame-triple-flower-c", "triple", "❁"),
  framedRepeat("frame-triple-heart", "triple", "♡"),
  framedRepeat("frame-triple-heart-b", "triple", "♥"),
  framedRepeat("frame-triple-bullet", "triple", "•"),
  framedRepeat("frame-triple-dot", "triple", "·"),
  framedRepeat("frame-triple-dot-op", "triple", "⋅"),
  framedRepeat("frame-triple-sparkle", "triple", "✨"),
  framedRepeat("frame-triple-floral", "triple", "❦"),
  framedSequence("frame-seq-moon-sun", "triple", ["☽", "☼", "☾"]),
  framedSequence("frame-seq-star-flower", "triple", ["✦", "❀", "✦"]),
  framedSequence("frame-seq-star-heart", "triple", ["✧", "♡", "✧"]),
  framedSequence("frame-seq-star-flower-b", "triple", ["⋆", "❀", "⋆"]),
  framedSequence("frame-seq-diamond", "triple", ["◇", "◆", "◇"]),

  // 7. Bookends (16)
  bookend("bookend-star", "bookend", "✦"),
  bookend("bookend-star-b", "bookend", "✧"),
  bookend("bookend-star-c", "bookend", "★"),
  bookend("bookend-star-d", "bookend", "☆"),
  bookend("bookend-star-e", "bookend", "⋆"),
  bookend("bookend-flower", "bookend", "❀"),
  bookend("bookend-flower-b", "bookend", "✿"),
  bookend("bookend-flower-c", "bookend", "❁"),
  bookend("bookend-heart", "bookend", "♡"),
  bookend("bookend-heart-b", "bookend", "♥"),
  bookend("bookend-floral", "bookend", "❦"),
  bookend("bookend-diamond", "bookend", "❖"),
  bookend("bookend-diamond-b", "bookend", "◆"),
  bookend("bookend-diamond-c", "bookend", "◇"),
  bookend("bookend-moon", "bookend", "☽", "☾"),
  bookend("bookend-sun", "bookend", "☼"),

  // 8. Motif clusters (20)
  motif("motif-star-dots", "motif", "⋆⋅☆⋅⋆"),
  motif("motif-star-dots-b", "motif", "⋆⋅✦⋅⋆"),
  motif("motif-star-dots-c", "motif", "⋆⋅✧⋅⋆"),
  motif("motif-star-dots-d", "motif", "⋆⋅❀⋅⋆"),
  motif("motif-star-dots-e", "motif", "⋆⋅✿⋅⋆"),
  motif("motif-star-dots-f", "motif", "⋆⋅♡⋅⋆"),
  motif("motif-star-dots-g", "motif", "⋆⋅☽⋅⋆"),
  motif("motif-star-dots-h", "motif", "⋆⋅☼⋅⋆"),
  motif("motif-star-dots-i", "motif", "⋆⋅❦⋅⋆"),
  motif("motif-star-dots-j", "motif", "⋆⋅•⋅⋆"),
  motif("motif-flank-star", "motif", "✦⋅⋆⋅✦"),
  motif("motif-flank-star-b", "motif", "✧⋅⋆⋅✧"),
  motif("motif-flank-flower", "motif", "❀⋅⋆⋅❀"),
  motif("motif-flank-flower-b", "motif", "✿⋅⋆⋅✿"),
  motif("motif-flank-heart", "motif", "♡⋅⋆⋅♡"),
  motif("motif-flank-moon", "motif", "☽⋅⋆⋅☾"),
  motif("motif-flank-sun", "motif", "☼⋅⋆⋅☼"),
  motif("motif-flank-floral", "motif", "❦⋅⋆⋅❦"),
  motif("motif-flank-diamond", "motif", "◆⋅⋆⋅◆"),
  motif("motif-flank-diamond-b", "motif", "◇⋅⋆⋅◇"),

  // 9. Bracket & corner frames (16)
  wrapped("wrap-tibetan-line", "frames", { kind: "repeat", char: "─", count: 12, mode: "solid" }, "༺", "༻"),
  wrapped("wrap-tibetan-line-b", "frames", { kind: "repeat", char: "─", count: 12, mode: "solid" }, "༻", "༺"),
  wrapped(
    "wrap-tibetan-star",
    "frames",
    { kind: "framed", flankChar: "─", flankLen: 5, center: { mode: "single", char: "✦" }, gap: "space" },
    "༺ ",
    " ༻",
  ),
  wrapped(
    "wrap-tibetan-flower",
    "frames",
    { kind: "framed", flankChar: "─", flankLen: 5, center: { mode: "single", char: "❀" }, gap: "space" },
    "༺ ",
    " ༻",
  ),
  wrapped(
    "wrap-tibetan-heart",
    "frames",
    { kind: "framed", flankChar: "─", flankLen: 5, center: { mode: "single", char: "♡" }, gap: "space" },
    "༺ ",
    " ༻",
  ),
  wrapped(
    "wrap-tibetan-moon",
    "frames",
    { kind: "framed", flankChar: "─", flankLen: 5, center: { mode: "single", char: "☽" }, gap: "space" },
    "༺ ",
    " ༻",
  ),
  wrapped("wrap-corner-lower", "frames", { kind: "repeat", char: "─", count: 12, mode: "solid" }, "╰", "╯"),
  wrapped("wrap-corner-upper", "frames", { kind: "repeat", char: "─", count: 12, mode: "solid" }, "╭", "╮"),
  wrapped(
    "wrap-corner-star",
    "frames",
    { kind: "framed", flankChar: "─", flankLen: 4, center: { mode: "single", char: "✦" }, gap: "space" },
    "╰",
    "╯",
  ),
  wrapped(
    "wrap-corner-flower",
    "frames",
    { kind: "framed", flankChar: "─", flankLen: 4, center: { mode: "single", char: "❀" }, gap: "space" },
    "╭",
    "╮",
  ),
  wrapped("wrap-box-bottom", "frames", { kind: "repeat", char: "═", count: 12, mode: "solid" }, "╚", "╝"),
  wrapped("wrap-box-top", "frames", { kind: "repeat", char: "═", count: 12, mode: "solid" }, "╔", "╗"),
  wrapped(
    "wrap-box-star",
    "frames",
    { kind: "framed", flankChar: "═", flankLen: 4, center: { mode: "single", char: "✦" }, gap: "space" },
    "╚",
    "╝",
  ),
  wrapped(
    "wrap-box-flower",
    "frames",
    { kind: "framed", flankChar: "═", flankLen: 4, center: { mode: "single", char: "❀" }, gap: "space" },
    "╔",
    "╗",
  ),
  wrapped("wrap-plus-bar", "frames", { kind: "repeat", char: "-", count: 28, mode: "solid" }, "+", "+"),
  wrapped("wrap-plus-bar-short", "frames", { kind: "repeat", char: "-", count: 24, mode: "solid" }, "+", "+"),

  // 10. Chevrons & ASCII borders (12)
  wrapped("border-chevron", "borders", { kind: "repeat", char: "-", count: 28, mode: "solid" }, "<", ">"),
  wrapped("border-chevron-short", "borders", { kind: "repeat", char: "-", count: 24, mode: "solid" }, "<", ">"),
  wrapped(
    "border-chevron-star",
    "borders",
    { kind: "framed", flankChar: "-", flankLen: 10, center: { mode: "single", char: "✦" }, gap: "space" },
    "<",
    ">",
  ),
  wrapped(
    "border-chevron-flower",
    "borders",
    { kind: "framed", flankChar: "-", flankLen: 10, center: { mode: "single", char: "❀" }, gap: "space" },
    "<",
    ">",
  ),
  wrapped(
    "border-chevron-heart",
    "borders",
    { kind: "framed", flankChar: "-", flankLen: 10, center: { mode: "single", char: "♡" }, gap: "space" },
    "<",
    ">",
  ),
  wrapped("border-bracket", "borders", { kind: "repeat", char: "-", count: 28, mode: "solid" }, "[", "]"),
  wrapped("border-bracket-short", "borders", { kind: "repeat", char: "-", count: 24, mode: "solid" }, "[", "]"),
  wrapped(
    "border-bracket-star",
    "borders",
    { kind: "framed", flankChar: "-", flankLen: 10, center: { mode: "single", char: "✦" }, gap: "space" },
    "[",
    "]",
  ),
  wrapped(
    "border-bracket-flower",
    "borders",
    { kind: "framed", flankChar: "-", flankLen: 10, center: { mode: "single", char: "❀" }, gap: "space" },
    "[",
    "]",
  ),
  wrapped(
    "border-curly",
    "borders",
    { kind: "framed", flankChar: "-", flankLen: 10, center: { mode: "single", char: "♡" }, gap: "space" },
    "{",
    "}",
  ),
  pattern("border-plus-grid", "borders", ["+", "----"], "", 4),
  pattern("border-plus-star", "borders", ["+", "------------"], "", 2),

  // 11. Patterns (16)
  pattern("pat-x-spaced", "patterns", ["x"], " ", 10),
  pattern("pat-x-dash", "patterns", ["x"], "-", 10),
  pattern("pat-x-upper", "patterns", ["X"], " ", 10),
  pattern("pat-o-spaced", "patterns", ["o"], " ", 10),
  pattern("pat-o-dash", "patterns", ["o"], "-", 10),
  pattern("pat-o-upper", "patterns", ["O"], " ", 10),
  pattern("pat-plus-spaced", "patterns", ["+"], " ", 10),
  repeat("pat-plus-solid", "patterns", "+", 20),
  pattern("pat-hash-spaced", "patterns", ["#"], " ", 10),
  pattern("pat-hash-dash", "patterns", ["#"], "-", 10),
  pattern("pat-slash-spaced", "patterns", ["/"], " ", 10),
  repeat("pat-slash-solid", "patterns", "/", 20),
  pattern("pat-backslash", "patterns", ["\\"], " ", 10),
  pattern("pat-pipe-spaced", "patterns", ["|"], " ", 10),
  repeat("pat-pipe-solid", "patterns", "|", 20),
  pattern("pat-zigzag", "patterns", ["/", "\\"], "", 10),

  // 12. Aesthetic / kaomoji (20)
  raw("aesthetic-star-1", "aesthetic", "｡･:*:･ﾟ★,｡･:*:･ﾟ☆"),
  raw("aesthetic-star-2", "aesthetic", "｡･:*:･ﾟ✧｡･:*:･ﾟ✧"),
  raw("aesthetic-star-3", "aesthetic", "✧･ﾟ: *✧･ﾟ:*"),
  raw("aesthetic-star-4", "aesthetic", "*:･ﾟ✧*:･ﾟ✧"),
  raw("aesthetic-sparkle-1", "aesthetic", "⋆｡°✩⋆｡°✩"),
  raw("aesthetic-sparkle-2", "aesthetic", "⋆｡°✦⋆｡°✦"),
  raw("aesthetic-sparkle-3", "aesthetic", "⋆｡°❀⋆｡°❀"),
  raw("aesthetic-bow-star", "aesthetic", "˚₊‧꒰ა ☆ ໒꒱ ‧₊˚"),
  raw("aesthetic-bow-heart", "aesthetic", "˚₊‧꒰ა ♡ ໒꒱ ‧₊˚"),
  raw("aesthetic-bow-spark", "aesthetic", "˚₊‧꒰ა ✦ ໒꒱ ‧₊˚"),
  raw("aesthetic-tag-heart", "aesthetic", "₊˚⊹♡"),
  raw("aesthetic-tag-star", "aesthetic", "₊˚⊹✦"),
  raw("aesthetic-tag-flower", "aesthetic", "₊˚⊹❀"),
  raw("aesthetic-tag-spark", "aesthetic", "₊˚⊹⋆"),
  raw("aesthetic-dust", "aesthetic", "✧˖°. ✧˖°."),
  raw("aesthetic-chain", "aesthetic", "⋆ ˚｡⋆୨୧˚"),
  raw("aesthetic-floral-line", "aesthetic", "♡ ───── ♡"),
  raw("aesthetic-star-line", "aesthetic", "✦ ───── ✦"),
  raw("aesthetic-flower-line", "aesthetic", "❀ ───── ❀"),
  raw("aesthetic-bow-line", "aesthetic", "୨୧ ───── ୨୧"),
];

export const DIVIDER_WRAPPER_OPTIONS: { id: string; label: string; left: string; right: string }[] = [
  { id: "none", label: "None", left: "", right: "" },
  { id: "bracket-tibetan", label: "༺ ༻", left: "༺", right: "༻" },
  { id: "corner-lower", label: "╰ ╯", left: "╰", right: "╯" },
  { id: "corner-upper", label: "╭ ╮", left: "╭", right: "╮" },
  { id: "box-double-top", label: "╔ ╗", left: "╔", right: "╗" },
  { id: "box-double-bottom", label: "╚ ╝", left: "╚", right: "╝" },
  { id: "plus-bar", label: "+ … +", left: "+", right: "+" },
  { id: "chevron", label: "< >", left: "<", right: ">" },
  { id: "square-bracket", label: "[ ]", left: "[", right: "]" },
  { id: "curly", label: "{ }", left: "{", right: "}" },
];

export const LINE_CHAR_PALETTE = [
  "-", "_", "=", "*", "~", ".", ":", ";", ",", "─", "━", "⋯", "⋅", "·", "•", "◦", "○", "●", "∘", "╌", "┄", "┈",
];

export const ACCENT_CHAR_PALETTE = [
  "✦", "✧", "★", "☆", "⋆", "❀", "✿", "♡", "♥", "☽", "☾", "☼", "•", "·", "⋅", "◆", "◇", "❦", "✨",
];
