/**
 * The demos. Only the hero is animated: a looping film of a caption being
 * written. The four feature sequences are sets of stills, shown one at a time
 * as pictures on the landing page's sections and beside each tutorial step.
 * All of it is pure data built from States (state.ts), so it can be
 * unit-tested without a browser.
 */
import { DIVIDER_PRESETS } from "../editor/divider/presets";
import { type Line, type Seg, type State } from "./state";

export type Demo = { steps: number; at: (step: number) => State };
export type Frame = { state: State; hold: number };

const seg = (text: string, extra: Partial<Seg> = {}): Seg => ({ text, ...extra });
const line = (...segs: Seg[]): Line => ({ segs });
const FONT_MENU = [
  { id: "serif", label: "Serif" },
  { id: "sans", label: "Sans-Serif" },
  { id: "script", label: "Script" },
  { id: "fraktur", label: "Gothic" },
  { id: "more", label: "More fonts…" },
];

// ── Section 1: bold, italic, fonts ──────────────────────────────────
export const stylesDemo: Demo = {
  steps: 9,
  at(step) {
    const font = step >= 7 ? "currency" : step >= 6 ? "fraktur" : step >= 5 ? "script" : "serif";
    const first: Seg = { text: "Golden hour", bold: step >= 2, selected: step === 1 || step === 2, font };
    const mid: Seg = { text: " ", font };
    const last: Seg = { text: "in Lisbon", italic: step >= 3, selected: step === 3, font };
    const menuOpen = step >= 4 && step <= 7;
    const cursor = ["", "seg:0:0", "bold", "italic", "font", "pop:2", "pop:3", "pop:4", "copy"][step] || undefined;
    return {
      lines: [line(first, mid, last), line(seg("#travel #portugal", { font }))],
      caret: step === 0,
      bold: step === 2,
      italic: step === 3,
      font,
      popover: menuOpen ? { kind: "fonts", items: FONT_MENU, active: step <= 4 ? 0 : step - 3 } : null,
      cursor,
      copied: step === 8,
    };
  },
};

// ── Section 2: lists and bullets ────────────────────────────────────
const BULLETS = ["•", "✿", "➤", "◆", "★", "→"];
export const bulletsDemo: Demo = {
  steps: 7,
  at(step) {
    const active = [0, 0, 0, 1, 2, 4, 4][step];
    const items = ["camera + 35mm", "two rolls of film", "sunscreen"];
    return {
      lines: [
        line(seg("Packing for Porto", { bold: true })),
        ...items.map((t) => (step >= 1 ? { segs: [seg(t)], bullet: BULLETS[active] } : line(seg(t)))),
      ],
      caret: step === 0,
      font: "serif",
      popover: step >= 2 && step <= 5 ? { kind: "bullets", items: BULLETS, active } : null,
      cursor: ["", "more", "bullet:1", "pop:1", "pop:2", "pop:4", "copy"][step] || undefined,
      copied: step === 6,
    };
  },
};

// ── Section 3: dividers ─────────────────────────────────────────────
const DIVIDER_LINES = [
  "━━━━━━━━━━",
  DIVIDER_PRESETS.find((p) => p.id.startsWith("spaced"))?.line ?? "─ ─ ─ ─ ─ ─",
  DIVIDER_PRESETS.find((p) => p.category === "accent")?.line ?? "✦ ✦ ✦ ✦ ✦",
  DIVIDER_PRESETS.find((p) => p.category === "frames")?.line ?? "╔══════════╗",
];
export const dividersDemo: Demo = {
  steps: 7,
  at(step) {
    const which = [0, 0, 0, 1, 2, 3, 3][step];
    const lines: Line[] = [line(seg("Day one: the river", { bold: true }))];
    if (step >= 1) lines.push({ divider: DIVIDER_LINES[which], selected: step >= 2 && step <= 5 });
    lines.push(line(seg("Day two: the hills", { bold: true })));
    return {
      lines,
      caret: step === 0,
      font: "serif",
      popover: step >= 2 && step <= 5 ? { kind: "dividers", items: DIVIDER_LINES, active: which } : null,
      cursor: ["", "more", "divider", "pop:1", "pop:2", "pop:3", "copy"][step] || undefined,
      copied: step === 6,
    };
  },
};

