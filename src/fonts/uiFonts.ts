/**
 * UI-facing font list for the toolbar dropdown and footer label.
 *
 * The engine (mappings.ts) carries more variants than we surface; this is the
 * curated set the reference interface exposes, in order, with the Unicode-preview
 * labels shown in the <select> and the plain labels shown in the footer. `id`
 * references an engine font in FONTS.
 */
export type UiFont = { id: string; label: string; select: string };

export const UI_FONTS: UiFont[] = [
  { id: "serif",   label: "Serif",       select: "𝐀𝐚  Serif" },
  { id: "sans",    label: "Sans-Serif",  select: "𝖠𝖺  Sans-Serif" },
  { id: "script",  label: "Script",      select: "𝒜𝒶  Script" },
  { id: "fraktur", label: "Gothic",      select: "𝔄𝔞  Gothic" },
  { id: "mono",    label: "Monospace",   select: "𝙰𝚊  Monospace" },
  { id: "double",  label: "Outline",     select: "𝔸𝕒  Outline" },
];

const LABEL_BY_ID = new Map(UI_FONTS.map((f) => [f.id, f.label]));

export function fontLabel(id: string): string {
  return LABEL_BY_ID.get(id) ?? "Serif";
}
