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

  await page.locator(".closing .btn").click();
  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.locator("#brand")).toContainText("instastylr");
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
  await expect(page).toHaveURL(/\/app\/$/);
  expect(errors).toEqual([]);
});

test("the site sits on the deep blue with radial glows", async ({ page }) => {
  for (const path of ["/", "/learn/styling/"]) {
    await page.goto(path);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(7, 11, 26)");
    expect(await page.evaluate(() => getComputedStyle(document.body, "::before").backgroundImage)).toContain("radial-gradient");
  }
});
