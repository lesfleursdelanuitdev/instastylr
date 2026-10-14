import { heroFrames } from "./demos";
import { createMock } from "./mock";
import { bootChrome } from "./chrome";
import { mountShots } from "./shots";
import { lineText, outputLines, type Line } from "./state";

const { reduced } = bootChrome();
mountShots();

// ── The same caption twice: as plain text, and as InstaStylr would hand it over ──
const CAPTION: Line[] = [
  { segs: [{ text: "New in the shop", bold: true }] },
  { divider: "─── ✦ ───" },
  { segs: [{ text: "Three prints from the night garden:" }] },
  { segs: [{ text: "Dahlias, pink" }], bullet: "✿" },
  { segs: [{ text: "Iris, violet" }], bullet: "✿" },
  { segs: [{ text: "Water lilies" }], bullet: "✿" },
  { divider: "─── ✦ ───" },
  { segs: [{ text: "Free shipping this week.", italic: true }] },
];
// what a platform leaves of a formatted paste: the words, nothing else
const PLAIN = CAPTION.filter((l): l is Extract<Line, { segs: unknown }> => "segs" in l).map((l) => lineText(l));
document.querySelectorAll<HTMLElement>("[data-caption]").forEach((el) => {
  el.textContent = (el.dataset.caption === "styled" ? outputLines(CAPTION) : PLAIN).join("\n");
});

// ── The facts row: numbers count to their value when the row comes into view ──
const facts = document.querySelector<HTMLElement>(".facts");
if (facts) {
  const run = () => {
    facts.classList.add("in");
    if (reduced) return; // the final numbers are already in the HTML
    facts.querySelectorAll<HTMLElement>("b[data-count]").forEach((el, i) => {
      const to = Number(el.dataset.count);
      const from = Number(el.dataset.from ?? 0);
      const suffix = el.dataset.suffix ?? "";
      const t0 = performance.now() + i * 120;
      const dur = 1400;
      const step = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - t0) / dur));
        const eased = 1 - (1 - t) ** 3; // fast, then settling
        el.textContent = Math.round(from + (to - from) * eased) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = from + suffix;
      requestAnimationFrame(step);
    });
  };
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      run();
    },
    { threshold: 0.4 },
  );
  io.observe(facts);
}

// ── Hero: the one animated demo, a looping film; paused while off screen ──
const heroSlot = document.querySelector<HTMLElement>("[data-hero]");
if (heroSlot) {
  const mock = createMock(heroSlot, { animate: !reduced });
  const frames = heroFrames();
  if (reduced) {
    mock.render(frames[frames.length - 1].state);
  } else {
    let i = 0;
    let timer = 0;
    let playing = false;
    const tick = () => {
      mock.render(frames[i].state);
      timer = window.setTimeout(() => {
        i = (i + 1) % frames.length;
        if (playing) tick();
      }, frames[i].hold);
    };
    const play = () => {
      if (playing) return;
      playing = true;
      tick();
    };
    const pause = () => {
      playing = false;
      window.clearTimeout(timer);
    };
    mock.render(frames[0].state);
    new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { threshold: 0.2 }).observe(heroSlot);
  }
}
