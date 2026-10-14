/**
 * Draws a State (state.ts) as a small picture of the app: header, toolbar,
 * editor, output panel, footer, a popover and a pointer. The DOM is kept
 * between renders and only what changed is touched, so every change can ease:
 * text that changes cross-fades, the popover's highlight slides between items,
 * the pointer glides to whatever is pressed next.
 */
import { renderSample, uiFont } from "../fonts/uiFonts";
import { outputLines, statsOf, type Popover, type State } from "./state";

const EASE = "cubic-bezier(.2, .8, .2, 1)";

const el = (tag: string, cls: string, text?: string) => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

type Part = { cls: string; text: string };
type Row = { cls: string; parts: Part[] };

export type Mock = { root: HTMLElement; render: (state: State) => void };

export function createMock(parent: HTMLElement, opts: { animate: boolean }): Mock {
  const root = el("div", "mock");
  const bar = el("div", "mock-bar");
  const brand = el("span", "mock-brand");
  brand.append(el("i", "mock-accent", "i"), document.createTextNode("nstastylr"));
  const chipSave = el("span", "mock-chip", "Save");
  const chipMenu = el("span", "mock-chip mock-chip-icon", "≡");
  const barRight = el("span", "mock-bar-right");
  barRight.append(chipSave, el("span", "mock-chip", "Open"), chipMenu);
  bar.append(brand, barRight);

  const toolbar = el("div", "mock-toolbar");
  const btnBold = el("span", "mock-tb mock-tb-bold", "B");
  const btnItalic = el("span", "mock-tb mock-tb-italic", "I");
  const btnMore = el("span", "mock-tb mock-tb-dim", "⋮");
  const fontBtn = el("span", "mock-font");
  const fontPreview = el("span", "mock-font-preview", "Aa");
  const fontLabel = el("span", "mock-font-label", "Serif");
  fontBtn.append(fontPreview, fontLabel, el("span", "mock-font-chev", "⌄"));
  toolbar.append(el("span", "mock-tb mock-tb-dim", "↶"), el("span", "mock-tb mock-tb-dim", "↷"), el("span", "mock-sep"), btnBold, btnItalic, el("span", "mock-sep"), fontBtn, btnMore);

  const editor = el("div", "mock-editor");
  const outHead = el("div", "mock-out-head");
  const copyBtn = el("span", "mock-copy", "Copy");
  outHead.append(el("span", "mock-out-label", "Output"), copyBtn);
  const out = el("div", "mock-out");
  const foot = el("div", "mock-foot");
  const words = el("span", "", "0 words");
  const chars = el("span", "", "0 chars");
  const left = el("span", "mock-left", "");
  foot.append(words, chars, left);

  const pop = el("div", "mock-pop");
  const popHi = el("div", "mock-pop-hi");
  const popBody = el("div", "mock-pop-body");
  pop.append(popHi, popBody);
  const toast = el("div", "mock-toast");
  const cursor = el("div", "mock-cursor");
  const ring = el("span", "mock-cursor-ring");
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.setAttribute("viewBox", "0 0 24 24");
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("d", "M5 3l14 8.5-6.2 1.4L9.6 19z");
  arrow.append(arrowPath);
  cursor.append(ring, arrow);

  root.append(bar, toolbar, editor, outHead, out, foot, pop, toast, cursor);
  parent.append(root);

  let first = true;
  let last: State | null = null;
  let popSig = "";
  let pressed = false;
  const live = () => opts.animate && !first;

  /** Soft cross-fade for a piece of text that just changed. */
  const swap = (node: HTMLElement) => {
    if (!live()) return;
    node.animate(
      [
        { opacity: 0.15, filter: "blur(4px)", transform: "translateY(4px)" },
        { opacity: 1, filter: "blur(0)", transform: "none" },
      ],
      { duration: 520, easing: EASE },
    );
  };
  const setText = (node: HTMLElement, text: string) => {
    if (node.textContent === text) return;
    const old = node.textContent ?? "";
    node.textContent = text;
    // typing (one string growing into the next) shouldn't flicker; anything else eases in
    if (!(text.startsWith(old) || old.startsWith(text))) swap(node);
  };

  /** Bring `container`'s children in line with `rows`, reusing nodes so changes can animate. */
  const sync = (container: HTMLElement, rows: Row[]) => {
    rows.forEach((row, i) => {
      let line = container.children[i] as HTMLElement | undefined;
      if (!line || line.childElementCount !== row.parts.length) {
        const fresh = el("div", row.cls);
        for (const p of row.parts) fresh.append(el("span", p.cls, p.text));
        // same words, only split differently (a selection starting, the caret going): nothing to announce
        const sameText = line?.textContent === fresh.textContent;
        if (line) line.replaceWith(fresh);
        else container.append(fresh);
        if (live() && !sameText) {
          fresh.animate(
            [
              { opacity: 0, transform: "translateY(8px) scale(.98)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 560, easing: EASE },
          );
        }
        return;
      }
      if (line.className !== row.cls) line.className = row.cls;
      row.parts.forEach((p, j) => {
        const part = line!.children[j] as HTMLElement;
        if (part.className !== p.cls) {
          const weightChanged = /\b[bi]\b/.test(part.className) !== /\b[bi]\b/.test(p.cls) || part.className.replace(" sel", "") !== p.cls.replace(" sel", "");
          part.className = p.cls;
          if (weightChanged && part.textContent === p.text) swap(part);
        }
        setText(part, p.text);
      });
    });
    while (container.childElementCount > rows.length) container.lastElementChild!.remove();
  };

  const buildPop = (p: Popover) => {
    popBody.replaceChildren();
    if (p.kind === "fonts") {
      for (const it of p.items) {
        const row = el("div", "mock-pop-item mock-pop-row");
        row.append(el("span", "mock-font-preview", it.id === "more" ? "" : renderSample(it.id, "Aa")), el("span", "", it.label));
        popBody.append(row);
      }
    } else if (p.kind === "bullets") {
      popBody.append(el("div", "mock-pop-title", "Bullet"));
      const grid = el("div", "mock-pop-grid");
      for (const m of p.items) grid.append(el("span", "mock-pop-item mock-swatch", m));
      popBody.append(grid);
    } else if (p.kind === "dividers") {
      popBody.append(el("div", "mock-pop-title", "Divider"));
      for (const d of p.items) popBody.append(el("div", "mock-pop-item mock-pop-row mock-pop-line", d));
    } else {
      popBody.append(el("div", "mock-pop-title", "Saved posts"));
      const row = el("div", "mock-save-row");
      row.append(el("span", "mock-input", p.name), el("span", "mock-save-btn", "Save"));
      popBody.append(row);
    }
  };

  const scaleOf = () => (root.offsetWidth ? root.getBoundingClientRect().width / root.offsetWidth : 1) || 1;

  const targetOf = (key: string): Element | null => {
    const fixed: Record<string, Element> = { bold: btnBold, italic: btnItalic, font: fontBtn, more: btnMore, copy: copyBtn, save: chipSave, menu: chipMenu, left };
    if (fixed[key]) return fixed[key];
    const [kind, a, b] = key.split(":");
    if (kind === "pop") return popBody.querySelectorAll(".mock-pop-item")[Number(a)] ?? null;
    if (kind === "divider") return editor.querySelector(".mock-divider");
    const line = editor.children[Number(a)];
    if (!line) return null;
    if (kind === "bullet") return line.querySelector(".mock-bullet");
    if (kind === "seg") return line.querySelectorAll(".mock-seg")[Number(b)] ?? null;
    return null;
  };

  const render = (state: State) => {
    last = state;
    root.classList.toggle("dark", state.theme !== "light"); // the demos show the app in dark mode unless a state says otherwise
    btnBold.classList.toggle("on", Boolean(state.bold));
    btnItalic.classList.toggle("on", Boolean(state.italic));
    const f = uiFont(state.font);
    setText(fontPreview, f?.preview ?? "Aa");
    setText(fontLabel, f?.label ?? "Serif");
    fontBtn.classList.toggle("open", state.popover?.kind === "fonts");

    // ── editor ──
    sync(
      editor,
      state.lines.map((ln, i): Row => {
        if ("divider" in ln) return { cls: `mock-line mock-divider${ln.selected ? " sel" : ""}`, parts: [{ cls: "mock-dv", text: ln.divider }] };
        const parts: Part[] = [];
        if (ln.bullet) parts.push({ cls: "mock-bullet", text: ln.bullet });
        for (const s of ln.segs) parts.push({ cls: `mock-seg${s.bold ? " b" : ""}${s.italic ? " i" : ""}${s.selected ? " sel" : ""}`, text: s.text });
        if (state.caret && i === state.lines.length - 1) parts.push({ cls: "mock-caret", text: "" });
        return { cls: `mock-line${ln.bullet ? " mock-list" : ""}`, parts };
      }),
    );

    // ── output ──
    const outs = outputLines(state.lines);
    const empty = outs.join("") === "";
    out.classList.toggle("empty", empty);
    sync(out, (empty ? ["Your styled text will appear here…"] : outs).map((t) => ({ cls: "mock-out-line", parts: [{ cls: "mock-out-text", text: t }] })));
    setText(copyBtn, state.copied ? "Copied!" : "Copy");
    copyBtn.classList.toggle("copied", Boolean(state.copied));

    const st = statsOf(state);
    // Counters tick over on every keystroke: change them plainly, like the app does.
    // (Cross-fading each new number made the footer flicker while typing.)
    words.textContent = `${st.words} ${st.words === 1 ? "word" : "words"}`;
    chars.textContent = `${st.chars} chars`;
    left.textContent = st.left;

    // ── popover: content is kept while it fades out; the highlight slides between items ──
    const p = state.popover;
    if (p) {
      const sig = p.kind + ":" + (p.kind === "save" ? p.name : p.items.length);
      const fresh = sig !== popSig || !pop.classList.contains("open");
      if (sig !== popSig) {
        buildPop(p);
        popSig = sig;
      }
      pop.className = `mock-pop open mock-pop-${p.kind}`;
      const items = popBody.querySelectorAll<HTMLElement>(".mock-pop-item");
      const active = p.kind === "save" ? null : items[p.active];
      items.forEach((it, i) => it.classList.toggle("active", p.kind !== "save" && i === p.active));
      if (active) {
        if (fresh) popHi.classList.add("jump"); // first placement: no slide from the last popover's spot
        const r = active.getBoundingClientRect();
        const pr = pop.getBoundingClientRect();
        const k = scaleOf();
        popHi.style.transform = `translate(${(r.left - pr.left) / k - 1}px, ${(r.top - pr.top) / k - 1}px)`;
        popHi.style.width = `${r.width / k}px`;
        popHi.style.height = `${r.height / k}px`;
        popHi.style.opacity = "1";
        if (fresh) {
          void popHi.offsetWidth;
          popHi.classList.remove("jump");
        }
      } else {
        popHi.style.opacity = "0";
      }
    } else {
      pop.classList.remove("open");
    }

    toast.textContent = state.toast ?? toast.textContent;
    toast.classList.toggle("show", Boolean(state.toast));

    // ── pointer ──
    const key = state.cursor ?? "";
    const target = key ? targetOf(key) : null;
    if (target) {
      const r = target.getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      const k = scaleOf();
      const x = (r.left - rr.left + Math.min(r.width / 2, 60)) / k;
      const y = (r.top - rr.top + r.height / 2) / k;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      cursor.classList.add("show");
      if (state.press && !pressed && live()) {
        ring.animate(
          [
            { opacity: 0.8, transform: "translate(-50%, -50%) scale(.3)" },
            { opacity: 0, transform: "translate(-50%, -50%) scale(1.9)" },
          ],
          { duration: 600, easing: "ease-out" },
        );
        arrow.animate([{ transform: "scale(1)" }, { transform: "scale(.8)" }, { transform: "scale(1)" }], { duration: 280, easing: "ease-out" });
      }
    } else {
      cursor.classList.remove("show");
    }
    pressed = Boolean(state.press);
    first = false;
  };

  // Positions (highlight, pointer) are measured: redo them when the layout changes.
  window.addEventListener("resize", () => {
    if (!last) return;
    const was = first;
    first = true; // no animations for a re-layout
    render(last);
    first = was;
  });

  return { root, render };
}
