import { describe, expect, it } from "vitest";
import { DIVIDER_PRESETS } from "./presets";

describe("DIVIDER_PRESETS", () => {
  it("ships 209 presets across 12 categories", () => {
    expect(DIVIDER_PRESETS).toHaveLength(209);
    const categories = new Set(DIVIDER_PRESETS.map((p) => p.category));
    expect(categories.size).toBe(12);
  });

  it("uses unique ids", () => {
    const ids = DIVIDER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
