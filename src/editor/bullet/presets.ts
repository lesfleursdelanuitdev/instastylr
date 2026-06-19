import type { BulletCategory, BulletPreset } from "./types";

function singles(category: BulletCategory, prefix: string, markers: string[]): BulletPreset[] {
  const seen = new Set<string>();
  const out: BulletPreset[] = [];
  for (const marker of markers) {
    if (seen.has(marker)) continue;
    seen.add(marker);
    out.push({ id: `${prefix}-${out.length + 1}`, category, kind: "single", marker });
  }
  return out;
}

function nestedPairs(pairs: [string, string][]): BulletPreset[] {
  return pairs.map(([main, sub], index) => ({
    id: `nested-${index + 1}`,
    category: "nested" as const,
    kind: "nested" as const,
    main,
    sub,
  }));
}

/** Unicode bullet preset library — 200+ presets across 14 categories. */
export const BULLET_PRESETS: BulletPreset[] = [
  ...singles("minimal", "minimal", [
    "•", "◦", "·", "∙", "⋅", "∘", "○", "●", "▪", "▫",
    "–", "—", "‒", "―", "⁃", "-", "_", "⋯", "…", "‣",
  ]),
  ...singles("soft", "soft", [
    "⋅", "·", "∙", "∘", "◦", "｡", "°", "˚", "˖", "˙",
    "⸰", "⸱", "⁘", "⁙", "⁚", "⁛", "ꞏ", "ꓸ", "꓿", "ˑ",
  ]),
  ...singles("dreamy", "dreamy", [
    "✧", "✦", "✶", "✷", "✸", "✹", "✺", "✵", "✴", "✳",
    "❈", "❉", "❊", "❋", "✩", "✫", "✬", "✭", "✮", "✯",
  ]),
  ...singles("celestial", "celestial", [
    "⋆", "★", "☆", "✩", "✪", "✫", "✬", "✭", "✮", "✯",
    "☽", "☾", "☼", "☀", "☁", "☄", "☌", "☍", "☉", "☊",
  ]),
  ...singles("floral", "floral", [
    "❀", "✿", "❁", "✾", "❃", "❋", "✽", "✼", "✻", "✺",
    "☘", "♧", "♣", "🍃", "🌿", "🌱", "🌸", "🌼", "🌷", "🌹",
  ]),
  ...singles("romantic", "romantic", [
    "♡", "♥", "❥", "❦", "❧", "❤", "❣", "💕", "💗", "💫",
    "ღ", "დ", "ლ", "ෆ", "ᥫ᭡", "ꨄ", "❝", "❞", "“", "”",
  ]),
  ...singles("literary", "literary", [
    "❦", "❧", "§", "¶", "※", "⁂", "⁕", "⁜", "†", "‡",
    "⌘", "✒", "✎", "✐", "✑", "✏", "☞", "☜", "❝", "❞",
  ]),
  ...singles("arrows", "arrow", [
    "→", "←", "↳", "↪", "↠", "↣", "➜", "➝", "➞", "➟",
    "➤", "➢", "➣", "➥", "➦", "➧", "➨", "➩", "➪", "➫",
    "➬", "➭", "➮", "➯", "➱", "➲", "➳", "➵", "➸", "➺",
  ]),
  ...singles("geometric", "geo", [
    "◆", "◇", "◈", "◉", "◎", "◌", "○", "●", "◐", "◑",
    "■", "□", "▣", "▢", "▸", "▹", "►", "▻", "▾", "▿",
    "▲", "△", "▴", "▵", "▼", "▽", "◂", "◃", "+", "*",
  ]),
  ...singles("ornamental", "ornament", [
    "⟡", "✧", "✦", "❖", "✥", "✤", "✣", "✢", "✠", "✚",
    "✜", "✛", "✙", "✘", "✕", "✖", "✗", "✶", "✷", "✸",
  ]),
  ...singles("cute", "cute", [
    "♡", "✿", "❀", "⋆", "ꕤ", "ꕥ", "ꔛ", "꒰", "꒱", "𓍯",
    "🦋", "🕊", "🌙", "✨", "🌟", "💐", "🍄", "🍂", "🪷", "🫧",
  ]),
  ...singles("ui", "ui", [
    "›", "»", "⌁", "⌑", "⌾", "⊹", "⊙", "⊚", "⊛", "⊕",
    "⊗", "⊡", "⊞", "⊟", "⊠", "⊜", "◦", "▪", "▫", "∙",
  ]),
  ...singles("favorites", "fav", [
    "•", "⋅", "✧", "✦", "⋆", "❀", "✿", "♡", "❦", "→",
    "⟡", "☽", "☾", "☼", "❧", "◆", "◇", "◦", "—", "↳",
  ]),
  ...nestedPairs([
    ["•", "◦"],
    ["▪", "▫"],
    ["✦", "⋅"],
    ["✧", "◦"],
    ["⋆", "·"],
    ["❀", "✿"],
    ["♡", "❥"],
    ["❦", "❧"],
    ["→", "↳"],
    ["◆", "◇"],
  ]),
];

export const BULLET_CATEGORY_FILTERS: (BulletCategory | "all")[] = [
  "all",
  "favorites",
  "minimal",
  "soft",
  "dreamy",
  "celestial",
  "floral",
  "romantic",
  "literary",
  "arrows",
  "geometric",
  "ornamental",
  "cute",
  "ui",
  "nested",
];
