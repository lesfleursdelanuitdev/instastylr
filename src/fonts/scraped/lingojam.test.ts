import { describe, it, expect } from "vitest";
import { LINGOJAM_FONTS } from "./lingojam";
import { BASE_FONTS, FONTS, supportsBold, supportsItalic } from "../mappings";
import { transformRun } from "../transform";
import { ALL_UI_FONTS, QUICK_FONTS, filterFonts, fontLabel } from "../uiFonts";
import { isKnownFont } from "../../editor/fontStyle";

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const ALNUM = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];

describe("scraped LingoJam fonts", () => {
  it("are registered after the base fonts, with unique ids", () => {
    const ids = FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(FONTS.length).toBe(BASE_FONTS.length + LINGOJAM_FONTS.length);
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
    for (const f of LINGOJAM_FONTS) {
      expect(isKnownFont(f.id)).toBe(true);
      expect(fontLabel(f.id)).toBe(f.label);
    }
  });

  it("stay out of the toolbar's short list and the bold/italic filters", () => {
    expect(QUICK_FONTS.map((f) => f.id)).toEqual(["serif", "sans", "script", "fraktur"]);
    expect(filterFonts(ALL_UI_FONTS, "all").length).toBe(FONTS.length);
    expect(filterFonts(ALL_UI_FONTS, "bold").map((f) => f.id)).toEqual(["serif", "sans", "script", "fraktur"]);
    expect(filterFonts(ALL_UI_FONTS, "italic").map((f) => f.id)).toEqual(["serif", "sans"]);
    expect(filterFonts(ALL_UI_FONTS, "boldItalic").map((f) => f.id)).toEqual(["serif", "sans"]);
  });

  for (const font of LINGOJAM_FONTS) {
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
