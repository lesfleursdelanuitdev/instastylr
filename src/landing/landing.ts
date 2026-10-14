import { heroFrames } from "./demos";
import { createMock } from "./mock";
import { bootChrome } from "./chrome";
import { mountShots } from "./shots";
import { fillCard, SCENE_LABELS, type SceneId } from "./scenes";

const { reduced } = bootChrome();
mountShots();

// ── The before/after, switchable between places (an Instagram post by default) ──
const panel = document.getElementById("scene-panel");
const cards = {
  plain: document.querySelector<HTMLElement>('[data-scene-card="plain"]'),
  styled: document.querySelector<HTMLElement>('[data-scene-card="styled"]'),
};
const tabs = [...document.querySelectorAll<HTMLButtonElement>("[data-scene]")];
const EASE = "cubic-bezier(.2, .8, .2, 1)";
let scene: SceneId = "post";
let turn = 0; // the newest switch wins if tabs are pressed quickly
const fill = (id: SceneId) => {
  if (cards.plain) fillCard(cards.plain, id, false);
  if (cards.styled) fillCard(cards.styled, id, true);
  panel?.setAttribute("aria-label", SCENE_LABELS[id]);
};
fill(scene);

async function showScene(id: SceneId) {
  if (id === scene || !panel) return;
  scene = id;
  const mine = ++turn;
  tabs.forEach((b) => {
    const on = b.dataset.scene === id;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  if (reduced) return fill(id);
  const figs = [...panel.querySelectorAll<HTMLElement>(".post-card")];
  // out: the cards dim, blur a little and sink…
  const outs = figs.map((f, i) =>
    f.animate([{ opacity: 1, filter: "blur(0)", transform: "none" }, { opacity: 0, filter: "blur(6px)", transform: "translateY(10px) scale(.985)" }], { duration: 240, delay: i * 50, easing: "ease-in", fill: "forwards" }),
  );
  await Promise.all(outs.map((a) => a.finished.catch(() => undefined)));
  if (mine !== turn) return;
  // …the panel eases to its new height while the new content rises in
  const before = panel.offsetHeight;
  fill(id);
  const after = panel.offsetHeight;
  panel.animate([{ height: `${before}px` }, { height: `${after}px` }], { duration: 480, easing: EASE });
  figs.forEach((f, i) => {
    const a = f.animate([{ opacity: 0, filter: "blur(6px)", transform: "translateY(-10px) scale(.985)" }, { opacity: 1, filter: "blur(0)", transform: "none" }], { duration: 520, delay: 80 + i * 70, easing: EASE, fill: "both" });
    a.onfinish = () => a.cancel();
  });
  outs.forEach((a) => a.cancel());
}
tabs.forEach((b, i) => {
  b.addEventListener("click", () => showScene(b.dataset.scene as SceneId));
  b.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + step + tabs.length) % tabs.length;
    tabs[next].focus();
    showScene(tabs[next].dataset.scene as SceneId);
  });
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
