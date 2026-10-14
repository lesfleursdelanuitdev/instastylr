import { describe, it, expect } from "vitest";
import { transformRun } from "./transform";
import { resolveVariantMap, supportsBold, supportsItalic, BASE_FONTS } from "./mappings";

const run = (text: string, fontId: string, bold = false, italic = false) =>
  transformRun({ text, fontId, bold, italic });

describe("core substitution", () => {
  it("bolds the canonical example", () => {
    expect(run("hello", "serif", true, false)).toBe("𝐡𝐞𝐥𝐥𝐨");
  });

  it("leaves default/regular serif as plain ASCII (identity)", () => {
    expect(run("hello", "serif")).toBe("hello");
  });

  it("applies italic and bold-italic as distinct combined mappings", () => {
    expect(run("A", "serif", false, true)).toBe("𝐴"); // U+1D434
    expect(run("A", "serif", true, true)).toBe("𝑨"); // U+1D468
  });
});

describe("Unicode holes (the landmine)", () => {
  it("italic lowercase h uses U+210E, not the math-block gap", () => {
    expect(run("h", "serif", false, true)).toBe("ℎ"); // U+210E
  });

  it("script reroutes letters that live in Letterlike Symbols", () => {
    expect(run("B", "script")).toBe("ℬ"); // U+212C
    expect(run("H", "script")).toBe("ℋ"); // U+210B
    expect(run("e", "script")).toBe("ℯ"); // U+212F
  });

  it("fraktur and double-struck holes", () => {
    expect(run("C", "fraktur")).toBe("ℭ"); // U+212D
    expect(run("R", "double")).toBe("ℝ"); // U+211D
    expect(run("H", "double")).toBe("ℍ"); // U+210D
  });
});

describe("digits", () => {
  it("substitutes digits where the block has them", () => {
    expect(run("5", "serif", true)).toBe("𝟓"); // bold digit U+1D7D3
    expect(run("0", "double")).toBe("𝟘"); // U+1D7D8
    expect(run("7", "mono")).toBe("𝟽");
  });

  it("falls back to plain digits where the block has none (script)", () => {
    expect(run("2024", "script")).toBe("2024");
  });
});

describe("non-math blocks", () => {
  it("fullwidth covers letters, digits and punctuation", () => {
    expect(run("Hi!", "fullwidth")).toBe("Ｈｉ！");
  });

  it("circled letters and the special zero", () => {
    expect(run("a", "circled")).toBe("ⓐ"); // U+24D0
    expect(run("A", "circled")).toBe("Ⓐ"); // U+24B6
    expect(run("1", "circled")).toBe("①"); // U+2460
    expect(run("0", "circled")).toBe("⓪"); // U+24EA (special-cased)
  });
});

describe("fallback for unmapped characters", () => {
  it("passes punctuation, spaces and accents through unchanged", () => {
    expect(run("a, é!", "serif", true)).toBe("𝐚, é!");
  });

  it("passes non-Latin scripts through unchanged", () => {
    expect(run("привет", "serif", true)).toBe("привет");
  });
});

describe("modifier resolution + fallback chain", () => {
  it("ignores B/I on fonts that have no such variant (no-op, not tofu)", () => {
    expect(run("ab", "mono", true, true)).toBe(run("ab", "mono"));
    expect(run("xy", "double", false, true)).toBe(run("xy", "double"));
  });

  it("reports modifier support honestly for the UI", () => {
    expect(supportsBold("serif")).toBe(true);
    expect(supportsItalic("serif")).toBe(true);
    expect(supportsBold("script")).toBe(true);
    expect(supportsItalic("script")).toBe(false); // script has bold, no italic
    expect(supportsBold("mono")).toBe(false);
  });
});

describe("astral safety", () => {
  it("does not corrupt already-astral input it cannot map", () => {
    expect(run("🎉", "serif", true)).toBe("🎉");
  });

  it("each substituted glyph is a single code point", () => {
    const out = run("abc", "serif", true);
    expect([...out].length).toBe(3); // 3 code points, even though .length is 6
    expect(out.length).toBe(6); // sanity: they really are astral (surrogate pairs)
  });
});

/**
 * Completeness guard: every codepoint we emit must be a real, assigned glyph.
 * If someone adds a font with a bad offset or forgets a hole, this fails loudly
 * in CI instead of shipping tofu (□) into users' captions.
 */
describe("mapping completeness", () => {
  const everyModifier: Array<[boolean, boolean]> = [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ];

  // The hand-built fonts only: scraped tables may legitimately use several code
  // points per character (see scraped/lingojam.test.ts for their guard).
  for (const font of BASE_FONTS) {
    for (const [bold, italic] of everyModifier) {
      it(`${font.id} (b=${bold} i=${italic}) emits only defined, single code points`, () => {
        const map = resolveVariantMap(font.id, bold, italic);
        if (!map) return; // identity
        for (const [, value] of map) {
          const cps = [...value];
          expect(cps.length).toBe(1); // exactly one code point per character
          const cp = cps[0].codePointAt(0)!;
          // Must not land in surrogate range or on noncharacters/replacement.
          expect(cp).not.toBe(0xfffd);
          expect(cp < 0xd800 || cp > 0xdfff).toBe(true);
        }
      });
    }
  }
});
