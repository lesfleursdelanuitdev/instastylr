import {
  type CenterSpec,
  type DividerConfig,
  type DividerPreset,
  type DividerRecipe,
  type DividerWrapper,
  type GapMode,
  MAX_DIVIDER_LEN,
} from "./types";

function gap(g: GapMode): string {
  return g === "space" ? " " : "";
}

function renderCenter(center: CenterSpec): string {
  switch (center.mode) {
    case "single":
      return center.char;
    case "repeat": {
      const items = Array.from({ length: Math.max(1, center.count) }, () => center.char);
      return center.gap === "space" ? items.join(" ") : items.join("");
    }
    case "sequence":
      return center.gap === "space" ? center.chars.join(" ") : center.chars.join("");
    case "motif":
      return center.text;
  }
}

function renderRepeatCore(recipe: Extract<DividerRecipe, { kind: "repeat" }>): string {
  const count = Math.max(1, recipe.count);
  const groupSize = Math.max(1, recipe.groupSize ?? 2);
  if (recipe.mode === "solid") return recipe.char.repeat(count);
  if (recipe.mode === "spaced") return Array.from({ length: count }, () => recipe.char).join(" ");
  const group = recipe.char.repeat(groupSize);
  return Array.from({ length: count }, () => group).join(" ");
}

function renderFramedCore(recipe: Extract<DividerRecipe, { kind: "framed" }>): string {
  const flankLen = Math.max(0, recipe.flankLen);
  const flank = recipe.flankChar.repeat(flankLen);
  const center = renderCenter(recipe.center);
  const g = gap(recipe.gap);
  return `${flank}${g}${center}${g}${flank}`;
}

function renderBookendCore(recipe: Extract<DividerRecipe, { kind: "bookend" }>): string {
  const span = recipe.spanChar.repeat(Math.max(0, recipe.spanLen));
  const g = gap(recipe.gap);
  return `${recipe.leftCap}${g}${span}${g}${recipe.rightCap}`;
}

function renderPatternCore(recipe: Extract<DividerRecipe, { kind: "pattern" }>): string {
  const cycles = Math.max(1, recipe.cycles);
  const a = recipe.tokens[0] ?? "";
  const b = recipe.tokens[1];
  if (!b) return Array.from({ length: cycles }, () => a).join(recipe.joiner);
  const parts: string[] = [];
  for (let i = 0; i < cycles; i++) {
    parts.push(a, b);
  }
  return recipe.joiner ? parts.join(recipe.joiner) : parts.join("");
}

export function renderRecipeCore(recipe: DividerRecipe): string {
  switch (recipe.kind) {
    case "raw":
    case "motif":
      return recipe.text;
    case "repeat":
      return renderRepeatCore(recipe);
    case "framed":
      return renderFramedCore(recipe);
    case "bookend":
      return renderBookendCore(recipe);
    case "pattern":
      return renderPatternCore(recipe);
  }
}

export function applyWrapper(core: string, wrapper: DividerWrapper | null | undefined): string {
  if (!wrapper) return core;
  return `${wrapper.left}${core}${wrapper.right}`;
}

function cloneRecipe(recipe: DividerRecipe): DividerRecipe {
  return structuredClone(recipe);
}

function shrinkRecipe(recipe: DividerRecipe): boolean {
  switch (recipe.kind) {
    case "repeat":
      if (recipe.count > 1) {
        recipe.count -= 1;
        return true;
      }
      return false;
    case "framed":
      if (recipe.flankLen > 0) {
        recipe.flankLen -= 1;
        return true;
      }
      if (recipe.center.mode === "repeat" && recipe.center.count > 1) {
        recipe.center.count -= 1;
        return true;
      }
      return false;
    case "bookend":
      if (recipe.spanLen > 0) {
        recipe.spanLen -= 1;
        return true;
      }
      return false;
    case "pattern":
      if (recipe.cycles > 1) {
        recipe.cycles -= 1;
        return true;
      }
      return false;
    case "motif":
    case "raw":
      if (recipe.text.length > 1) {
        recipe.text = recipe.text.slice(0, -1);
        return true;
      }
      return false;
  }
}

/** Render recipe + optional wrapper, shrinking params until within max length. */
export function renderDividerConfig(
  config: Pick<DividerConfig, "recipe" | "wrapper">,
  maxLen = MAX_DIVIDER_LEN,
): string {
  if (!config.recipe) return "";

  const recipe = cloneRecipe(config.recipe);
  const wrapper = config.wrapper ?? null;
  const wrapperLen = wrapper ? wrapper.left.length + wrapper.right.length : 0;
  const budget = Math.max(1, maxLen - wrapperLen);

  let core = renderRecipeCore(recipe).slice(0, budget);
  while (core.length > budget && shrinkRecipe(recipe)) {
    core = renderRecipeCore(recipe);
  }
  if (core.length > budget) core = core.slice(0, budget);

  let line = applyWrapper(core, wrapper);
  if (line.length > maxLen) line = line.slice(0, maxLen);
  return line;
}

export function normalizeDividerLine(raw: string, maxLen = MAX_DIVIDER_LEN): string {
  return raw.trim().slice(0, maxLen);
}

export function configFromLine(line: string): DividerConfig {
  return { line: normalizeDividerLine(line), recipe: { kind: "raw", text: normalizeDividerLine(line) } };
}

export function configFromPreset(preset: DividerPreset): DividerConfig {
  if (preset.recipe) {
    return {
      line: renderDividerConfig(preset),
      recipe: preset.recipe,
      wrapper: preset.wrapper ?? null,
    };
  }
  return configFromLine(preset.line);
}

export const DEFAULT_REPEAT_RECIPE: Extract<DividerRecipe, { kind: "repeat" }> = {
  kind: "repeat",
  char: "─",
  count: 20,
  mode: "solid",
};

export const DEFAULT_FRAMED_RECIPE: Extract<DividerRecipe, { kind: "framed" }> = {
  kind: "framed",
  flankChar: "─",
  flankLen: 4,
  center: { mode: "single", char: "✦" },
  gap: "space",
};

export const DEFAULT_BOOKEND_RECIPE: Extract<DividerRecipe, { kind: "bookend" }> = {
  kind: "bookend",
  leftCap: "✦",
  spanChar: "─",
  spanLen: 11,
  rightCap: "✦",
  gap: "space",
};

export const DEFAULT_PATTERN_RECIPE: Extract<DividerRecipe, { kind: "pattern" }> = {
  kind: "pattern",
  tokens: ["x"],
  joiner: "-",
  cycles: 10,
};
