import { DIVIDER_PRESETS, DIVIDER_WRAPPER_OPTIONS } from "./presets";
import { configFromPreset, normalizeDividerLine, renderRecipeCore } from "./render";
import type { CenterSpec, DividerConfig, DividerRecipe, DividerWrapper, GapMode } from "./types";

function splitGraphemes(s: string): string[] {
  if (!s) return [];
  const SegImpl = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: "grapheme" }) => { segment(input: string): Iterable<{ segment: string }> } }).Segmenter;
  if (typeof SegImpl === "function") {
    const segmenter = new SegImpl(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(s)].map((seg) => seg.segment);
  }
  return [...s];
}

function isRepeatedChar(s: string): { char: string; count: number } | null {
  if (!s) return null;
  const graphemes = splitGraphemes(s);
  if (graphemes.length === 0) return null;
  const char = graphemes[0];
  if (graphemes.every((g) => g === char)) return { char, count: graphemes.length };
  return null;
}

function peelWrapper(line: string): { core: string; wrapper: DividerWrapper | null } {
  for (const opt of DIVIDER_WRAPPER_OPTIONS) {
    if (opt.id === "none") continue;
    if (line.startsWith(opt.left) && line.endsWith(opt.right) && line.length > opt.left.length + opt.right.length) {
      return {
        core: line.slice(opt.left.length, line.length - opt.right.length),
        wrapper: { left: opt.left, right: opt.right },
      };
    }
  }
  return { core: line, wrapper: null };
}

function inferRepeat(core: string): DividerRecipe | null {
  if (!core) return null;

  if (core.includes(" ")) {
    const parts = core.split(" ");
    if (parts.length >= 2 && parts.every((p) => p.length > 0)) {
      const singleCharParts = parts.every((p) => splitGraphemes(p).length === 1);
      if (singleCharParts) {
        const char = parts[0];
        if (parts.every((p) => p === char)) {
          return { kind: "repeat", char, count: parts.length, mode: "spaced" };
        }
      }

      const groupSizes = new Set(parts.map((p) => p.length));
      if (groupSizes.size === 1) {
        const groupSize = parts[0].length;
        const groupChar = splitGraphemes(parts[0])[0];
        if (parts.every((p) => isRepeatedChar(p)?.char === groupChar && p.length === groupSize)) {
          return { kind: "repeat", char: groupChar, count: parts.length, mode: "grouped", groupSize };
        }
      }
    }
  }

  const solid = isRepeatedChar(core);
  if (solid) return { kind: "repeat", char: solid.char, count: solid.count, mode: "solid" };
  return null;
}

function inferBookend(core: string): DividerRecipe | null {
  const spaced = core.split(" ").filter(Boolean);
  if (spaced.length !== 3) return null;
  const [leftCap, span, rightCap] = spaced;
  if (splitGraphemes(leftCap).length !== 1 || splitGraphemes(rightCap).length !== 1) return null;
  const spanInfo = isRepeatedChar(span);
  if (!spanInfo) return null;
  return {
    kind: "bookend",
    leftCap,
    spanChar: spanInfo.char,
    spanLen: spanInfo.count,
    rightCap,
    gap: "space",
  };
}

