import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RECENT_FONTS_MAX, loadRecentFonts, recordFontUse } from "./recent";

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: mockStorage() };
});
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("recent fonts", () => {
  it("starts empty and remembers uses newest first, without duplicates", () => {
    expect(loadRecentFonts()).toEqual([]);
    recordFontUse("mono");
    recordFontUse("currency");
    recordFontUse("mono");
    expect(loadRecentFonts()).toEqual(["mono", "currency"]);
  });

  it("keeps only the last ten", () => {
    for (let i = 0; i < 14; i++) recordFontUse(`f${i}`);
    const r = loadRecentFonts();
    expect(r.length).toBe(RECENT_FONTS_MAX);
    expect(r[0]).toBe("f13");
    expect(r[9]).toBe("f4");
  });

  it("ignores junk in storage", () => {
    window.localStorage.setItem("instastylr.recentFonts.v1", '{"not":"a list"}');
    expect(loadRecentFonts()).toEqual([]);
    window.localStorage.setItem("instastylr.recentFonts.v1", '["mono", 3, null, "tiny"]');
    expect(loadRecentFonts()).toEqual(["mono", "tiny"]);
  });
});
