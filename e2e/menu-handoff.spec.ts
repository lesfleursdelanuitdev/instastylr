import { test, expect, type Page } from "@playwright/test";

/**
 * Menu → panel hand-off. Picking "Saved posts" or "Settings" in the right-hand
 * menu should slide the new panel in over the menu: the menu stays put until it
 * is covered, and the dim overlay keeps the same darkness the whole time (one
 * overlay, never two fading against each other).
 *
 * Samples every animation frame for half a second after the click.
 */
type Sample = { menu: number | null; panel: number | null; dim: number };

async function sampleHandoff(page: Page, item: string, panelSel: string): Promise<Sample[]> {
  await page.locator("#btn-menu").click();
  await expect(page.locator("#side-menu.open")).toBeVisible();
  await page.waitForTimeout(400); // menu finished sliding in

  await page.evaluate((panelSel) => {
    const w = window as unknown as { __s: Sample[] };
    w.__s = [];
    const t0 = performance.now();
    const left = (sel: string) => {
      const e = document.querySelector(sel);
      if (!e || getComputedStyle(e).visibility === "hidden") return null;
      return Math.round(e.getBoundingClientRect().left);
    };
    const tick = () => {
      // Combined darkness of every overlay on screen (each is black at 0.45 × opacity).
      let clear = 1;
      for (const e of document.querySelectorAll<HTMLElement>(".overlay-scrim, #saves-overlay")) {
        const cs = getComputedStyle(e);
        if (cs.display === "none") continue;
        clear *= 1 - 0.45 * Number(cs.opacity);
      }
      w.__s.push({ menu: left("#side-menu"), panel: left(panelSel), dim: 1 - clear });
      if (performance.now() - t0 < 500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, panelSel);

  await page.locator("#side-menu .menu-item", { hasText: item }).click();
  await page.waitForTimeout(650);
  return page.evaluate(() => (window as unknown as { __s: Sample[] }).__s);
}

for (const [item, panelSel] of [
  ["Saved posts", "#saves-panel"],
  ["Settings", "#settings-panel"],
] as const) {
  test(`menu hands off to ${item} without both drawers moving`, async ({ page }) => {
    await page.goto("/app/");
    await page.locator("#btn-welcome-skip").click({ timeout: 5000 }).catch(() => {});

    const s = await sampleHandoff(page, item, panelSel);
    const menuStart = s[0].menu;
    expect(menuStart).not.toBeNull();

    // While the menu is still on screen it never moves.
    for (const f of s) if (f.menu !== null) expect(f.menu).toBe(menuStart);
    // The overlay's darkness stays at one overlay's worth throughout.
    for (const f of s) expect(f.dim).toBeCloseTo(0.45, 2);
    // It ends with the panel open in the menu's place and the menu gone.
    const last = s[s.length - 1];
    expect(last.panel).toBe(menuStart);
    expect(last.menu).toBeNull();
    await expect(page.locator(panelSel)).toBeVisible();
  });
}
