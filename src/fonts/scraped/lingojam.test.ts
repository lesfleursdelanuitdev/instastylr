import { describe, it, expect } from "vitest";
import { LINGOJAM_FONTS } from "./lingojam";
import { BASE_FONTS, FONTS, SCRAPED_FONTS, supportsBold, supportsItalic } from "../mappings";
import { transformRun } from "../transform";
import { ALL_UI_FONTS, FONT_STYLES, QUICK_FONTS, filterFonts, fontLabel, menuRecentFonts, renderSample } from "../uiFonts";
import { isKnownFont } from "../../editor/fontStyle";

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const ALNUM = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];

describe("scraped LingoJam fonts", () => {
  it("are registered after the base fonts, with unique ids", () => {
    const ids = FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    // every site's fonts, plus Small Caps (built from LingoJam's "tiny")
    expect(FONTS.length).toBe(BASE_FONTS.length + SCRAPED_FONTS.length + 1);
    expect(LINGOJAM_FONTS.length).toBeGreaterThan(0);
  });

  it("apply their table and pass everything else through", () => {
    expect(transformRun({ text: "Hello, 12!", fontId: "currency", bold: false, italic: false })).toBe("ⱧɆⱠⱠØ, 12!");
    expect(transformRun({ text: "Hi", fontId: "underline", bold: false, italic: false })).toBe("H̲i̲");
  });

  it("have no bold or italic, so the toolbar disables both", () => {
    for (const f of LINGOJAM_FONTS) {
      expect(supportsBold(f.id)).toBe(false);
      expect(supportsItalic(f.id)).toBe(false);
      // B/I on must not change the result
      const plain = transformRun({ text: "Ab1", fontId: f.id, bold: false, italic: false });
      expect(transformRun({ text: "Ab1", fontId: f.id, bold: true, italic: true })).toBe(plain);
    }
  });

  it("are known to the editor and the font picker", () => {
    expect(ALL_UI_FONTS.map((f) => f.id)).toEqual(FONTS.map((f) => f.id));
    for (const f of SCRAPED_FONTS) {
      expect(isKnownFont(f.id)).toBe(true);
      // the site's name, except where the panel has a clearer one
      expect(fontLabel(f.id)).toBe(f.id === "tiny" ? "All Small Caps" : f.label);
    }
  });

  it("stay out of the toolbar's short list and the bold/italic filters", () => {
    expect(QUICK_FONTS.map((f) => f.id)).toEqual(["serif", "sans", "script", "fraktur"]);
    const all = { style: "all" as const, feature: "any" as const };
    expect(filterFonts(ALL_UI_FONTS, all).length).toBe(FONTS.length);
    expect(filterFonts(ALL_UI_FONTS, { ...all, feature: "bold" }).map((f) => f.id)).toEqual(["serif", "sans", "script", "fraktur"]);
    expect(filterFonts(ALL_UI_FONTS, { ...all, feature: "italic" }).map((f) => f.id)).toEqual(["serif", "sans"]);
    expect(filterFonts(ALL_UI_FONTS, { ...all, feature: "boldItalic" }).map((f) => f.id)).toEqual(["serif", "sans"]);
  });

  it("every font has a style, every style has a font, and the two filters combine", () => {
    const all = { style: "all" as const, feature: "any" as const };
    for (const s of FONT_STYLES) expect(filterFonts(ALL_UI_FONTS, { ...all, style: s.id }).length).toBeGreaterThan(0);
    expect(FONT_STYLES.reduce((n, s) => n + filterFonts(ALL_UI_FONTS, { ...all, style: s.id }).length, 0)).toBe(FONTS.length);
    expect(filterFonts(ALL_UI_FONTS, { style: "script", feature: "any" }).map((f) => f.id)).toEqual(["script"]);
    expect(filterFonts(ALL_UI_FONTS, { style: "boxed", feature: "bold" })).toEqual([]);
    expect(filterFonts(ALL_UI_FONTS, { style: "classic", feature: "italic" }).map((f) => f.id)).toEqual(["serif", "sans"]);
  });

  it("recent: the panel filter keeps recency order; the menu skips the short list and caps at five", () => {
    const recent = ["currency", "serif", "tiny", "nope", "mono", "script", "neon", "greek", "symbols", "double"];
    expect(filterFonts(ALL_UI_FONTS, { style: "recent", feature: "any", recent }).map((f) => f.id)).toEqual([
      "currency", "serif", "tiny", "mono", "script", "neon", "greek", "symbols", "double",
    ]);
    expect(filterFonts(ALL_UI_FONTS, { style: "recent", feature: "bold", recent }).map((f) => f.id)).toEqual(["serif", "script"]);
    expect(filterFonts(ALL_UI_FONTS, { style: "recent", feature: "any" })).toEqual([]);
    expect(menuRecentFonts(recent).map((f) => f.id)).toEqual(["currency", "tiny", "mono", "neon", "greek"]);
    expect(menuRecentFonts([])).toEqual([]);
  });

  it("renders a sample in a font, with bold/italic only where the font has them", () => {
    expect(renderSample("currency", "Hello")).toBe("ⱧɆⱠⱠØ");
    expect(renderSample("serif", "Hi", true, false)).toBe("𝐇𝐢");
    expect(renderSample("currency", "Hi", true, true)).toBe(renderSample("currency", "Hi"));
  });

  for (const font of SCRAPED_FONTS) {
    it(`${font.id}: only A-Z a-z 0-9 keys, real non-empty values, and it changes something`, () => {
      const keys = Object.keys(font.map);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(ALNUM).toContain(key);
        const value = font.map[key];
        expect(value).not.toBe("");
        expect(value).not.toBe(key); // identity entries are left out by the generator
        expect(value).not.toMatch(LONE_SURROGATE);
        expect(value).not.toContain("�");
        expect(value).not.toMatch(/[\n\r]/);
      }
    });
  }
});
