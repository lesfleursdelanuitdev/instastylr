/**
 * UI-facing font list: what the toolbar's font menu and the font panel show.
 *
 * Every engine font (mappings.ts) is listed, with the plain label used in the
 * footer and a preview made by running sample text through the font itself.
 * The toolbar menu only offers QUICK_FONTS; the font panel offers all of them.
 */
import { FONTS, SCRAPED_FONTS, getFont } from "./mappings";
import { transformRun } from "./transform";
import { STYLE_PRESETS, type StylePreset } from "./scraped/presets";
import type { MyStyle } from "./myStyles";

export type UiFont = {
  id: string;
  label: string;
  /** "Aa" in this font, for compact spots (the toolbar button and menu). */
  preview: string;
  style: FontStyle;
  bold: boolean;
  italic: boolean;
  /** A true combined bold-italic alphabet (not bold or italic standing in for it). */
  boldItalic: boolean;
  /** Set for a preset: one of the fonts plus bold/italic and marks, under a site's name. */
  preset?: StylePreset;
  /** One of the user's own saved styles (fonts/myStyles.ts). */
  mine?: boolean;
};

/** Friendlier names than the engine's for the hand-built fonts. */
const LABELS: Record<string, string> = {
  serif: "Serif",
  sans: "Sans-Serif",
  script: "Script",
  fraktur: "Gothic",
  mono: "Monospace",
  double: "Outline",
  fullwidth: "Wide",
  circled: "Circled",
  tiny: "All Small Caps",
};

/** What a font looks like, for the panel's Style filter. Every font must be listed. */
export type FontStyle = "classic" | "script" | "gothic" | "outline" | "boxed" | "small" | "marked" | "lookalike";

export const FONT_STYLES: { id: FontStyle; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "script", label: "Script" },
  { id: "gothic", label: "Gothic" },
  { id: "outline", label: "Outline" },
  { id: "boxed", label: "Boxed" },
  { id: "small", label: "Small" },
  { id: "marked", label: "Marked" },
  { id: "lookalike", label: "Lookalike" },
];

const STYLE_BY_ID: Record<string, FontStyle> = {
  serif: "classic", sans: "classic", mono: "classic", fullwidth: "classic",
  script: "script",
  fraktur: "gothic",
  double: "outline",
  circled: "boxed", squares2: "boxed", invertedSquares: "boxed",
  thickBlockFramed: "boxed", diametricAngleFrame: "boxed", weirdBox: "boxed",
  tiny: "small", smallCaps: "small", subscript: "small", superscript: "small",
  // plain letters with a mark through, under or around them
  strikeThrough: "marked", tildeStrikeThrough: "marked", slashThrough: "marked",
  underline: "marked", doubleUnderline: "marked", stinky: "marked",
  arrowBelow: "marked", crossAboveBelow: "marked", firework: "marked",
  // letters borrowed from other alphabets that happen to look like ours
  taiViet: "lookalike", cuteDotsAndScribbles: "lookalike", yiNuosu: "lookalike",
  squiggle: "lookalike", squiggle3: "lookalike", squiggle4: "lookalike",
  squiggle5: "lookalike", squiggle6: "lookalike", upperAngles: "lookalike",
  greek: "lookalike", symbols: "lookalike", currency: "lookalike",
  asianStyle: "lookalike", asianStyle2: "lookalike", bentText: "lookalike",
  neon: "lookalike", futureAlien: "lookalike",
};

export const DEFAULT_SAMPLE = "Hello World 123";

const STYLE_IDS = new Set<string>(FONT_STYLES.map((s) => s.id));
// Fonts from the later sites carry their group (set by the scrape's analyser).
for (const f of SCRAPED_FONTS)
  if (f.style && !STYLE_BY_ID[f.id]) {
    if (!STYLE_IDS.has(f.style)) throw new Error(`Font "${f.id}" has an unknown style "${f.style}"`);
    STYLE_BY_ID[f.id] = f.style as FontStyle;
  }

const PRESET_BY_ID = new Map(STYLE_PRESETS.map((p) => [p.id, p]));

/** A built-in preset or one of the user's saved styles (`mine`), by id. */
export function stylePreset(id: string, mine: readonly MyStyle[] = []): StylePreset | undefined {
  return mine.find((s) => s.id === id) ?? PRESET_BY_ID.get(id);
}

/**
 * Sample text in a font, with bold/italic where the font has them (else its regular
 * face). A preset brings its own font, bold/italic and marks.
 */
export function renderSample(fontId: string, text: string, bold = false, italic = false): string {
  const p = PRESET_BY_ID.get(fontId);
  if (p) return transformRun({ text, fontId: p.font, bold: p.bold, italic: p.italic, marks: p.marks });
  return transformRun({ text, fontId, bold, italic });
}

