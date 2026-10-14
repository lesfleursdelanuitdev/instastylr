/** What every page of the site shares: the night sky, the dahlia mark, the nav's scrolled state, reveals. */
import "./landing.css";
import { ss, startStarField } from "./stars";
import { mountDahlia } from "./dahlia";

export function bootChrome(): { reduced: boolean } {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // Stars frame the page and fade towards its middle: from the top down (the same
  // sky as creative.lesfleursdelanuit.com), from the footer up, and in from each side.
  const inward = (x: number) => (1 - ss(0.05, 1, x)) ** 1.6; // x: 0 at the outer edge → 1 at the strip's inner edge
  for (const sky of document.querySelectorAll<HTMLCanvasElement>("canvas.sky")) {
    const where = sky.dataset.sky;
    if (where === "bottom") startStarField(sky, { fade: "photoBottom", density: 4000, fine: 1.2, shooting: false });
    else if (where === "left") startStarField(sky, { fade: "even", fadeX: inward, cover: "body", density: 4600, fine: 1, shooting: false });
    else if (where === "right") startStarField(sky, { fade: "even", fadeX: (x) => inward(1 - x), cover: "body", density: 4600, fine: 1, shooting: false });
    else startStarField(sky, { fade: "landing", density: 4000, fine: 1.2, shooting: true });
  }
  document.querySelectorAll<SVGSVGElement>("svg.dahlia").forEach((svg) => mountDahlia(svg));
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("ready")));

  const nav = document.querySelector<HTMLElement>(".nav");
  const onScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Things that ease in when they come into view.
  const reveals = document.querySelectorAll<HTMLElement>(".reveal");
  if (reduced) reveals.forEach((r) => r.classList.add("in"));
  else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.15 },
    );
    reveals.forEach((r) => io.observe(r));
  }
  return { reduced };
}
