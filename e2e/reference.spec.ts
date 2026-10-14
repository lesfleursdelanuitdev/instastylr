import { test, expect } from "@playwright/test";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("fonts page: the preview follows your text and Copy copies that font", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/fonts/");
  await expect(page.locator("h1")).toContainText("Fonts for");
  const script = page.locator('.fx-sample[data-font="script"][data-bold="false"]');
  await expect(script).not.toHaveText("Hello World 123"); // styled, not plain
  await page.fill("#fx-text", "Rumi");
  await expect(script).toHaveText("ℛ𝓊𝓂𝒾");
  await script.locator("xpath=following-sibling::button").click();
  await expect(page.locator("#copy-status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ℛ𝓊𝓂𝒾");
  expect(errors).toEqual([]);
});

test("bullets and dividers: tapping a symbol copies exactly that symbol", async ({ page }) => {
  await page.goto("/symbols/bullets/");
  await page.locator('#floral button[data-copy="✿"]').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("✿");

  await page.goto("/symbols/dividers/");
  const first = page.locator(".div-line").first();
  const line = await first.getAttribute("data-copy");
  await first.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(line);
});

for (const path of ["/fonts/", "/symbols/bullets/", "/symbols/dividers/"]) {
  test(`${path} fits a 360px phone without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
