// Scrape https://lingojam.com/FancyTextGenerator: type the alphabet in, read what
// comes out, once for the whole string and once per character. Writes the raw
// capture to lingojam.raw.json; analyse.mjs turns that into mappings.
//
//   node scripts/font-scrape/scrape-lingojam.mjs
//
// PW_CHROMIUM=/path/to/chrome-headless-shell uses that browser when the one
// this project's Playwright expects isn't installed.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const INPUT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const URL_ = "https://lingojam.com/FancyTextGenerator";
const OUT = fileURLToPath(new URL("./lingojam.raw.json", import.meta.url));

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  executablePath: process.env.PW_CHROMIUM || undefined,
});
const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
});
// The site's own files only: its ad and tracking hosts are not needed and not wanted.
await ctx.route("**/*", (r) =>
  new URL(r.request().url()).hostname.endsWith("lingojam.com") ? r.continue() : r.abort(),
);
const page = await ctx.newPage();
await page.goto(URL_, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForSelector("#english-text");

// The page shows its styles as unnamed lines. Their names only exist in its
// generator function, one `finalText += ...` per line, so read them from there.
const rawNames = await page.evaluate(() => {
  const src = [...document.scripts].map((s) => s.textContent).find((t) => t.includes("function forward(text)"));
  const body = src.slice(src.indexOf("function forward(text)"), src.indexOf("return finalText.trim()"));
  return [...body.matchAll(/finalText \+= (.*?) \+ "\\n\\n";/g)].map((m) => {
    const expr = m[1];
    return (
      expr.match(/applyCharMap\((\w+?)CharMap,/)?.[1] ??
      expr.match(/luni\.tools\.(\w+)\.encode/)?.[1] ??
      expr.match(/(\w+)\(text\)/)?.[1] ??
      expr
    );
  });
});

// One generator that emits several lines at once (they come out blank-line
// separated like everything else), so it needs a name per line.
const MULTI_LINE = { vaporwaveText: ["vaporwave", "vaporwaveGlitch", "vaporwaveBoxed"] };
const names = rawNames.flatMap((n) => MULTI_LINE[n] ?? [n]);

const read = () =>
  page.evaluate(() => {
    const t = document.querySelector("#ghetto-text");
    return t.value || t.innerText || "";
  });

let last = await read();
async function generate(text) {
  await page.fill("#english-text", "");
  await page.fill("#english-text", text);
  await page.dispatchEvent("#english-text", "input");
  await page.dispatchEvent("#english-text", "keyup");
  // The first style is a plain lookup, so its line changes whenever the input does.
  await page.waitForFunction(
    (prev) => {
      const t = document.querySelector("#ghetto-text");
      const v = t.value || t.innerText || "";
      return v !== "" && v.split("\n\n")[0] !== prev;
    },
    last.split("\n\n")[0],
    { timeout: 15_000 },
  );
  await page.waitForTimeout(150);
  last = await read();
  return last.split("\n\n");
}

const full = await generate(INPUT);
const perChar = {};
for (const ch of INPUT) perChar[ch] = await generate(ch);
const fullAgain = await generate(INPUT);
await browser.close();

if (full.length !== names.length)
  throw new Error(`${full.length} output lines but ${names.length} named styles: the page changed`);

writeFileSync(
  OUT,
  JSON.stringify({ source: URL_, scrapedAt: new Date().toISOString(), input: INPUT, names, full, fullAgain, perChar }, null, 1) + "\n",
);
console.log(`${names.length} styles captured → ${OUT}`);
