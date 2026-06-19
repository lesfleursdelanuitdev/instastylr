import { describe, expect, it } from "vitest";
import { BULLET_PRESETS } from "./presets";
import { bulletPresetMarker } from "./types";

describe("BULLET_PRESETS", () => {
  it("ships at least 200 presets", () => {
    expect(BULLET_PRESETS.length).toBeGreaterThanOrEqual(200);
  });

  it("uses unique ids", () => {
    const ids = BULLET_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes nested pair presets", () => {
    const nested = BULLET_PRESETS.filter((p) => p.kind === "nested");
    expect(nested).toHaveLength(10);
    expect(bulletPresetMarker(nested[0]!)).toBe("•");
  });
});
