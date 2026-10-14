import { describe, expect, it } from "vitest";
import { DEMOS, heroFrames, stylesDemo, bulletsDemo, dividersDemo, savesDemo } from "./demos";
import { outputOf, statsOf } from "./state";

describe("demos", () => {
  it("every step of every demo renders, and the output comes from the real engine", () => {
    for (const [name, demo] of Object.entries(DEMOS)) {
      for (let s = 0; s < demo.steps; s++) {
        const state = demo.at(s);
        expect(state.lines.length, `${name} step ${s}`).toBeGreaterThan(0);
        expect(outputOf(state.lines).length).toBeGreaterThan(0);
        expect(statsOf(state).left).toMatch(/left for/);
      }
    }
  });
  it("styles: plain → bold → italic → Script → Gothic → Currency", () => {
    expect(outputOf(stylesDemo.at(0).lines)).toContain("Golden hour in Lisbon");
    expect(outputOf(stylesDemo.at(2).lines)).toContain("𝐆𝐨𝐥𝐝𝐞𝐧 𝐡𝐨𝐮𝐫");
    expect(outputOf(stylesDemo.at(3).lines)).toContain("𝑖𝑛 𝐿𝑖𝑠𝑏𝑜𝑛");
    expect(stylesDemo.at(4).popover?.kind).toBe("fonts");
    expect(outputOf(stylesDemo.at(5).lines)).toContain("𝓖𝓸𝓵𝓭𝓮𝓷"); // bold carries over: Script has a bold
    expect(stylesDemo.at(4).lines.flatMap((l) => ("segs" in l ? l.segs : [])).every((s) => s.selected)).toBe(true); // all selected before the font menu
    expect(stylesDemo.at(7).font).toBe("currency");
    expect(stylesDemo.at(8).copied).toBe(true);
    expect(stylesDemo.at(5).cursor).toBe("pop:2");
  });
  it("bullets: lines become a list and the marker changes", () => {
    expect(outputOf(bulletsDemo.at(0).lines)).not.toContain("•");
    expect(outputOf(bulletsDemo.at(1).lines)).toContain("• camera");
    expect(outputOf(bulletsDemo.at(3).lines)).toContain("✿ camera");
    expect(outputOf(bulletsDemo.at(4).lines)).toContain("➤ camera");
    expect(outputOf(bulletsDemo.at(6).lines)).toContain("★ camera");
  });
  it("dividers: a divider appears and cycles through presets", () => {
    const lines = (s: number) => dividersDemo.at(s).lines;
    expect(lines(0).some((l) => "divider" in l)).toBe(false);
    expect(lines(1).some((l) => "divider" in l)).toBe(true);
    const d = (s: number) => lines(s).find((l) => "divider" in l) as { divider: string };
    expect(new Set([d(1).divider, d(3).divider, d(4).divider, d(5).divider]).size).toBe(4);
  });
  it("saves: save prompt, toast, platform switch, dark mode", () => {
    expect(savesDemo.at(1).popover?.kind).toBe("save");
    expect(savesDemo.at(2).toast).toContain("Saved");
    expect(statsOf(savesDemo.at(3)).left).toContain("IG");
    expect(statsOf(savesDemo.at(4)).left).not.toContain("IG");
    expect(Object.values(DEMOS).every((d) => Array.from({ length: d.steps }, (_, s) => d.at(s)).every((st) => st.theme !== "light"))).toBe(true); // all dark
    expect(savesDemo.at(5).cursor).toBe("menu");
  });
  it("hero: types the caption, then styles it, ends copied", () => {
    const f = heroFrames();
    expect(f.length).toBeGreaterThan(25);
    expect(f.every((x) => x.hold > 0)).toBe(true);
    const last = f[f.length - 1].state;
    expect(last.copied).toBe(true);
    expect(outputOf(last.lines)).toContain("🌅");
  });
  it("hero: nothing changes until the pointer has arrived and pressed", () => {
    const f = heroFrames();
    const sig = (st: (typeof f)[number]["state"]) => JSON.stringify({ ...st, cursor: undefined, press: undefined });
    const presses = f.map((x, i) => ({ x, i })).filter(({ x }) => x.state.press);
    expect(presses.length).toBe(7); // select, B, I, select, font menu, Script, Copy
    for (const { x, i } of presses) {
      const travel = f[i - 1];
      // the frame before a press: pointer already on the same control, not pressing, long enough to get there…
      expect(travel.state.cursor).toBe(x.state.cursor);
      expect(travel.state.press).toBeFalsy();
      expect(travel.hold).toBeGreaterThanOrEqual(900);
      // …and everything else exactly as it was before the pointer set off
      if (i >= 2) expect(sig(travel.state)).toBe(sig(f[i - 2].state));
      // the press is the frame where something actually changes
      expect(sig(x.state)).not.toBe(sig(travel.state));
    }
    // bold is never on before the press on B; italic never before the press on I
    const bAt = f.findIndex((x) => x.state.press && x.state.cursor === "bold");
    const iAt = f.findIndex((x) => x.state.press && x.state.cursor === "italic");
    expect(f.slice(0, bAt).some((x) => outputOf(x.state.lines).includes("𝐆"))).toBe(false);
    expect(outputOf(f[bAt].state.lines)).toContain("𝐆𝐨𝐥𝐝𝐞𝐧 𝐡𝐨𝐮𝐫");
    expect(f.slice(0, iAt).some((x) => outputOf(x.state.lines).includes("𝑮"))).toBe(false);
    expect(outputOf(f[iAt].state.lines)).toContain("𝑮𝒐𝒍𝒅𝒆𝒏 𝒉𝒐𝒖𝒓"); // bold italic
    // Script lands on "in Lisbon" only: "Golden hour" keeps its bold italic serif
    const sAt = f.findIndex((x) => x.state.press && x.state.cursor === "pop:2");
    expect(outputOf(f[sAt].state.lines)).toBe("𝑮𝒐𝒍𝒅𝒆𝒏 𝒉𝒐𝒖𝒓 𝒾𝓃 ℒ𝒾𝓈𝒷ℴ𝓃");
  });

  /** Between two moments, any piece of text whose style changed must have been selected (as in the app). */
  const onlySelectedChanges = (states: import("./state").State[]) => {
    const segs = (st: import("./state").State) => st.lines.flatMap((l) => ("segs" in l ? l.segs : []));
    const look = (s: import("./state").Seg) => `${s.font ?? "serif"}|${Boolean(s.bold)}|${Boolean(s.italic)}`;
    for (let i = 1; i < states.length; i++) {
      const before = segs(states[i - 1]);
      const after = segs(states[i]);
      if (before.length !== after.length) continue; // text was typed or split: nothing restyled
      after.forEach((s, j) => {
        if (look(s) !== look(before[j]) && s.text.trim())
          expect(s.selected || before[j].selected, `"${s.text}" restyled without being selected (moment ${i})`).toBe(true);
      });
    }
  };
  it("hero: only selected words ever change style", () => onlySelectedChanges(heroFrames().map((f) => f.state)));
  it("stills: only selected words ever change style", () => {
    for (const d of Object.values(DEMOS)) onlySelectedChanges(Array.from({ length: d.steps }, (_, s) => d.at(s)));
  });
});
