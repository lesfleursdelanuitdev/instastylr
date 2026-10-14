// Copied from the Les Fleurs de la Nuit site (src/lib/stars.ts) so this page shares its night sky.
// Night-sky star field (spec D6, §6): soft pre-rendered sprites plus fine pin-prick dust.
// Each star's fade is computed once from its height; drawing is capped at 30 fps and stops off screen.

export const ss = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Named fades (fraction of the canvas height → visibility), so components can pick one by name. */
export const FADES = {
  photoTop: (y: number) => 1 - ss(0.18, 0.58, y),
  landing: (y: number) => 1 - ss(0.2, 0.62, y),
  photoBottom: (y: number) => ss(0.02, 0.94, y) ** 1.8,
  even: () => 1,
} as const;
export type FadeName = keyof typeof FADES;

/** Phones stack the hero, so the photography sky must reach further down before fading out. */
export function fadeFor(name: FadeName, width: number): (y: number) => number {
  if (name === 'photoTop' && width < 760) return (y) => 1 - ss(0.35, 0.95, y);
  return FADES[name];
}

const TINTS = ['255,255,255', '255,196,226', '205,212,255'] as const;

export interface Star { x: number; y: number; f: number; t: number; s: number; r: number; tint: string }
export interface Dust { x: number; y: number; f: number; z: number; t: number; s: number; tint: string }

export function makeField(o: { w: number; h: number; dpr: number; density: number; fine: number; fade: (y: number) => number; fadeX?: (x: number) => number; rand?: () => number }): { stars: Star[]; dust: Dust[] } {
  const rand = o.rand ?? Math.random;
  const W = o.w * o.dpr;
  const H = o.h * o.dpr;
  const tint = () => { const v = rand(); return v < 0.12 ? TINTS[1] : v < 0.33 ? TINTS[2] : TINTS[0]; };
  const stars: Star[] = [];
  for (let i = 0; i < Math.round((o.w * o.h) / o.density); i++) {
    const y = rand() * H;
    const sx = rand() * W;
    const f = o.fade(y / H) * (o.fadeX ? o.fadeX(sx / W) : 1);
    if (f <= 0.01) continue;
    const r = Math.round((rand() < 0.07 ? 1.7 : rand() * 0.9 + 0.3) * o.dpr * 4) / 4;
    stars.push({ x: sx, y, f, t: rand() * 6.3, s: 0.4 + rand() * 1.2, r, tint: tint() });
  }
  const dust: Dust[] = [];
  for (let i = 0; i < Math.round(((o.w * o.h) / 1000) * o.fine); i++) {
    const y = rand() * H;
    const dx = rand() * W;
    const f = o.fade(y / H) * (o.fadeX ? o.fadeX(dx / W) : 1);
    if (f <= 0.01) continue;
    dust.push({ x: dx, y, f, z: (rand() * 0.7 + 0.45) * o.dpr, t: rand() * 6.3, s: 0.3 + rand() * 0.9, tint: tint() });
  }
  return { stars, dust };
}

function sprite(cache: Map<string, HTMLCanvasElement>, tint: string, r: number): HTMLCanvasElement {
  const key = tint + r;
  const hit = cache.get(key);
  if (hit) return hit;
  const R = Math.ceil(r * 3.2);
  const halo = r > 1.4 ? Math.ceil(r * 9) : R;
  const c = document.createElement('canvas');
  c.width = c.height = halo * 2;
  const g = c.getContext('2d')!;
  if (r > 1.4) {
    const h = g.createRadialGradient(halo, halo, 0, halo, halo, halo);
    h.addColorStop(0, `rgba(${tint},.14)`); h.addColorStop(1, `rgba(${tint},0)`);
    g.fillStyle = h; g.fillRect(0, 0, halo * 2, halo * 2);
  }
  const s = g.createRadialGradient(halo, halo, 0, halo, halo, R);
  s.addColorStop(0, `rgba(${tint},.95)`); s.addColorStop(0.28, `rgba(${tint},.45)`); s.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = s; g.fillRect(halo - R, halo - R, R * 2, R * 2);
  cache.set(key, c);
  return c;
}

