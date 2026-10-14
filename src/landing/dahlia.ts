/**
 * The Les Fleurs de la Nuit dahlia: five rings of rounded petals. "quiet" is
 * the small ivory outline used as a mark; "colour" is the large periwinkle-to-
 * rose flower the engineering page closes on (`data-variant="colour"`). Built as DOM nodes
 * rather than an HTML string so no inline style attributes are needed (the
 * site's CSP forbids them); the draw-in animation is CSS (landing.css).
 */
const NS = "http://www.w3.org/2000/svg";
const IVORY = "#ece4f4";
const PINK = "#ff9fd0";
const WHITE = "#f4efff";
const PERI = "#9fb3ff";
const LILAC = "#c4b5ff";
const ROSE = "#ff6fb5";
// [petals, length, halfWidth, offset]
const GEOMETRY: [number, number, number, number][] = [
  [8, 118, 30, 22.5],
  [8, 100, 26, 0],
  [7, 78, 21, 12],
  [6, 56, 16, 30],
  [5, 34, 11, 0],
];
// per ring: [stroke, lineOpacity, fillOpacity]
const QUIET: [string, number, number][] = [[IVORY, 0.55, 0.03], [IVORY, 0.65, 0.04], [IVORY, 0.75, 0.05], [IVORY, 0.85, 0.06], [PINK, 1, 0.16]];
const COLOUR: [string, number, number][] = [[PERI, 1, 0.12], [LILAC, 1, 0.14], [LILAC, 1, 0.17], [PINK, 1, 0.2], [ROSE, 1, 0.26]];
const n = (v: number) => String(+v.toFixed(2));
const petal = (l: number, w: number) =>
  `M0 0C${n(-w * 1.2)} ${n(-l * 0.35)} ${n(-w * 1.05)} ${n(-l * 0.9)} 0 ${n(-l)}C${n(w * 1.05)} ${n(-l * 0.9)} ${n(w * 1.2)} ${n(-l * 0.35)} 0 0Z`;

function node(tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

export function mountDahlia(svg: SVGSVGElement, bg = "#050406"): void {
  svg.setAttribute("viewBox", "0 0 300 300");
  let i = 0;
  const look = svg.dataset.variant === "colour" ? COLOUR : QUIET;
  GEOMETRY.forEach(([petals, length, halfWidth, offset], ring) => {
    const [stroke, lineOpacity, fillOpacity] = look[ring];
    const d = petal(length, halfWidth);
    for (let k = 0; k < petals; k++) {
      const g = node("g", { transform: `translate(150 150) rotate(${n(offset + (k * 360) / petals)})` });
      (g as SVGElement & ElementCSSInlineStyle).style.setProperty("--i", String(i++));
      (g as SVGElement & ElementCSSInlineStyle).style.setProperty("--fo", String(fillOpacity));
      g.append(
        node("path", { class: "oc", fill: bg, "fill-opacity": 0.94, d }),
        node("path", { class: "pf", fill: stroke, "fill-opacity": fillOpacity, d }),
        node("path", { class: "pl", stroke, "stroke-opacity": lineOpacity, fill: "none", "stroke-width": 1, "vector-effect": "non-scaling-stroke", pathLength: 1, d }),
      );
      svg.append(g);
    }
  });
  for (let k = 0; k < 12; k++) {
    const t = (k * 30 * Math.PI) / 180;
    const r = 14 + (k % 2) * 4;
    const x = n(150 + Math.sin(t) * r);
    const y = n(150 - Math.cos(t) * r);
    const g = node("g", {});
    (g as SVGElement & ElementCSSInlineStyle).style.setProperty("--i", String(i++));
    g.append(
      node("path", { class: "pl", stroke: WHITE, "stroke-opacity": 0.7, "stroke-width": 0.6, fill: "none", pathLength: 1, d: `M150 150L${x} ${y}` }),
      node("circle", { class: "dot", cx: x, cy: y, r: 1.4, fill: WHITE }),
    );
    svg.append(g);
  }
}
