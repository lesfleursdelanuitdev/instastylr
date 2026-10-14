// Draws public/og.png, the 1200×630 picture shown when a link to the site is
// shared. The styled caption in it comes from the real font engine.
//
//   npx vite-node scripts/make-og.mjs      (PW_CHROMIUM=/path/to/chrome if needed)
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { outputLines } from "../src/landing/state";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
// inlined: a page made with setContent may not load file:// fonts
const font = (f) => `data:font/woff2;base64,${readFileSync(here("../src/landing/fonts/" + f)).toString("base64")}`;
const RULE = "──────  ✦  ──────";
const caption = outputLines([
  { segs: [{ text: "“To see takes time.”", italic: true }] },
  { segs: [{ text: "— Georgia O’Keeffe" }] },
  { divider: RULE },
  { segs: [{ text: "Lens", bold: true }, { text: "  90mm f/2.8 Macro" }], bullet: "•" },
  { segs: [{ text: "Aperture", bold: true }, { text: "  f/2.8" }], bullet: "•" },
  { segs: [{ text: "ISO", bold: true }, { text: "  400" }], bullet: "•" },
  { divider: RULE },
]).join("\n");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;font-weight:400 900;src:url("${font("bodoni-moda-latin-opsz-normal.woff2")}")}
@font-face{font-family:B;font-style:italic;font-weight:400 900;src:url("${font("bodoni-moda-latin-opsz-italic.woff2")}")}
@font-face{font-family:M;font-weight:400;src:url("${font("manrope-latin-400-normal.woff2")}")}
@font-face{font-family:M;font-weight:500;src:url("${font("manrope-latin-500-normal.woff2")}")}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#050406;color:#efeaff;font:400 22px/1.5 M,sans-serif;display:grid;grid-template-columns:1.15fr 1fr;align-items:center;gap:56px;padding:64px 72px;
  background-image:radial-gradient(700px 420px at 100% 0,#3a1f7a55,transparent 70%),radial-gradient(600px 400px at 0 100%,#ff6fb51f,transparent 70%)}
.k{font:500 15px M;letter-spacing:.34em;text-transform:uppercase;color:#c4b5ff;margin-bottom:22px}
h1{font:500 76px/1.04 B,serif;letter-spacing:-.01em}
em{color:#ff9fd0}
p{margin-top:26px;color:#cfc7ee;font-size:24px;max-width:17em}
.card{border:1px solid #ff9fd059;border-radius:22px;background:#0c0a10;padding:30px 32px;font:400 27px/1.6 -apple-system,"Segoe UI",system-ui,sans-serif;white-space:pre-wrap;box-shadow:0 30px 90px -30px #ff6fb580}
</style><div><div class="k">InstaStylr</div><h1>Captions that keep <em>their style</em></h1><p>Bold, italic, lists, dividers and 42 fonts for Instagram captions. Free.</p></div><div class="card">${esc(caption)}</div>`;

const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: here("../public/og.png") });
await browser.close();
console.log("wrote public/og.png");