export function startStarField(canvas: HTMLCanvasElement, o: { density: number; fine: number; fade: FadeName; fadeX?: (x: number) => number; heightFactor?: number; cover?: string; shooting?: boolean; autostart?: boolean }): { start(): void; stop(): void } {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const x = canvas.getContext('2d')!;
  const cache = new Map<string, HTMLCanvasElement>();
  let field = { stars: [] as Star[], dust: [] as Dust[] };
  let W = 0, H = 0, dpr = 1, raf = 0, running = false, last = 0;
  let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  let next = performance.now() + 4000;

  function size() {
    // Width comes from CSS (width: 100%), never from innerWidth: on phones the first layout pass can be
    // wider than the screen, and a canvas pinned to that width would keep the page wide for good.
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || document.documentElement.clientWidth;
    // `cover`: also stretch to the height of that element (the hero), so a tall phone hero keeps its sky.
    const coverH = o.cover ? (document.querySelector<HTMLElement>(o.cover)?.offsetHeight ?? 0) : 0;
    const h = Math.round(Math.max(document.documentElement.clientHeight * (o.heightFactor ?? 1), coverH));
    // a strip as tall as the whole page: keep the canvas within what browsers will allocate
    if (h * dpr > 12000) dpr = 12000 / h;
    W = canvas.width = Math.round(w * dpr); H = canvas.height = Math.round(h * dpr);
    canvas.style.height = `${h}px`;
    field = makeField({ w, h, dpr, density: o.density, fine: o.fine, fade: fadeFor(o.fade, w), fadeX: o.fadeX });
  }
  function draw(ts: number) {
    x.clearRect(0, 0, W, H);
    for (const d of field.dust) {
      x.globalAlpha = d.f * (reduce ? 0.55 : 0.18 + 0.62 * Math.abs(Math.sin(d.t + (ts / 2600) * d.s)) ** 3);
      x.fillStyle = `rgb(${d.tint})`; x.fillRect(d.x, d.y, d.z, d.z);
    }
    for (const s of field.stars) {
      const img = sprite(cache, s.tint, s.r);
      x.globalAlpha = s.f * (reduce ? 0.6 : 0.2 + 0.8 * Math.abs(Math.sin(s.t + (ts / 1900) * s.s)) ** 2);
      x.drawImage(img, s.x - img.width / 2, s.y - img.height / 2);
    }
    x.globalAlpha = 1;
    if (o.shooting === false || reduce) return;
    if (!shoot && ts > next) shoot = { x: W * (0.15 + Math.random() * 0.7), y: H * Math.random() * 0.3, vx: -(6 + Math.random() * 4) * dpr, vy: (2.5 + Math.random() * 2) * dpr, life: 0 };
    if (!shoot) return;
    shoot.life++; shoot.x += shoot.vx; shoot.y += shoot.vy;
    const a = Math.sin(Math.PI * Math.min(1, shoot.life / 60));
    const tx = shoot.x - shoot.vx * 14, ty = shoot.y - shoot.vy * 14;
    const g = x.createLinearGradient(shoot.x, shoot.y, tx, ty);
    g.addColorStop(0, `rgba(255,235,248,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,235,248,0)');
    x.strokeStyle = g; x.lineWidth = 1.1 * dpr; x.beginPath(); x.moveTo(shoot.x, shoot.y); x.lineTo(tx, ty); x.stroke();
    if (shoot.life > 60) { shoot = null; next = ts + 9000 + Math.random() * 14000; }
  }
  function loop(ts: number) {
    if (!document.hidden && ts - last >= 32) { last = ts; draw(ts); }
    if (running) raf = requestAnimationFrame(loop);
  }
  const api = {
    start() { if (reduce) { draw(0); return; } if (running) return; running = true; raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
  size(); draw(0);
  addEventListener('resize', () => { size(); if (!running) draw(0); });
  // the covered element (hero) grows after fonts and images load: follow it
  const covered = o.cover ? document.querySelector<HTMLElement>(o.cover) : null;
  let lastH = 0;
  if (covered) new ResizeObserver(() => { if (Math.abs(covered.offsetHeight - lastH) < 2) return; lastH = covered.offsetHeight; size(); if (!running) draw(0); }).observe(covered);
  if (o.autostart !== false) new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? api.start() : api.stop()))).observe(canvas);
  return api;
}
