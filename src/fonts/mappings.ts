/**
 * Font data layer.
 *
 * Core mental model: a "font" is just a per-character substitution from ASCII
 * onto Unicode look-alike codepoints. Nothing here knows about the editor or the
 * UI — it is pure data plus a tiny builder. Adding a font means adding data, not
 * touching logic. See transform.ts for how this gets applied to a run of text.
 *
 * The landmine: the Mathematical Alphanumeric Symbols block is *almost* a fixed
 * offset from ASCII, but Unicode left holes where certain letters were already
 * encoded elsewhere (Letterlike Symbols). Those are listed per-variant in
 * `exceptions` and MUST override the offset, or real words render as tofu.
 */

import { LINGOJAM_FONTS } from "./scraped/lingojam";

/** A built variant is a per-character lookup, or null meaning "pass through". */
export type VariantMap = Map<string, string> | null;

type MathDesc = {
  kind: "math";
  /** codepoint for 'A'; omit if this variant has no letters */
  upper?: number;
  /** codepoint for 'a' */
  lower?: number;
  /** codepoint for '0'; omit if digits should pass through unchanged */
  digit?: number;
  /** holes: ASCII char -> codepoint, overriding the offset arithmetic */
  exceptions?: Record<string, number>;
};
/** Fixed additive offset over a contiguous ASCII range (e.g. fullwidth forms). */
type OffsetDesc = { kind: "offset"; offset: number; from: number; to: number };
/** Enclosed Alphanumerics: letters + 1-9 + a special zero. */
type CircledDesc = { kind: "circled" };
/** No substitution at all (plain ASCII). */
type IdentityDesc = { kind: "identity" };

/** An explicit lookup table (scraped fonts: no arithmetic, values may be several code points). */
type TableDesc = { kind: "table"; map: Record<string, string> };

type VariantDesc = MathDesc | OffsetDesc | CircledDesc | IdentityDesc | TableDesc;

// ---------------------------------------------------------------------------
// Variant descriptors (the raw data). Keyed by an internal variant name that
// fonts below reference. Base codepoints verified against the Unicode charts.
// ---------------------------------------------------------------------------

const scrapedVariant = (id: string) => `scraped:${id}`;

