import { test, expect } from "@playwright/test";

test("landing page: only the hero is animated; sections are ordinary blocks with a still picture", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/InstaStylr/);

  // The hero film is running: the mock's output fills in from the real engine.
  await expect(page.locator("[data-hero] .mock-out")).not.toHaveText(/appear here/, { timeout: 8000 });

  // Four feature sections, each a still (no pinning: they scroll with the page).
  const features = page.locator(".feature");
  await expect(features).toHaveCount(4);
  await expect(page.locator(".feature .mock")).toHaveCount(4);
  await expect(page.locator(".mock.dark")).toHaveCount(5); // hero + four stills, all in the app's dark mode
  const first = features.first();
  await first.scrollIntoViewIfNeeded();
  const before = await first.evaluate((el) => el.getBoundingClientRect().top);
  const shot = await first.locator(".mock-out").innerText();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(600);
  expect(await first.evaluate((el) => el.getBoundingClientRect().top)).toBeCloseTo(before - 200, 0);
  expect(await first.locator(".mock-out").innerText()).toBe(shot); // the picture doesn't change

  // The result section: the same caption plain and styled, from the real engine.
  const plain = page.locator('[data-scene-card="plain"]');
  const styled = page.locator('[data-scene-card="styled"]');
  await expect(plain).toContainText("Nobody sees a flower really");
  await expect(plain).not.toContainText("•");
  await expect(plain).not.toContainText("──");
  // quote in serif italic, author plain, then the EXIF block between two identical rules, labels bold
  await expect(styled).toContainText("𝑁𝑜𝑏𝑜𝑑𝑦 𝑠𝑒𝑒𝑠 𝑎 𝑓𝑙𝑜𝑤𝑒𝑟");
  await expect(styled).toContainText("— Georgia O’Keeffe");
  await expect(styled).toContainText("• 𝐀𝐩𝐞𝐫𝐭𝐮𝐫𝐞  f/2.8");
  await expect(styled).toContainText("• 𝐈𝐒𝐎  400");
  const lines = (await styled.locator(".scene-text").innerText()).split("\n");
  const rules = lines.filter((l) => l.includes("──"));
  expect(rules.length).toBe(2);
  expect(rules[0]).toBe(rules[1]);
  expect(lines.indexOf(rules[0])).toBeLessThan(lines.findIndex((l) => l.startsWith("• ")));
  expect(lines.lastIndexOf(rules[1])).toBe(lines.length - 1);
  // as in the app, a rule has a blank line on each side
  const r0 = lines.indexOf(rules[0]);
  expect(lines[r0 - 1]).toBe("");
  expect(lines[r0 + 1]).toBe("");
  await expect(page.locator(".post-card img.post-photo")).toHaveCount(2);
  expect(await page.locator(".post-card img.post-photo").first().evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0 || new Promise((r) => (i.onload = () => r(true))))).toBe(true);
  await expect(page.locator(".places")).toHaveCount(0); // one worked example (the posts) is enough
  await expect(page.locator(".compare-row:not(.compare-head)")).toHaveCount(4);
  await expect(page.locator(".compare")).toContainText("Bulleted lists and divider lines too.");
  await expect(page.locator(".who-grid h3")).toHaveText(["Creators", "Photographers", "Anyone who posts"]);

  // The button says where it was pressed and asks the app for the dark look the pictures show.
  await page.locator(".closing .btn").click();
  await expect(page).toHaveURL(/\/app\/\?theme=dark&from=closing$/);
  await expect(page.locator("#brand")).toContainText("instastylr");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("hero: the text turns bold only after the pointer presses B", async ({ page }) => {
  await page.goto("/");
  // sample the film: whenever the output is bold, B must already have been pressed (and so be lit)
  const seen = await page.evaluate(
    () =>
      new Promise<{ boldBeforePress: boolean; sawBold: boolean }>((resolve) => {
        const out = document.querySelector("[data-hero] .mock-out")!;
        const b = document.querySelector("[data-hero] .mock-tb-bold")!;
        let pressed = false, sawBold = false, bad = false;
        const iv = setInterval(() => {
          if (b.classList.contains("on")) pressed = true;
          if ((out.textContent ?? "").includes("𝐆")) {
            sawBold = true;
            if (!pressed) bad = true;
          }
          if (sawBold) (clearInterval(iv), resolve({ boldBeforePress: bad, sawBold }));
        }, 16);
        setTimeout(() => (clearInterval(iv), resolve({ boldBeforePress: bad, sawBold })), 12000);
      }),
  );
  expect(seen.sawBold).toBe(true);
  expect(seen.boldBeforePress).toBe(false);
});

