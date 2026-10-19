// Shared capture for font generator sites that show one card per style: type the
// alphabet in, read every card, then type each character on its own, then the
// alphabet again (to catch styles that come out different each time).
// Used by scrape-picsart.mjs and scrape-glyphy.mjs; analyse.mjs reads the result.
//
// PW_CHROMIUM=/path/to/chrome-headless-shell uses that browser when the one
// this project's Playwright expects isn't installed.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

export const INPUT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * @param {object} site
 * @param {string} site.source     the generator's main page (recorded in the output)
 * @param {string[]} site.pages    every page to capture
 * @param {string} site.host       only this host's files load (no ads or trackers)
 * @param {string} site.input      selector of the text box
 * @param {string} site.card       selector of one style's card
 * @param {string} site.text       selector, inside a card, of the styled text
 * @param {string} site.name       selector, inside a card, of the style's name
 * @param {string} [site.category] selector, inside a card, of the site's category label
 * @param {RegExp} site.loadMore   name of the button that shows more cards
 * @param {string} out             path of the raw JSON to write
 */
export async function captureSite(site, out) {
  const browser = await chromium.launch({
    args: ["--no-sandbox"],
    executablePath: process.env.PW_CHROMIUM || undefined,
  });
  // A fresh session per page: these sites remember the last text typed, and a page
  // that opens already showing the alphabet would never visibly change.
  const pages = [];
  try {
    for (const url of site.pages) {
      const ctx = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      });
      await ctx.route("**/*", (r) =>
        new URL(r.request().url()).hostname.endsWith(site.host) ? r.continue() : r.abort(),
      );
      const page = await ctx.newPage();
      try {
        pages.push({ url, ...(await capturePage(page, site, url)) });
        console.log(`${url}: ${pages.at(-1).names.length} styles`);
      } catch (e) {
        // Recorded and skipped, so one odd page doesn't lose the rest.
        pages.push({ url, error: String(e.message ?? e), names: [], categories: [], full: [], fullAgain: [], perChar: {} });
        console.log(`${url}: SKIPPED (${e.message ?? e})`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  // Pages repeat each other's styles: each page keeps only the styles no earlier
  // page showed (same name, same results), and lists the names of the rest.
  const seen = new Set();
  for (const p of pages) {
    const keep = [];
    p.alsoShown = [];
    p.names.forEach((name, i) => {
      const key = JSON.stringify([name, p.full[i], p.fullAgain[i], INPUT.split("").map((c) => p.perChar[c][i])]);
      if (seen.has(key)) p.alsoShown.push(name);
      else (seen.add(key), keep.push(i));
    });
    p.names = keep.map((i) => p.names[i]);
    p.categories = keep.map((i) => p.categories[i]);
    p.full = keep.map((i) => p.full[i]);
    p.fullAgain = keep.map((i) => p.fullAgain[i]);
    for (const c of Object.keys(p.perChar)) p.perChar[c] = keep.map((i) => p.perChar[c][i]);
  }
  writeFileSync(
    out,
    JSON.stringify({ source: site.source, scrapedAt: new Date().toISOString(), input: INPUT, pages }, null, 1) + "\n",
  );
  console.log(`${pages.reduce((n, p) => n + p.names.length, 0)} cards on ${pages.length} pages → ${out}`);
}

async function capturePage(page, site, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => {});
  await page.waitForSelector(site.input, { timeout: 30_000 });

  const read = () =>
    page.evaluate(
      ({ card, text, name, category }) =>
        [...document.querySelectorAll(card)].map((c) => ({
          text: c.querySelector(text)?.textContent ?? "",
          name: c.querySelector(name)?.textContent.trim() ?? "",
          category: category ? (c.querySelector(category)?.textContent.trim() ?? "") : "",
        })),
      site,
    );

  // Some style pages (ASCII-art "big text") have no style cards at all.
  await page.waitForTimeout(1500);
  if (!(await read()).length) return { names: [], categories: [], full: [], fullAgain: [], perChar: {} };

  // Wait until the cards show something new and have stopped changing.
  let last = JSON.stringify((await read()).map((c) => c.text));
  const settle = async () => {
    const t0 = Date.now();
    let prev = null;
    for (;;) {
      await page.waitForTimeout(80);
      const now = JSON.stringify((await read()).map((c) => c.text));
      if (now !== last && now === prev) break;
      if (Date.now() - t0 > 15_000) throw new Error(`${url}: the cards didn't update`);
      prev = now;
    }
    last = prev;
  };
  const type = async (s) => {
    const box = page.locator(site.input).first();
    await box.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type(s);
    await settle();
    return read();
  };

  await type(INPUT);
  // Show every card: press "load more" until the count stops growing.
  for (let n = (await read()).length; ; ) {
    const btn = page.getByRole("button", { name: site.loadMore });
    if (!(await btn.count()) || !(await btn.first().isVisible())) break;
    await btn.first().click();
    await page.waitForTimeout(400);
    const m = (await read()).length;
    if (m === n) break;
    n = m;
  }
  last = "";
  const cards = await type(INPUT);
  const names = cards.map((c) => c.name);
  const categories = cards.map((c) => c.category);
  const full = cards.map((c) => c.text);

  const perChar = {};
  for (const ch of INPUT) {
    const got = await type(ch);
    if (got.length !== names.length) throw new Error(`${url}: card count changed on "${ch}"`);
    perChar[ch] = got.map((c) => c.text);
  }
  const fullAgain = (await type(INPUT)).map((c) => c.text);
  return { names, categories, full, fullAgain, perChar };
}
