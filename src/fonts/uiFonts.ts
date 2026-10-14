/**
 * UI-facing font list: what the toolbar's font menu and the font panel show.
 *
 * Every engine font (mappings.ts) is listed, with the plain label used in the
 * footer and a preview made by running sample text through the font itself.
 * The toolbar menu only offers QUICK_FONTS; the font panel offers all of them.
 */
import { FONTS, getFont } from "./mappings";
import { transformRun } from "./transform";

export type UiFont = {
  id: string;
  label: string;
  /** "Aa" in this font, for compact spots (the toolbar button and menu). */
  preview: string;
  /** A longer sample in this font, for the font panel. */
  sample: string;
  bold: boolean;
  italic: boolean;
  /** A true combined bold-italic alphabet (not bold or italic standing in for it). */
  boldItalic: boolean;
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
};

const SAMPLE = "Hello World 123";

export const ALL_UI_FONTS: UiFont[] = FONTS.map((f) => {
  const render = (text: string) => transformRun({ text, fontId: f.id, bold: false, italic: false });
  const v = getFont(f.id).variants;
  return {
    id: f.id,
    label: LABELS[f.id] ?? f.label,
    preview: render("Aa"),
    sample: render(SAMPLE),
    bold: Boolean(v.bold),
    italic: Boolean(v.italic),
    boldItalic: Boolean(v.boldItalic),
  };
});

const FONT_BY_ID = new Map(ALL_UI_FONTS.map((f) => [f.id, f]));

export function uiFont(id: string): UiFont | undefined {
  return FONT_BY_ID.get(id);
}

/** The toolbar menu's short list: the four everyday fonts, which are also the only ones with bold or italic. */
export const QUICK_FONTS: UiFont[] = ["serif", "sans", "script", "fraktur"].map((id) => FONT_BY_ID.get(id)!);

export function fontLabel(id: string): string {
  return FONT_BY_ID.get(id)?.label ?? "Serif";
}

/** Font-panel filters: which styled alphabets a font has. */
export type FontFilter = "all" | "bold" | "italic" | "boldItalic";

export const FONT_FILTERS: { id: FontFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bold", label: "Bold" },
  { id: "italic", label: "Italic" },
  { id: "boldItalic", label: "Bold + italic" },
];

export function filterFonts(fonts: UiFont[], filter: FontFilter): UiFont[] {
  return filter === "all" ? fonts : fonts.filter((f) => f[filter]);
}
