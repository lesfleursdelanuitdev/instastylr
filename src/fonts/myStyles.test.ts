import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MY_STYLES_MAX,
  addMyStyle,
  defaultStyleName,
  findMyStyle,
  loadMyStyles,
  removeMyStyle,
  renameMyStyle,
  resetMyStylesMemory,
  styleNameProblem,
  type StyleParts,
} from "./myStyles";

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

const KEY = "instastylr.myStyles.v1";
const boldStrike: StyleParts = { font: "sans", bold: true, italic: false, marks: ["strike"] };
const scriptRing: StyleParts = { font: "script", bold: false, italic: false, marks: ["ringAbove"] };

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: mockStorage() };
});
afterEach(() => {
  resetMyStylesMemory();
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("my styles", () => {
  it("starts empty, saves newest first and survives a reload", () => {
    expect(loadMyStyles()).toEqual([]);
    const a = addMyStyle("Sunday post", boldStrike);
    const b = addMyStyle("Bio headline", scriptRing);
    expect(a.ok && b.ok).toBe(true);
    const list = loadMyStyles();
    expect(list.map((s) => s.label)).toEqual(["Bio headline", "Sunday post"]);
    expect(list[1]).toMatchObject({ ...boldStrike, label: "Sunday post" });
    expect(list[0].id).toMatch(/^my-[a-z0-9]+$/);
    expect(list[0].id).not.toBe(list[1].id);
  });

  it("trims names and refuses empty, too long or repeated ones", () => {
    addMyStyle("  Sunday post  ", boldStrike);
    expect(loadMyStyles()[0].label).toBe("Sunday post");
    expect(styleNameProblem("   ", loadMyStyles())).toMatch(/name/i);
    expect(styleNameProblem("x".repeat(41), loadMyStyles())).toMatch(/40/);
    expect(styleNameProblem("sunday POST", loadMyStyles())).toMatch(/already/i);
    expect(addMyStyle("Sunday post", scriptRing).ok).toBe(false);
    expect(loadMyStyles().length).toBe(1);
  });

  it("refuses a second copy of the same look", () => {
    addMyStyle("Sunday post", boldStrike);
    const r = addMyStyle("Other name", { ...boldStrike });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/Sunday post/);
    expect(findMyStyle(loadMyStyles(), boldStrike)?.label).toBe("Sunday post");
    expect(findMyStyle(loadMyStyles(), { ...boldStrike, italic: true })).toBeUndefined();
  });

  it("refuses a plain font with nothing added", () => {
    const r = addMyStyle("Just sans", { font: "sans", bold: false, italic: false, marks: [] });
    expect(r.ok).toBe(false);
    expect(addMyStyle("Bold sans", { font: "sans", bold: true, italic: false, marks: [] }).ok).toBe(true);
  });

  it(`keeps at most ${MY_STYLES_MAX} and says so instead of dropping one`, () => {
    // fill to the cap with distinct looks
    const fonts = ["serif", "sans", "script", "fraktur", "mono", "double"];
    let n = 0;
    outer: for (const font of fonts)
      for (const mark of ["strike", "underline", "overline", "slash", "circle", "square"]) {
        addMyStyle(`S${n}`, { font, bold: false, italic: false, marks: [mark] });
        if (++n === MY_STYLES_MAX) break outer;
      }
    expect(loadMyStyles().length).toBe(MY_STYLES_MAX);
    const r = addMyStyle("One more", { font: "circled", bold: false, italic: false, marks: ["strike"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/delete one/i);
    expect(loadMyStyles().length).toBe(MY_STYLES_MAX);
  });

  it("renames and deletes by id", () => {
    addMyStyle("Sunday post", boldStrike);
    addMyStyle("Bio headline", scriptRing);
    const [bio, sunday] = loadMyStyles();
    expect(renameMyStyle(sunday.id, "Monday post").ok).toBe(true);
    expect(loadMyStyles()[1].label).toBe("Monday post");
    // keeping its own name (in another case) is fine; taking another style's is not
    expect(renameMyStyle(sunday.id, "MONDAY post").ok).toBe(true);
    expect(renameMyStyle(sunday.id, "bio headline").ok).toBe(false);
    removeMyStyle(bio.id);
    expect(loadMyStyles().map((s) => s.label)).toEqual(["MONDAY post"]);
    removeMyStyle("my-nothere");
    expect(loadMyStyles().length).toBe(1);
  });

  it("drops junk and unknown fonts or marks from storage", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([
        { id: "my-a1", label: "Good", font: "sans", bold: true, italic: false, marks: ["strike", "nope"] },
        { id: "my-a2", label: "Bad font", font: "comic-sans", bold: false, italic: false, marks: [] },
        { id: "evil", label: "Bad id", font: "sans", bold: false, italic: false, marks: [] },
        { id: "my-a3", label: "", font: "sans", bold: true, italic: false, marks: [] },
        "junk",
        null,
      ]),
    );
    expect(loadMyStyles()).toEqual([
      { id: "my-a1", label: "Good", font: "sans", bold: true, italic: false, marks: ["strike"] },
    ]);
    window.localStorage.setItem(KEY, "{not json");
    expect(loadMyStyles()).toEqual([]);
  });

  it("works (in memory for this visit) when storage throws", () => {
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(loadMyStyles()).toEqual([]);
    const r = addMyStyle("Sunday post", boldStrike);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.styles.length).toBe(1);
  });

  it("suggests a name from the look", () => {
    expect(defaultStyleName(boldStrike)).toBe("Sans-Serif Bold + Strike");
    expect(defaultStyleName({ font: "serif", bold: true, italic: true, marks: [] })).toBe("Serif Bold Italic");
    expect(defaultStyleName({ font: "script", bold: false, italic: false, marks: ["ringAbove", "underline"] })).toBe(
      "Script + Ring + Underline",
    );
  });
});
