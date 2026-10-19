import { test, expect } from "@playwright/test";

/**
 * Dragging the editor/output divider up stops where the editor can't shrink any
 * further, so a short post never makes the page taller than the window (the
 * scrollbar that would bring narrows the page under extension overlays such as
 * Grammarly's, which then stick out sideways).
 */
test.use({ viewport: { width: 1280, height: 600 } });

test("dragging the divider all the way up keeps the page inside the window", async ({ page }) => {
  await page.goto("/app/");
  await page.locator("#btn-welcome-skip").click({ timeout: 5000 }).catch(() => {});
  await page.locator(".editor").click();
  await page.keyboard.type("A short post");

  const out = page.locator("#output-body");
  const start = (await out.boundingBox())!.height;
  const h = (await page.locator("#main-handle").boundingBox())!;
  await page.mouse.move(h.x + 200, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 200, 5, { steps: 8 });
  await page.mouse.up();

  expect((await out.boundingBox())!.height).toBeGreaterThanOrEqual(start);
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
  expect(fits).toBe(true);

  // And it still comes back down.
  const h2 = (await page.locator("#main-handle").boundingBox())!;
  await page.mouse.move(h2.x + 200, h2.y + h2.height / 2);
  await page.mouse.down();
  await page.mouse.move(h2.x + 200, h2.y + 100, { steps: 5 });
  await page.mouse.up();
  expect((await out.boundingBox())!.height).toBeLessThan(start);
});