export const ALL_UI_FONTS: UiFont[] = FONTS.map((f) => {
  const style = STYLE_BY_ID[f.id];
  if (!style) throw new Error(`Font "${f.id}" has no style for the font panel's filter`);
  const v = getFont(f.id).variants;
  return {
    id: f.id,
    label: LABELS[f.id] ?? f.label,
    preview: renderSample(f.id, "Aa"),
    style,
    bold: Boolean(v.bold),
    italic: Boolean(v.italic),
    boldItalic: Boolean(v.boldItalic),
  };
});

/** The presets, as panel entries in the Marked group (no bold/italic of their own to offer). */
export const PRESET_UI_FONTS: UiFont[] = STYLE_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
  preview: renderSample(p.id, "Aa"),
  style: "marked",
  bold: false,
  italic: false,
  boldItalic: false,
  preset: p,
}));

/** What the font panel lists: every font, then the presets. */
export const PANEL_FONTS: UiFont[] = [...ALL_UI_FONTS, ...PRESET_UI_FONTS];

const FONT_BY_ID = new Map(PANEL_FONTS.map((f) => [f.id, f]));

/** The user's saved styles as list entries, grouped by the look of their font (Marked if they add marks). */
export function myStyleUiFonts(mine: readonly MyStyle[]): UiFont[] {
  return mine.map((p) => ({
    id: p.id,
    label: p.label,
    preview: transformRun({ text: "Aa", fontId: p.font, bold: p.bold, italic: p.italic, marks: p.marks }),
    style: p.marks.length ? "marked" : (STYLE_BY_ID[p.font] ?? "classic"),
    bold: false,
    italic: false,
    boldItalic: false,
    preset: p,
    mine: true,
  }));
}

/** What the font panel lists with the user's styles: theirs first, then every font and preset. */
export function panelFonts(mine: readonly MyStyle[]): UiFont[] {
  return [...myStyleUiFonts(mine), ...PANEL_FONTS];
}

export function uiFont(id: string, mine: readonly MyStyle[] = []): UiFont | undefined {
  if (id.startsWith("my-")) return myStyleUiFonts(mine.filter((s) => s.id === id))[0];
  return FONT_BY_ID.get(id);
}

/**
 * Sample text for a list entry: a preset or saved style in its own look, a plain
 * font with the given bold/italic (where it has them).
 */
export function renderUiFont(f: UiFont, text: string, bold = false, italic = false): string {
  const p = f.preset;
  if (p) return transformRun({ text, fontId: p.font, bold: p.bold, italic: p.italic, marks: p.marks });
  return transformRun({ text, fontId: f.id, bold, italic });
}

/** The toolbar menu's short list: the four everyday fonts, which are also the only ones with bold or italic. */
export const QUICK_FONTS: UiFont[] = ["serif", "sans", "script", "fraktur"].map((id) => FONT_BY_ID.get(id)!);

export function fontLabel(id: string): string {
  return FONT_BY_ID.get(id)?.label ?? "Serif";
}

/** Font-panel filters: the look of a font, and which styled alphabets it has. Both apply at once. */
export type FontFeature = "any" | "bold" | "italic" | "boldItalic";

export const FONT_FEATURES: { id: FontFeature; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "bold", label: "Bold" },
  { id: "italic", label: "Italic" },
  { id: "boldItalic", label: "Bold + italic" },
];

/** "recent" = the fonts in `recent` (ids, newest first), shown in that order; "mine" = the user's saved styles. */
export type FontFilter = { style: FontStyle | "all" | "recent" | "mine"; feature: FontFeature; recent?: string[] };

export function filterFonts(fonts: UiFont[], filter: FontFilter): UiFont[] {
  const has = (f: UiFont) => filter.feature === "any" || f[filter.feature];
  if (filter.style === "recent") {
    const byId = new Map(fonts.map((f) => [f.id, f]));
    return (filter.recent ?? []).map((id) => byId.get(id)).filter((f): f is UiFont => Boolean(f) && has(f!));
  }
  if (filter.style === "mine") return fonts.filter((f) => f.mine && has(f));
  return fonts.filter((f) => (filter.style === "all" || f.style === filter.style) && has(f));
}

/** For the toolbar menu: the user's newest saved styles. */
export const MENU_MY_STYLES_MAX = 5;
export function menuMyStyles(mine: readonly MyStyle[]): UiFont[] {
  return myStyleUiFonts(mine.slice(0, MENU_MY_STYLES_MAX));
}

/** For the toolbar menu: the newest recently used fonts that aren't already shown above them. */
export const MENU_RECENT_MAX = 5;
export function menuRecentFonts(recent: string[], mine: readonly MyStyle[] = []): UiFont[] {
  const shown = new Set([...QUICK_FONTS, ...menuMyStyles(mine)].map((f) => f.id));
  return recent
    .filter((id) => !shown.has(id))
    .map((id) => uiFont(id, mine))
    .filter((f): f is UiFont => Boolean(f))
    .slice(0, MENU_RECENT_MAX);
}
