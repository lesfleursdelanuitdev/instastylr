import { describe, expect, it } from "vitest";
import { inferDividerConfig } from "./parse";

describe("inferDividerConfig", () => {
  it("matches known presets exactly", () => {
    const config = inferDividerConfig("──── ✦ ────");
    expect(config.recipe?.kind).toBe("framed");
    if (config.recipe?.kind === "framed") {
      expect(config.recipe.center.mode).toBe("single");
    }
  });

  it("infers solid repeat lines", () => {
    const config = inferDividerConfig("━━━━━━━━━━");
    expect(config.recipe).toEqual({ kind: "repeat", char: "━", count: 10, mode: "solid" });
  });

  it("infers spaced repeat lines", () => {
    const config = inferDividerConfig("• • • • •");
    expect(config.recipe).toEqual({ kind: "repeat", char: "•", count: 5, mode: "spaced" });
  });

  it("infers bookend lines", () => {
    const config = inferDividerConfig("✦ ─────────── ✦");
    expect(config.recipe?.kind).toBe("bookend");
  });

  it("infers framed sequence lines", () => {
    const config = inferDividerConfig("─── ☽ ☼ ☾ ───");
    expect(config.recipe?.kind).toBe("framed");
    if (config.recipe?.kind === "framed" && config.recipe.center.mode === "sequence") {
      expect(config.recipe.center.chars).toEqual(["☽", "☼", "☾"]);
    }
  });

  it("infers wrapped dividers", () => {
    const config = inferDividerConfig("༺────────────༻");
    expect(config.wrapper).toEqual({ left: "༺", right: "༻" });
    expect(config.recipe?.kind).toBe("repeat");
  });

  it("falls back to raw for unrecognized aesthetic strings", () => {
    const text = "˚₊‧꒰ა ☆ ໒꒱ ‧₊˚";
    const config = inferDividerConfig(text);
    expect(config.recipe?.kind).toBe("raw");
    if (config.recipe?.kind === "raw") expect(config.recipe.text).toBe(text);
  });
});
