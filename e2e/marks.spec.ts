import { test, expect, type Page } from "@playwright/test";

/**
 * Marks (a line through, under, over or around every letter, on any font), the
 * presets made of a font plus marks, and small caps.
 */
const S = "̶"; // strike
const U = "̲"; // underline

async function start(page: Page, text: string) {
  await page.goto("/app/");
  await page.locator("#btn-welcome-skip").click({ timeout: 5000 }).catch(() => {});
  const editor = page.locator(".editor");
  await editor.click();
  await editor.pressSequentially(text);
  await page.keyboard.press("ControlOrMeta+A");
  return editor;
}

const out = (page: Page) => page.locator("#output-body");
const mark = (page: Page, id: string) => page.locator(`#marks-menu [data-mark="${id}"]`);

async function pickFromPanel(page: Page, fontId: string) {
  await page.locator("#font-select").click();
  await page.locator("#btn-more-fonts").click();
  await page.locator(`#font-panel [data-font="${fontId}"]`).click();
  await expect(page.locator("#font-panel")).toBeHidden();
}

test("a mark goes on and off the selection, and stacks with another", async ({ page }) => {
  await start(page, "Hi you");
  await page.locator("#btn-marks").click();
  await mark(page, "strike").click();
  await expect(out(page)).toHaveText(`H${S}i${S} y${S}o${S}u${S}`);
  await expect(mark(page, "strike")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#btn-marks")).toHaveClass(/active/);

  await mark(page, "underline").click();
  await expect(out(page)).toHaveText(`H${S}${U}i${S}${U} y${S}${U}o${S}${U}u${S}${U}`);

  await mark(page, "strike").click();
  await expect(out(page)).toHaveText(`H${U}i${U} y${U}o${U}u${U}`);
  await page.locator("#btn-marks-clear").click();
  await expect(out(page)).toHaveText("Hi you");
  await expect(page.locator("#btn-marks")).not.toHaveClass(/active/);
});

test("marks sit on top of the font, and stay when the font changes", async ({ page }) => {
  await start(page, "Ab");
  await page.locator("#btn-marks").click();
  await mark(page, "strike").click();
  await page.keyboard.press("Escape");
  await page.locator("#font-select").click();
  await page.locator('#font-menu [data-font="sans"]').click();
  await expect(out(page)).toHaveText(`𝖠${S}𝖻${S}`);
});

test("on part of the text a mark shows as mixed; tapping it puts it on all", async ({ page }) => {
  const editor = await start(page, "ab cd");
  // mark only "ab"
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.locator("#btn-marks").click();
  await mark(page, "slash").click();
  await expect(out(page)).toHaveText("a̸b̸ cd");

  await page.keyboard.press("Escape");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator("#btn-marks").click();
  await expect(mark(page, "slash")).toHaveAttribute("aria-pressed", "mixed");
  await mark(page, "slash").click();
  await expect(out(page)).toHaveText("a̸b̸ c̸d̸");
});

test("typing after picking a mark with nothing selected carries the mark", async ({ page }) => {
  const editor = await start(page, "x");
  await page.keyboard.press("End");
  await page.locator("#btn-marks").click();
  await mark(page, "underline").click();
  await editor.pressSequentially("yz");
  await expect(out(page)).toHaveText(`xy${U}z${U}`);
});

test("at most three marks at once; the rest are disabled", async ({ page }) => {
  await start(page, "a");
  await page.locator("#btn-marks").click();
  for (const id of ["strike", "underline", "overline"]) await mark(page, id).click();
  await expect(mark(page, "slash")).toBeDisabled();
  await expect(page.locator(".marks-note")).toContainText("Up to 3 marks");
  await mark(page, "overline").click();
  await expect(mark(page, "slash")).toBeEnabled();
});

test("a preset sets the font and its marks, and the font button shows its name", async ({ page }) => {
  await start(page, "Hello");
  await pickFromPanel(page, "glyphy-silicon-strikes");
  await expect(out(page)).toHaveText(`𝙷${S}𝚎${S}𝚕${S}𝚕${S}𝚘${S}`);
  await expect(page.locator("#font-select")).toContainText("Silicon Strikes");

  // changing a part of it turns it back into "a font + marks"
  await page.locator("#btn-marks").click();
  await expect(mark(page, "strike")).toHaveAttribute("aria-pressed", "true");
  await mark(page, "strike").click();
  await expect(out(page)).toHaveText("𝙷𝚎𝚕𝚕𝚘");
  await expect(page.locator("#font-select")).toContainText("Monospace");
});

test("a preset with bold italic sets both", async ({ page }) => {
  await start(page, "Hi");
  await pickFromPanel(page, "glyphy-vintage-gulls"); // serif bold italic + seagull
  await expect(out(page)).toHaveText("𝑯̼𝒊̼");
  await expect(page.locator("#btn-bold")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#btn-italic")).toHaveAttribute("aria-pressed", "true");
});

test("Small Caps and All Small Caps", async ({ page }) => {
  await start(page, "Hello Queen");
  await pickFromPanel(page, "smallCaps");
  await expect(out(page)).toHaveText("Hᴇʟʟᴏ Qᴜᴇᴇɴ");
  await page.keyboard.press("ControlOrMeta+A");
  await pickFromPanel(page, "tiny");
  await expect(out(page)).toHaveText("ʜᴇʟʟᴏ ǫᴜᴇᴇɴ");
  await expect(page.locator("#font-select")).toContainText("All Small Caps");
});

test("phone: the marks menu fits the screen and its buttons are finger-sized", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await start(page, "a");
  await page.locator("#btn-marks").tap();
  const box = (await page.locator("#marks-menu").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  const btn = (await mark(page, "strike").boundingBox())!;
  expect(btn.height).toBeGreaterThanOrEqual(44);
  // the toolbar still fits on one row
  const tb = (await page.locator("#toolbar").boundingBox())!;
  expect(tb.height).toBeLessThan(70);
  await ctx.close();
});