function inferFramed(core: string, gap: GapMode): DividerRecipe | null {
  const parts = gap === "space" ? core.split(" ").filter(Boolean) : null;

  if (parts && parts.length >= 3) {
    const allSingle = parts.every((p) => splitGraphemes(p).length === 1);
    if (allSingle && parts.every((p) => p === parts[0])) return null;

    const first = parts[0];
    const last = parts[parts.length - 1];
    const firstInfo = isRepeatedChar(first);
    const lastInfo = isRepeatedChar(last);
    if (!firstInfo || !lastInfo || firstInfo.char !== lastInfo.char || firstInfo.count !== lastInfo.count) {
      return null;
    }
    if (firstInfo.count < 2) return null;

    const centerParts = parts.slice(1, -1);
    let center: CenterSpec;
    if (centerParts.length === 1 && splitGraphemes(centerParts[0]).length === 1) {
      center = { mode: "single", char: centerParts[0] };
    } else if (centerParts.every((p) => splitGraphemes(p).length === 1)) {
      const sameChar = centerParts.every((p) => p === centerParts[0]);
      if (sameChar) {
        center = { mode: "repeat", char: centerParts[0], count: centerParts.length, gap: "space" };
      } else {
        center = { mode: "sequence", chars: centerParts, gap: "space" };
      }
    } else {
      center = { mode: "motif", text: centerParts.join(" ") };
    }

    return {
      kind: "framed",
      flankChar: firstInfo.char,
      flankLen: firstInfo.count,
      center,
      gap,
    };
  }

  if (gap === "none" && core.length >= 3) {
    const leftMatch = core.match(/^(.)\1*/);
    if (!leftMatch) return null;
    const flankChar = leftMatch[1];
    const flankLen = leftMatch[0].length;
    const rightPattern = new RegExp(`${flankChar}+$`);
    const rightMatch = core.match(rightPattern);
    if (!rightMatch || rightMatch.index === undefined || rightMatch.index <= flankLen) return null;
    const centerText = core.slice(flankLen, rightMatch.index);
    if (!centerText) return null;

    const centerChars = splitGraphemes(centerText);
    let center: CenterSpec;
    if (centerChars.length === 1) center = { mode: "single", char: centerChars[0] };
    else if (centerChars.every((c) => c === centerChars[0]))
      center = { mode: "repeat", char: centerChars[0], count: centerChars.length, gap: "none" };
    else center = { mode: "motif", text: centerText };

    return { kind: "framed", flankChar, flankLen, center, gap: "none" };
  }

  return null;
}

function inferPattern(core: string): DividerRecipe | null {
  if (core.includes("-") && !core.includes(" ")) {
    const parts = core.split("-").filter((p) => p.length > 0);
    if (parts.length >= 3 && parts.every((p) => p.length === 1)) {
      const same = parts.every((p) => p === parts[0]);
      if (same) return { kind: "pattern", tokens: [parts[0]], joiner: "-", cycles: parts.length };
    }
  }

  if (core.includes(" ") && !core.includes("-")) {
    const parts = core.split(" ").filter(Boolean);
    if (parts.length >= 3 && parts.every((p) => p.length === 1)) {
      const same = parts.every((p) => p === parts[0]);
      if (same) return { kind: "pattern", tokens: [parts[0]], joiner: " ", cycles: parts.length };
    }
  }

  if (/^(?:\/\\)+$/.test(core)) {
    return { kind: "pattern", tokens: ["/", "\\"], joiner: "", cycles: core.length / 2 };
  }

  if (/^(?:\+----)+\+?$/.test(core)) {
    const segments = core.match(/\+----/g);
    if (segments) return { kind: "pattern", tokens: ["+", "----"], joiner: "", cycles: segments.length };
  }

  return null;
}

function inferCoreRecipe(core: string): DividerRecipe | null {
  return (
    inferBookend(core) ??
    inferRepeat(core) ??
    inferFramed(core, "space") ??
    inferFramed(core, "none") ??
    inferPattern(core)
  );
}

/** Best-effort parse of a stored line into recipe + wrapper for builder round-trip. */
export function inferDividerConfig(line: string): DividerConfig {
  const normalized = normalizeDividerLine(line);
  if (!normalized) return { line: "", recipe: { kind: "raw", text: "" } };

  const preset = DIVIDER_PRESETS.find((p) => p.line === normalized);
  if (preset) return configFromPreset(preset);

  const { core, wrapper } = peelWrapper(normalized);
  const innerPreset = DIVIDER_PRESETS.find((p) => p.line === core);
  if (innerPreset) {
    const config = configFromPreset(innerPreset);
    return { ...config, line: normalized, wrapper: wrapper ?? innerPreset.wrapper ?? null };
  }

  const recipe = inferCoreRecipe(core);
  if (recipe) {
    const rendered = renderRecipeCore(recipe);
    if (wrapper) {
      const wrapped = `${wrapper.left}${rendered}${wrapper.right}`.slice(0, normalized.length);
      if (wrapped === normalized || `${wrapper.left}${rendered}${wrapper.right}`.startsWith(normalized)) {
        return { line: normalized, recipe, wrapper };
      }
    } else if (rendered === normalized || rendered.startsWith(normalized) || normalized.startsWith(rendered)) {
      return { line: normalized, recipe, wrapper: null };
    }
  }

  if (core.length <= 20 && !core.includes(" ")) {
    return { line: normalized, recipe: { kind: "motif", text: core }, wrapper };
  }

  return { line: normalized, recipe: { kind: "raw", text: normalized }, wrapper };
}