test("landing page with reduced motion: hero shows its last frame, nothing hidden", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-hero] .mock-copy")).toHaveText("Copied!");
  await expect(page.locator(".feature .copy").first()).toHaveCSS("opacity", "1");
});

test("tutorials: linked from each section, each page has steps with pictures of the app, and leads on", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const slug of ["styling", "lists", "dividers", "saving"]) await expect(page.locator(`a.more[href="/learn/${slug}/"]`)).toHaveCount(1);

  await page.goto("/learn/");
  await expect(page.locator(".tut-list a")).toHaveCount(4);
  await page.locator('.tut-list a[href="/learn/styling/"]').click();
  await expect(page.locator("h1")).toContainText("Bold, italic");
  expect(await page.locator(".step h2").count()).toBeGreaterThanOrEqual(6);
  // pictures come from the real engine: step 3's shows bold output
  await expect(page.locator('[data-shot="styles:2"] .mock-out')).toContainText("𝐆𝐨𝐥𝐝𝐞𝐧 𝐡𝐨𝐮𝐫");

  for (const [slug, heading] of [["lists", "Lists"], ["dividers", "Dividers"], ["saving", "Saving"]]) {
    await page.locator(".tut-next a.fwd").click();
    await expect(page).toHaveURL(new RegExp(`/learn/${slug}/$`));
    await expect(page.locator("h1")).toContainText(heading);
    expect(await page.locator("[data-shot] .mock").count()).toBeGreaterThanOrEqual(5);
  }
  await page.locator(".closing .btn").click();
  await expect(page).toHaveURL(/\/app\/\?theme=dark&from=learn$/);
  expect(errors).toEqual([]);
});

test("the site is ink black with one sky at the top", async ({ page }) => {
  for (const path of ["/", "/learn/styling/"]) {
    await page.goto(path);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(5, 4, 6)");
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(await page.locator("canvas.sky").evaluate((c) => getComputedStyle(c).position)).toBe("absolute");
  }
});

test("hero: the mock's footer counters change without animating (no flicker while typing)", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(
    () =>
      new Promise<{ changes: number; animated: number; minOpacity: number }>((resolve) => {
        const foot = document.querySelector("[data-hero] .mock-foot")!;
        let changes = 0, animated = 0, minOpacity = 1, last = foot.textContent;
        const iv = setInterval(() => {
          if (foot.textContent !== last) (changes++, (last = foot.textContent));
          for (const span of foot.querySelectorAll("span")) {
            animated += span.getAnimations().length;
            minOpacity = Math.min(minOpacity, Number(getComputedStyle(span).opacity));
          }
        }, 16);
        setTimeout(() => (clearInterval(iv), resolve({ changes, animated, minOpacity })), 5000);
      }),
  );
  expect(res.changes).toBeGreaterThan(5); // the counters did tick while the caption was typed
  expect(res.animated).toBe(0);
  expect(res.minOpacity).toBe(1);
});

