import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOKEND_RECIPE,
  DEFAULT_FRAMED_RECIPE,
  DEFAULT_PATTERN_RECIPE,
  renderDividerConfig,
  renderRecipeCore,
} from "./render";

describe("renderRecipeCore", () => {
  it("renders solid repeat", () => {
    expect(renderRecipeCore({ kind: "repeat", char: "-", count: 5, mode: "solid" })).toBe("-----");
  });

  it("renders spaced repeat", () => {
    expect(renderRecipeCore({ kind: "repeat", char: "•", count: 4, mode: "spaced" })).toBe("• • • •");
  });

  it("renders grouped repeat", () => {
    expect(renderRecipeCore({ kind: "repeat", char: "-", count: 3, mode: "grouped", groupSize: 2 })).toBe(
      "-- -- --",
    );
  });

  it("renders framed single accent", () => {
    expect(renderRecipeCore(DEFAULT_FRAMED_RECIPE)).toBe("──── ✦ ────");
  });

  it("renders framed triple", () => {
    expect(
      renderRecipeCore({
        kind: "framed",
        flankChar: "─",
        flankLen: 3,
        center: { mode: "repeat", char: "✦", count: 3, gap: "space" },
        gap: "space",
      }),
    ).toBe("─── ✦ ✦ ✦ ───");
  });

  it("renders bookends", () => {
    expect(renderRecipeCore(DEFAULT_BOOKEND_RECIPE)).toBe("✦ ─────────── ✦");
  });

  it("renders single-token pattern", () => {
    expect(renderRecipeCore(DEFAULT_PATTERN_RECIPE)).toBe("x-x-x-x-x-x-x-x-x-x");
  });

  it("renders alternating pattern segments", () => {
    expect(
      renderRecipeCore({ kind: "pattern", tokens: ["+", "----"], joiner: "", cycles: 3 }),
    ).toBe("+----+----+----");
  });
});

describe("renderDividerConfig", () => {
  it("applies wrapper around core", () => {
    expect(
      renderDividerConfig({
        recipe: { kind: "repeat", char: "─", count: 8, mode: "solid" },
        wrapper: { left: "༺", right: "༻" },
      }),
    ).toBe("༺────────༻");
  });

  it("shrinks repeat count to fit max length", () => {
    const line = renderDividerConfig({
      recipe: { kind: "repeat", char: "-", count: 100, mode: "solid" },
    });
    expect(line.length).toBeLessThanOrEqual(40);
    expect(line).toMatch(/^-+$/);
  });

  it("shrinks framed flanks before truncating motif", () => {
    const line = renderDividerConfig({
      recipe: {
        kind: "framed",
        flankChar: "─",
        flankLen: 20,
        center: { mode: "motif", text: "⋆⋅☆⋅⋆" },
        gap: "space",
      },
    });
    expect(line.length).toBeLessThanOrEqual(40);
    expect(line).toContain("⋆⋅☆⋅⋆");
  });
});