const VARIANT_DESCRIPTORS: Record<string, VariantDesc> = {
  identity: { kind: "identity" },

  // Serif math styles
  bold: { kind: "math", upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
  italic: { kind: "math", upper: 0x1d434, lower: 0x1d44e, exceptions: { h: 0x210e } },
  boldItalic: { kind: "math", upper: 0x1d468, lower: 0x1d482 },

  // Script / calligraphy (many holes)
  script: {
    kind: "math",
    upper: 0x1d49c,
    lower: 0x1d4b6,
    exceptions: {
      B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110,
      L: 0x2112, M: 0x2133, R: 0x211b,
      e: 0x212f, g: 0x210a, o: 0x2134,
    },
  },
  boldScript: { kind: "math", upper: 0x1d4d0, lower: 0x1d4ea },

  // Fraktur (holes)
  fraktur: {
    kind: "math",
    upper: 0x1d504,
    lower: 0x1d51e,
    exceptions: { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 },
  },
  boldFraktur: { kind: "math", upper: 0x1d56c, lower: 0x1d586 },

  // Double-struck / blackboard bold (holes; has digits)
  double: {
    kind: "math",
    upper: 0x1d538,
    lower: 0x1d552,
    digit: 0x1d7d8,
    exceptions: {
      C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119,
      Q: 0x211a, R: 0x211d, Z: 0x2124,
    },
  },

  // Monospace (has digits)
  mono: { kind: "math", upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },

  // Sans-serif family
  sans: { kind: "math", upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 },
  sansBold: { kind: "math", upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  sansItalic: { kind: "math", upper: 0x1d608, lower: 0x1d622 },
  sansBoldItalic: { kind: "math", upper: 0x1d63c, lower: 0x1d656 },

  // Non-math blocks
  fullwidth: { kind: "offset", offset: 0xfee0, from: 0x21, to: 0x7e },
  circled: { kind: "circled" },

  // Scraped lookup tables (src/fonts/scraped/), prefixed so a scraped name can
  // never shadow a variant above.
  ...Object.fromEntries(
    LINGOJAM_FONTS.map((f): [string, VariantDesc] => [scrapedVariant(f.id), { kind: "table", map: f.map }]),
  ),
};

// ---------------------------------------------------------------------------
// Builder: descriptor -> concrete lookup map (built once, memoized).
// ---------------------------------------------------------------------------

function buildVariant(desc: VariantDesc): VariantMap {
  if (desc.kind === "identity") return null;
  if (desc.kind === "table") return new Map(Object.entries(desc.map));

  const map = new Map<string, string>();
  const put = (ch: string, cp: number) => map.set(ch, String.fromCodePoint(cp));

  if (desc.kind === "math") {
    for (let i = 0; i < 26; i++) {
      if (desc.upper !== undefined) put(String.fromCharCode(0x41 + i), desc.upper + i);
      if (desc.lower !== undefined) put(String.fromCharCode(0x61 + i), desc.lower + i);
    }
    if (desc.digit !== undefined) {
      for (let d = 0; d < 10; d++) put(String(d), desc.digit + d);
    }
    // Holes override the offset-derived values.
    if (desc.exceptions) {
      for (const [ch, cp] of Object.entries(desc.exceptions)) put(ch, cp);
    }
  } else if (desc.kind === "offset") {
    for (let cp = desc.from; cp <= desc.to; cp++) {
      put(String.fromCharCode(cp), cp + desc.offset);
    }
  } else if (desc.kind === "circled") {
    for (let i = 0; i < 26; i++) {
      put(String.fromCharCode(0x41 + i), 0x24b6 + i); // Ⓐ..Ⓩ
      put(String.fromCharCode(0x61 + i), 0x24d0 + i); // ⓐ..ⓩ
    }
    for (let d = 1; d <= 9; d++) put(String(d), 0x2460 + (d - 1)); // ①..⑨
    put("0", 0x24ea); // ⓪
  }

  return map;
}

const VARIANT_CACHE = new Map<string, VariantMap>();
function getVariant(name: string): VariantMap {
  if (!VARIANT_CACHE.has(name)) {
    const desc = VARIANT_DESCRIPTORS[name];
    if (!desc) throw new Error(`Unknown variant: ${name}`);
    VARIANT_CACHE.set(name, buildVariant(desc));
  }
  return VARIANT_CACHE.get(name)!;
}

// ---------------------------------------------------------------------------
// Fonts (the public set). Treat as data: adding a font = adding an entry.
// `variants` references variant-descriptor names. A missing modifier falls back.
// ---------------------------------------------------------------------------

export type FontDef = {
  id: string;
  label: string;
  variants: {
    regular: string;
    bold?: string;
    italic?: string;
    boldItalic?: string;
  };
};

/** The hand-built fonts: Unicode's own styled alphabets. */
export const BASE_FONTS: FontDef[] = [
  {
    id: "serif",
    label: "Default",
    variants: { regular: "identity", bold: "bold", italic: "italic", boldItalic: "boldItalic" },
  },
  {
    id: "sans",
    label: "Sans-serif",
    variants: { regular: "sans", bold: "sansBold", italic: "sansItalic", boldItalic: "sansBoldItalic" },
  },
  { id: "script", label: "Script", variants: { regular: "script", bold: "boldScript" } },
  { id: "fraktur", label: "Fraktur", variants: { regular: "fraktur", bold: "boldFraktur" } },
  { id: "mono", label: "Monospace", variants: { regular: "mono" } },
  { id: "double", label: "Double-struck", variants: { regular: "double" } },
  { id: "fullwidth", label: "Fullwidth", variants: { regular: "fullwidth" } },
  { id: "circled", label: "Circled", variants: { regular: "circled" } },
];

/** Everything usable: the base fonts, then the scraped look-alike tables (no bold/italic). */
export const FONTS: FontDef[] = [
  ...BASE_FONTS,
  ...LINGOJAM_FONTS.map((f) => ({ id: f.id, label: f.label, variants: { regular: scrapedVariant(f.id) } })),
];

const FONT_BY_ID = new Map(FONTS.map((f) => [f.id, f]));

export function getFont(fontId: string): FontDef {
  const font = FONT_BY_ID.get(fontId);
  if (!font) throw new Error(`Unknown font: ${fontId}`);
  return font;
}

export function supportsBold(fontId: string): boolean {
  const v = getFont(fontId).variants;
  return Boolean(v.bold || v.boldItalic);
}

export function supportsItalic(fontId: string): boolean {
  const v = getFont(fontId).variants;
  return Boolean(v.italic || v.boldItalic);
}

/**
 * Resolve (font + bold + italic) into a single lookup map, honoring the spec's
 * "not composable" rule: we pick one combined variant, with a fallback chain
 * when the exact combination doesn't exist in Unicode.
 */
export function resolveVariantMap(fontId: string, bold: boolean, italic: boolean): VariantMap {
  const v = getFont(fontId).variants;

  let chain: (string | undefined)[];
  if (bold && italic) chain = [v.boldItalic, v.bold, v.italic, v.regular];
  else if (bold) chain = [v.bold, v.regular];
  else if (italic) chain = [v.italic, v.regular];
  else chain = [v.regular];

  const name = chain.find((n): n is string => Boolean(n))!;
  return getVariant(name);
}