test("search and sharing basics: titles, canonical, share image, robots, sitemap, not-found page", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Instagram captions/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://instastylr.lesfleursdelanuit.com/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\.png$/);
  const og = await request.get("/og.png");
  expect(og.headers()["content-type"]).toBe("image/png");
  expect((await request.get("/robots.txt")).headers()["content-type"]).toContain("text/plain");
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("<loc>https://instastylr.lesfleursdelanuit.com/learn/styling/</loc>");
  await page.goto("/learn/lists/");
  await expect(page).toHaveTitle(/bullet points/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/learn\/lists\/$/);
  await page.goto("/404.html");
  await expect(page.locator("h1")).toContainText("Nothing");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("each page view asks for one counting pixel tagged with the page", async ({ page }) => {
  const hits: string[] = [];
  page.on("request", (r) => r.url().includes("/assets/v.gif") && hits.push(new URL(r.url()).searchParams.get("p") ?? ""));
  await page.goto("/");
  await page.goto("/learn/dividers/");
  await page.waitForTimeout(300);
  expect(hits).toEqual(["home", "learn-dividers"]);
});

test("the app: a first visit follows ?theme, a stored choice wins over it", async ({ page }) => {
  await page.goto("/app/?theme=dark&from=hero");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#btn-welcome-skip").click();
  await page.locator("#btn-theme").click(); // choose light
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/app/?theme=dark&from=nav");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("the facts row counts up to its numbers when it comes into view", async ({ page }) => {
  await page.goto("/");
  const first = page.locator(".facts b").first();
  await page.locator(".facts").scrollIntoViewIfNeeded();
  // mid-count it shows something below the target, then settles on the real figures
  const seen = await first.evaluate(
    (el) =>
      new Promise<number[]>((resolve) => {
        const v: number[] = [];
        const iv = setInterval(() => v.push(Number(el.textContent)), 40);
        setTimeout(() => (clearInterval(iv), resolve(v)), 2400);
      }),
  );
  expect(Math.min(...seen)).toBeLessThan(42);
  expect(seen[seen.length - 1]).toBe(42);
  await expect(page.locator(".facts b")).toHaveText(["42", "7", "0", "100%"]);
  expect(await first.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(52);
});

test("before/after: the tabs under it switch the place, the Instagram post is the default", async ({ page }) => {
  await page.goto("/");
  const tabs = page.locator('[role="tab"]');
  await expect(tabs).toHaveText(["Instagram post", "Instagram bio", "YouTube video", "LinkedIn post"]);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  const plain = page.locator('[data-scene-card="plain"]');
  const styled = page.locator('[data-scene-card="styled"]');
  await expect(styled).toHaveClass(/scene-post/);
  // the tabs sit below the before/after
  const postsBottom = await page.locator(".posts").evaluate((e) => e.getBoundingClientRect().bottom);
  expect(await tabs.first().evaluate((e) => e.getBoundingClientRect().top)).toBeGreaterThan(postsBottom);

  await page.locator('[data-scene="video"]').click();
  await expect(styled).toHaveClass(/scene-video/);
  // chapter lines start with their timestamp, so YouTube still makes chapters of them
  expect((await styled.locator(".video-desc").innerText()).split("\n")).toContain("2:10  Camera settings");
  await expect(styled).toContainText("• 90mm f/2.8 Macro");
  await expect(plain).not.toContainText("•");
  await expect(page.locator('[data-scene="video"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#scene-panel")).toHaveAttribute("aria-label", "YouTube video");

  // keyboard: arrows move between tabs and switch the place
  await page.locator('[data-scene="video"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(styled).toHaveClass(/scene-linkedin/);
  await expect(styled).toContainText("𝗙𝗹𝗼𝘄𝗲𝗿 𝗽𝗵𝗼𝘁𝗼𝗴𝗿𝗮𝗽𝗵𝗲𝗿");
  await expect(styled).toContainText("1. Slow down.");
  await page.keyboard.press("Home");
  await expect(styled).toHaveClass(/scene-post/);

  // pressing quickly: the last one wins and nothing is left half faded
  for (const id of ["bio", "video", "linkedin", "bio"]) await page.locator(`[data-scene="${id}"]`).click();
  await expect(styled).toHaveClass(/scene-bio/);
  await expect(styled).toContainText("𝐋𝐞𝐬 𝐅𝐥𝐞𝐮𝐫𝐬 𝐝𝐞 𝐥𝐚 𝐍𝐮𝐢𝐭");
  await expect.poll(() => styled.evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
  await expect.poll(() => page.locator(".posts").evaluate((e) => e.getAnimations().length)).toBe(0);
});

test("before/after on a phone: the tabs stay on screen while the stacked cards are in view", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true })).newPage();
  await page.goto("/");
  await page.locator('[data-scene-card="plain"]').evaluate((e) => e.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);
  const box = (await page.locator('[role="tablist"]').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(740);
  expect(box.y).toBeGreaterThan(0);
  await page.locator('[data-scene="bio"]').tap();
  await expect(page.locator('[data-scene-card="plain"]')).toHaveClass(/scene-bio/);
});

test("before/after: the bio example fits Instagram's 150-character limit", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-scene="bio"]').click();
  const styled = page.locator('[data-scene-card="styled"] .scene-text');
  await expect(styled).toContainText("𝐋𝐞𝐬 𝐅𝐥𝐞𝐮𝐫𝐬");
  const bio = await styled.innerText();
  expect([...new Intl.Segmenter().segment(bio)].length).toBeLessThanOrEqual(150);
});
