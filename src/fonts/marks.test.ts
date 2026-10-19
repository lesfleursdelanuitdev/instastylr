import { describe, it, expect } from "vitest";
import glyphyRaw from "../../scripts/font-scrape/glyphy.raw.json?raw";
import { MARKS, MAX_MARKS, cleanMarks, markById, marksMayNotShow } from "./marks";
import { transformRun } from "./transform";
import { FONTS, supportsBold, supportsItalic } from "./mappings";
import { STYLE_PRESETS } from "./scraped/presets";
import { PANEL_FONTS, PRESET_UI_FONTS, filterFonts, fontLabel, renderSample, stylePreset, uiFont } from "./uiFonts";
import { marksFromStyle, marksStyleValue, parseMarks } from "../editor/fontStyle";

const run = (text: string, fontId: string, marks: string[], bold = false, italic = false) =>
  transformRun({ text, fontId, bold, italic, marks });

describe("marks", () => {
  it("are single combining code points with unique ids", () => {
    expect(new Set(MARKS.map((m) => m.id)).size).toBe(MARKS.length);
    expect(new Set(MARKS.map((m) => m.char)).size).toBe(MARKS.length);
    for (const m of MARKS) {
      expect([...m.char]).toHaveLength(1);
      expect(m.char).toMatch(/^\p{M}$/u);
    }
  });

  it("go after every character, in order, but not on spaces", () => {
    expect(run("Hi you", "serif", ["strike"])).toBe("H̶i̶ y̶o̶u̶");
    expect(run("ab", "serif", ["strike", "underline"])).toBe("a̶̲b̶̲");
    expect(run("a\tb\nc", "serif", ["slash"])).toBe("a̸\tb̸\nc̸");
  });

  it("sit on top of the font's own substitute", () => {
    expect(run("Ab", "mono", ["strike"])).toBe("𝙰̶𝚋̶");
    expect(run("A", "serif", ["underline"], true, true)).toBe("𝑨̲");
  });

  it("treat an emoji or an accented letter as one character", () => {
    expect(run("👍🏽", "serif", ["strike"])).toBe("👍🏽̶");
    expect(run("é", "serif", ["strike"])).toBe("é̶");
  });

  it("no marks = exactly the old output", () => {
    expect(run("Hello 123", "sans", [])).toBe(transformRun({ text: "Hello 123", fontId: "sans", bold: false, italic: false }));
  });

  it("clean: known ids only, no repeats, at most three", () => {
    expect(cleanMarks(["strike", "nope", "strike", "underline", "slash", "circle"])).toEqual(["strike", "underline", "slash"]);
    expect(MAX_MARKS).toBe(3);
    expect(marksMayNotShow(["strike"])).toBe(false);
    expect(marksMayNotShow(["strike", "circle"])).toBe(true);
  });

  it("are stored in the node style and read back", () => {
    expect(marksStyleValue(["strike", "underline"])).toBe("strike,underline");
    expect(marksStyleValue([])).toBeNull();
    expect(marksFromStyle("--ist-font: mono;--ist-marks: strike,underline;")).toEqual(["strike", "underline"]);
    expect(marksFromStyle("--ist-font: mono;")).toEqual([]);
    expect(marksFromStyle("--ist-marks: none;")).toEqual([]);
    expect(parseMarks(" slash , bogus ")).toEqual(["slash"]);
  });
});

describe("presets (one of our fonts + marks, under a site's name)", () => {
  it("point at real fonts and marks, with bold/italic the font has", () => {
    expect(STYLE_PRESETS.length).toBeGreaterThan(50);
    const fontIds = new Set(FONTS.map((f) => f.id));
    for (const p of STYLE_PRESETS) {
      expect(fontIds.has(p.font)).toBe(true);
      for (const m of p.marks) expect(markById(m)).toBeDefined();
      expect(p.marks.length).toBeGreaterThan(0);
      expect(p.marks.length).toBeLessThanOrEqual(MAX_MARKS);
      if (p.bold) expect(supportsBold(p.font)).toBe(true);
      if (p.italic) expect(supportsItalic(p.font)).toBe(true);
    }
  });

  it("have ids no font uses, and show in the panel's Marked group", () => {
    const ids = PANEL_FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const marked = filterFonts(PANEL_FONTS, { style: "marked", feature: "any" }).map((f) => f.id);
    for (const p of PRESET_UI_FONTS) expect(marked).toContain(p.id);
    expect(fontLabel("glyphy-silicon-strikes")).toBe("Silicon Strikes");
    expect(uiFont("glyphy-silicon-strikes")?.preset?.font).toBe("mono");
  });

  it("render what the site produced (spaces aside)", () => {
    const raw = JSON.parse(glyphyRaw);
    const page = raw.pages[0];
    let checked = 0;
    for (const p of STYLE_PRESETS.filter((x) => x.id.startsWith("glyphy-"))) {
      const i = page.names.indexOf(p.label);
      if (i < 0) continue;
      // Letters only: where Unicode has no digits for a style, the site borrows
      // another style's and we leave them plain. The site also puts a space after
      // each enclosed letter; marks never go on spaces here.
      const letters = raw.input.slice(0, 52);
      const site = [...letters].map((c) => page.perChar[c][i]).join("").replace(/\s/gu, "");
      expect(renderSample(p.id, letters)).toBe(site);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("stylePreset finds one by id, and only presets", () => {
    expect(stylePreset("glyphy-gulls")?.marks).toEqual(["seagull"]);
    expect(stylePreset("mono")).toBeUndefined();
  });
});

describe("small caps", () => {
  it("Small Caps keeps capitals and shrinks the rest; All Small Caps shrinks everything", () => {
    expect(transformRun({ text: "Hello World", fontId: "smallCaps", bold: false, italic: false })).toBe("Hᴇʟʟᴏ Wᴏʀʟᴅ");
    expect(transformRun({ text: "Hello World", fontId: "tiny", bold: false, italic: false })).toBe("ʜᴇʟʟᴏ ᴡᴏʀʟᴅ");
    expect(fontLabel("tiny")).toBe("All Small Caps");
    expect(fontLabel("smallCaps")).toBe("Small Caps");
  });

  it("Q is filled with ǫ in both", () => {
    expect(transformRun({ text: "Qq", fontId: "tiny", bold: false, italic: false })).toBe("ǫǫ");
    expect(transformRun({ text: "Qq", fontId: "smallCaps", bold: false, italic: false })).toBe("Qǫ");
  });

  it("sit next to each other in the Small group", () => {
    const small = filterFonts(PANEL_FONTS, { style: "small", feature: "any" }).map((f) => f.id);
    expect(small.indexOf("tiny") - small.indexOf("smallCaps")).toBe(1);
  });
});

describe("the font count in the page copy", () => {
  it("matches what the font panel offers (fonts + presets)", async () => {
    const landing = (await import("../../index.html?raw")).default;
    const styling = (await import("../../learn/styling/index.html?raw")).default;
    const n = PANEL_FONTS.length;
    expect(landing).toContain(`data-count="${n}">${n}<`);
    for (const page of [landing, styling]) {
      expect(page).toContain(`${n} fonts`);
      expect(page).not.toMatch(new RegExp(`\\b(?!${n}\\b)\\d+ fonts`));
    }
  });
});
