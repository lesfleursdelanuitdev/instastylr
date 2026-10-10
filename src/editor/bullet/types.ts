export type BulletCategory =
  | "minimal"
  | "soft"
  | "dreamy"
  | "celestial"
  | "floral"
  | "romantic"
  | "literary"
  | "arrows"
  | "geometric"
  | "ornamental"
  | "cute"
  | "ui"
  | "favorites"
  | "nested";

export type BulletPreset =
  | { id: string; category: BulletCategory; kind: "single"; marker: string }
  | { id: string; category: "nested"; kind: "nested"; main: string; sub: string };

export const BULLET_CATEGORY_LABELS: Record<BulletCategory | "all", string> = {
  all: "All",
  minimal: "Minimal",
  soft: "Soft",
  dreamy: "Dreamy",
  celestial: "Celestial",
  floral: "Floral",
  romantic: "Romantic",
  literary: "Literary",
  arrows: "Arrows",
  geometric: "Geometric",
  ornamental: "Ornamental",
  cute: "Cute",
  ui: "UI",
  favorites: "Favorites",
  nested: "Nested",
};

export function bulletPresetMarker(preset: BulletPreset): string {
  return preset.kind === "single" ? preset.marker : preset.main;
}

export function isBulletPresetActive(preset: BulletPreset, marker: string): boolean {
  return bulletPresetMarker(preset) === marker;
}
