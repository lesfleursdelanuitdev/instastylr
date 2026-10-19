import { describe, expect, it } from "vitest";
import {
  PANEL_FONTS,
  filterFonts,
  menuMyStyles,
  menuRecentFonts,
  panelFonts,
  renderUiFont,
  stylePreset,
  uiFont,
} from "./uiFonts";
import { transformRun } from "./transform";
import type { MyStyle } from "./myStyles";

const sunday: MyStyle = { id: "my-sun", label: "Sunday post", font: "sans", bold: true, italic: false, marks: ["strike"] };
const bio: MyStyle = { id: "my-bio", label: "Bio headline", font: "script", bold: false, italic: false, marks: [] };

describe("my styles in the font lists", () => {
  it("are found by id alongside the built-in presets", () => {
    expect(stylePreset("my-sun", [sunday])).toEqual(sunday);
    expect(stylePreset("my-sun")).toBeUndefined();
    expect(stylePreset("glyphy-all-circles", [sunday])?.font).toBe("serif");
    expect(uiFont("my-sun", [sunday])).toMatchObject({ id: "my-sun", label: "Sunday post", mine: true });
    expect(uiFont("serif", [sunday])?.label).toBe("Serif");
  });

  it("preview in their own look", () => {
    const f = uiFont("my-sun", [sunday])!;
    const want = transformRun({ text: "Aa", fontId: "sans", bold: true, italic: false, marks: ["strike"] });
    expect(f.preview).toBe(want);
    expect(renderUiFont(f, "Aa")).toBe(want);
    // a plain font row still takes the selection's bold/italic
    expect(renderUiFont(uiFont("sans")!, "Aa", true)).toBe(transformRun({ text: "Aa", fontId: "sans", bold: true, italic: false }));
  });

  it("come first in the panel, and have a Mine filter of their own", () => {
    const all = panelFonts([sunday, bio]);
    expect(all.length).toBe(PANEL_FONTS.length + 2);
    expect(all.slice(0, 2).map((f) => f.id)).toEqual(["my-sun", "my-bio"]);
    expect(filterFonts(all, { style: "mine", feature: "any" }).map((f) => f.id)).toEqual(["my-sun", "my-bio"]);
    expect(filterFonts(all, { style: "all", feature: "any" }).length).toBe(all.length);
    // recent can hold a style's id
    expect(filterFonts(all, { style: "recent", feature: "any", recent: ["my-bio", "gone"] }).map((f) => f.id)).toEqual(["my-bio"]);
  });

  it("head the toolbar menu, and aren't repeated in its Recent group", () => {
    const mine = [sunday, bio];
    expect(menuMyStyles(mine).map((f) => f.id)).toEqual(["my-sun", "my-bio"]);
    expect(menuRecentFonts(["my-bio", "mono", "serif", "my-gone"], mine).map((f) => f.id)).toEqual(["mono"]);
    const many = Array.from({ length: 8 }, (_, i) => ({ ...sunday, id: `my-s${i}`, label: `S${i}` }));
    expect(menuMyStyles(many).length).toBe(5);
    // a style past the menu's five can still show as recent
    expect(menuRecentFonts(["my-s7"], many).map((f) => f.id)).toEqual(["my-s7"]);
  });
});
