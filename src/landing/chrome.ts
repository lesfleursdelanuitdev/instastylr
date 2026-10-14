/** What every page of the site shares: the night sky, the dahlia mark, the nav's scrolled state, reveals. */
import "./landing.css";
import { startStarField } from "./stars";
import { mountDahlia } from "./dahlia";

export function bootChrome(): { reduced: boolean } {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // the same sky as creative.lesfleursdelanuit.com: one screen tall at the top, fading out
  // between 20% and 62% of the way down. It stops drawing once it has scrolled out of view.
  const sky = document.querySelector<HTMLCanvasElement>("canvas.sky");
  if (sky) startStarField(sky, { fade: "landing", density: 4000, fine: 1.2, shooting: true });
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
  count();
  return { reduced };
}

/**
 * Visit counting without cookies or third parties: one tiny same-origin image
 * request per page view, tagged with the page. The numbers come out of the
 * web server's own access log (scripts/visit-report.sh). Nothing identifies
 * the visitor; the random number only stops the browser reusing a cached copy.
 */
function count(): void {
  const page = document.documentElement.dataset.page;
  if (!page) return;
  new Image().src = `/assets/v.gif?p=${encodeURIComponent(page)}&r=${Math.random().toString(36).slice(2, 8)}`;
}
