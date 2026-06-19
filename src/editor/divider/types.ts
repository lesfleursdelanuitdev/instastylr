export const MAX_DIVIDER_LEN = 40;
export const DEFAULT_DIVIDER_LINE = "━━━━━━━━━━";

export type RepeatMode = "solid" | "spaced" | "grouped";
export type GapMode = "none" | "space";

export type CenterSpec =
  | { mode: "single"; char: string }
  | { mode: "repeat"; char: string; count: number; gap: GapMode }
  | { mode: "sequence"; chars: string[]; gap: GapMode }
  | { mode: "motif"; text: string };

export type DividerRecipe =
  | { kind: "repeat"; char: string; count: number; mode: RepeatMode; groupSize?: number }
  | { kind: "framed"; flankChar: string; flankLen: number; center: CenterSpec; gap: GapMode }
  | {
      kind: "bookend";
      leftCap: string;
      spanChar: string;
      spanLen: number;
      rightCap: string;
      gap: GapMode;
    }
  | { kind: "pattern"; tokens: string[]; joiner: string; cycles: number }
  | { kind: "motif"; text: string }
  | { kind: "raw"; text: string };

export type DividerWrapper = { left: string; right: string };

export type DividerCategory =
  | "simple"
  | "spaced"
  | "grouped"
  | "unicode"
  | "accent"
  | "triple"
  | "bookend"
  | "motif"
  | "frames"
  | "borders"
  | "patterns"
  | "aesthetic";

export type DividerPreset = {
  id: string;
  category: DividerCategory;
  line: string;
  recipe?: DividerRecipe;
  wrapper?: DividerWrapper | null;
};

export type DividerConfig = {
  line: string;
  recipe?: DividerRecipe;
  wrapper?: DividerWrapper | null;
};

export type BuilderTab = "line" | "framed" | "bookend" | "pattern" | "custom";

export const DIVIDER_CATEGORY_LABELS: Record<DividerCategory | "all", string> = {
  all: "All",
  simple: "Simple",
  spaced: "Spaced",
  grouped: "Grouped",
  unicode: "Unicode",
  accent: "Accent",
  triple: "Triple",
  bookend: "Bookend",
  motif: "Motif",
  frames: "Frames",
  borders: "Borders",
  patterns: "Patterns",
  aesthetic: "Aesthetic",
};