// ── Section 4: saves, counter, dark mode ────────────────────────────
export const savesDemo: Demo = {
  steps: 6,
  at(step) {
    return {
      lines: [line(seg("Lisbon, day three", { bold: true, font: "script" })), line(seg("Pastel de nata count: 7 and rising."))],
      font: "serif",
      popover: step === 1 ? { kind: "save", name: "Lisbon post" } : null,
      toast: step === 2 ? "Saved “Lisbon post”" : undefined,
      platform: step >= 4 ? "youtube" : "instagram",
      // every picture is in dark mode; the last step points at the menu that leads to the setting
      cursor: ["", "save", "save", "left", "left", "menu"][step] || undefined,
    };
  },
};

export const DEMOS: Record<string, Demo> = {
  styles: stylesDemo,
  bullets: bulletsDemo,
  dividers: dividersDemo,
  saves: savesDemo,
};

// ── Hero: a looping film of a caption being written ─────────────────
// Every action is two beats: the pointer travels to the control (nothing else
// changes), then it presses and the effect lands. TRAVEL has to outlast the
// pointer's glide in mock.ts/landing.css (0.7s) or the effect would come first.
const HERO_TEXT = "Golden hour in Lisbon";
const TRAVEL = 950;
export function heroFrames(): Frame[] {
  const frames: Frame[] = [];
  const base = (segs: Seg[], extra: Partial<State> = {}): State => ({ lines: [{ segs }], font: "serif", ...extra });
  const push = (state: State, hold: number) => frames.push({ state, hold });
  /** Glide to `cursor` over `before`, then press: `after` is what the press does. */
  const act = (cursor: string, before: State, after: State, hold: number) => {
    push({ ...before, cursor }, TRAVEL);
    push({ ...after, cursor, press: true }, hold);
  };

  push(base([seg("")], { caret: true }), 900);
  for (let i = 1; i <= HERO_TEXT.length; i++) {
    // a human rhythm: a beat after spaces, quicker inside words
    const ch = HERO_TEXT[i - 1];
    push(base([seg(HERO_TEXT.slice(0, i))], { caret: true }), ch === " " ? 190 : 85 + ((i * 37) % 60));
  }
  const [a, b] = ["Golden hour", " in Lisbon"];
  const plain = base([seg(a), seg(b)], { caret: true });
  push(plain, 900);

  const selA = base([seg(a, { selected: true }), seg(b)]);
  const boldA = base([seg(a, { bold: true, selected: true }), seg(b)], { bold: true });
  const selB = base([seg(a, { bold: true }), seg(b, { selected: true })]);
  const italB = base([seg(a, { bold: true }), seg(b, { italic: true, selected: true })], { italic: true });
  const styled = base([seg(a, { bold: true }), seg(b, { italic: true })]);
  const menu = (active: number): State => ({ ...styled, popover: { kind: "fonts", items: FONT_MENU, active } });
  const scriptSegs = [seg(a, { bold: true, font: "script" }), seg(b, { italic: true, font: "script" })];
  const script = base(scriptSegs, { font: "script" });
  const withEmoji = base([...scriptSegs, seg(" 🌅", { font: "script" })], { font: "script" });

  act("seg:0:0", plain, selA, 900); // select "Golden hour"
  act("bold", selA, boldA, 1400); // press B → it turns bold
  act("seg:0:1", boldA, selB, 900); // select "in Lisbon"
  act("italic", selB, italB, 1400); // press I → it turns italic
  act("font", italB, menu(0), 1000); // open the font menu
  act("pop:2", menu(0), { ...script, popover: { kind: "fonts", items: FONT_MENU, active: 2 } }, 1300); // choose Script
  push(script, 700);
  push({ ...withEmoji, caret: true }, 1300);
  act("copy", { ...withEmoji, caret: true }, { ...withEmoji, copied: true }, 2600); // press Copy
  return frames;
}
