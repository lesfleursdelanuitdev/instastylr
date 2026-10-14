import { test, expect, type Page } from "@playwright/test";

/**
 * Real-browser smoke test: drives the actual app in Chromium to confirm the
 * editor → projection → output loop and the document state machine work
 * end-to-end (not just in headless unit tests).
 *
 * Each test gets a fresh browser context, so localStorage is empty: the editor
 * starts blank, the draft is unsaved, and the first-run welcome modal shows.
 * `start()` dismisses the modal and returns the focused editor.
 */
async function start(page: Page) {
  await page.goto("/app/");
  await expect(page.locator("#brand")).toContainText("instastylr");
  // First-run welcome modal — dismiss it before touching the editor.
  await page.locator("#btn-welcome-skip").click({ timeout: 5000 }).catch(() => {});
  const editor = page.locator(".editor");
  await editor.click();
  return editor;
}

test("loads blank with the welcome modal and an empty projection", async ({ page }) => {
  await page.goto("/app/");
  await expect(page.locator("#brand")).toContainText("instastylr");
  await expect(page.locator("#welcome-modal")).toBeVisible();

  await page.locator("#btn-welcome-skip").click();
  await expect(page.locator("#welcome-modal")).toBeHidden();

  await expect(page.locator("#output-body")).toContainText("Your styled text will appear here");
  await expect(page.locator("#ig-stat")).toContainText("2,200 left for IG");
  await expect(page.locator("#doc-title .doc-name")).toHaveText("Untitled");
});

test("typing projects into the output and updates the counters", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("hello world");

  await expect(page.locator("#output-body")).toContainText("hello world");
  await expect(page.locator("#char-stat")).toContainText("11 chars");
});

test("Bold yields substituted Unicode in the output", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("hello");
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator("#btn-bold").click();

  await expect(page.locator("#output-body")).toHaveText("𝐡𝐞𝐥𝐥𝐨");
});

test("font dropdown restyles the selection", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("Hello");
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator("#font-select").click();
  await page.locator('#font-menu [data-font="sans"]').click();

  await expect(page.locator("#output-body")).toHaveText("𝖧𝖾𝗅𝗅𝗈");
});

test("a font with no bold variant disables Bold and shows a strip advisory", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("hello");
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator("#btn-bold").click(); // bold serif

  // Monospace isn't in the toolbar's short list: it lives in the font panel.
  await page.locator("#font-select").click();
  await page.locator("#btn-more-fonts").click();
  await page.locator('#font-panel [data-font="mono"]').click();
  await expect(page.locator("#font-panel")).toBeHidden();

  // Bold can't be expressed in Monospace → button disabled, the bit was stripped,
  // and a suppressible advisory toast explains why.
  await expect(page.locator("#btn-bold")).toBeDisabled();
  await expect(page.locator("#toast-msg")).toContainText("Monospace");
  await expect(page.locator("#toast-action")).toHaveText("Don’t show again");
});

test("copy button reports success", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const editor = await start(page);
  await editor.pressSequentially("hi");

  await page.locator("#copy-btn").click();
  await expect(page.locator("#copy-text")).toHaveText("Copied!");
});

test("save binds an identity, then edits offer Update", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("trip caption");

  // Untitled draft → header Save is enabled and opens the saves panel to name it.
  const saveBtn = page.locator("#btn-save-hdr");
  await expect(saveBtn).toBeEnabled();
  await expect(saveBtn).toContainText("Save");
  await saveBtn.click();

  await page.locator("#save-name-input").fill("My Trip");
  await page.locator("#btn-do-save").click();

  // Bound now: title shows the name and Save collapses to a disabled "Saved".
  await expect(page.locator("#doc-title .doc-name")).toHaveText("My Trip");
  await page.locator("#btn-close-panel").click();
  await expect(saveBtn).toContainText("Saved");
  await expect(saveBtn).toBeDisabled();

  // Edit → dirty → control becomes "Update"; clicking it commits in place.
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.type("!");
  await expect(saveBtn).toContainText("Update");
  await saveBtn.click();
  await expect(page.locator("#toast-msg")).toContainText('Updated "My Trip"');
});

test("bullet handle changes a bulleted list's marker (preset + custom)", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("item one");

  // Lists live in the More menu now: open it, then toggle a bulleted list.
  await page.locator("#btn-more").click();
  await page.locator("#btn-ul").click();
  await expect(page.locator("#output-body")).toContainText("• item one");

  // A handle is anchored to the list; opening it reveals the bullet picker.
  const handle = page.locator("#bullet-handle .bullet-handle-btn");
  await expect(handle).toBeVisible();
  await handle.click();

  // Pick the "+" preset → projection re-emits with the new marker.
  await page.locator(".bullet-swatch", { hasText: "+" }).click();
  await expect(page.locator("#output-body")).toContainText("+ item one");

  // Custom field: any single character (here an emoji) becomes the bullet.
  await page.locator(".bullet-custom input").fill("✿");
  await page.locator(".bullet-custom-apply").click();
  await expect(page.locator("#output-body")).toContainText("✿ item one");
});

test("custom bullet input stays open when the viewport scrolls (mobile keyboard)", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("item one");

  await page.locator("#btn-more").click();
  await page.locator("#btn-ul").click();

  const handle = page.locator("#bullet-handle .bullet-handle-btn");
  await handle.click();
  const input = page.locator(".bullet-custom input");
  await input.click();

  // Mobile keyboards resize/scroll the visual viewport; the menu must not unmount.
  await page.evaluate(() => {
    window.dispatchEvent(new Event("scroll", { bubbles: true }));
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("#bullet-menu")).toBeVisible();
  await expect(input).toBeFocused();

  await input.fill("✿");
  await page.locator(".bullet-custom-apply").click();
  await expect(page.locator("#output-body")).toContainText("✿ item one");
});

test("reset on an unsaved draft asks for confirmation", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("draft text");

  await page.locator("#btn-reset").click();
  await expect(page.locator(".confirm-box")).toBeVisible();
  await expect(page.locator(".confirm-title")).toHaveText("Start fresh?");

  // Cancel keeps the draft…
  await page.locator(".confirm-cancel").click();
  await expect(page.locator(".confirm-box")).toBeHidden();
  await expect(page.locator("#output-body")).toContainText("draft text");

  // …confirming clears it.
  await page.locator("#btn-reset").click();
  await page.locator(".confirm-ok").click();
  await expect(page.locator("#output-body")).toContainText("Your styled text will appear here");
});

test("font panel: slides in from More fonts, filters by style, closes", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("Hello");
  await page.keyboard.press("ControlOrMeta+A");

  // The toolbar menu is the short list plus the way into the panel.
  await page.locator("#font-select").click();
  await expect(page.locator("#font-menu [role=option]")).toHaveCount(4);
  await page.locator("#btn-more-fonts").click();
  const panel = page.locator("#font-panel");
  await expect(panel).toBeVisible();
  await expect(page.locator("#font-menu")).toHaveCount(0);

  const rows = panel.locator(".font-row");
  const all = await rows.count();
  expect(all).toBeGreaterThan(30);

  // Rows preview the selected text ("Hello"), not the stock sample.
  await expect(panel.locator('[data-font="currency"] .font-row-sample')).toHaveText("ⱧɆⱠⱠØ");
  await expect(panel.locator(".font-sample-note")).toBeVisible();

  // "Has" filter: which styled alphabets a font comes with.
  await panel.locator('[data-filter="bold"]').click();
  await expect(rows).toHaveCount(4);
  await panel.locator('[data-filter="italic"]').click();
  await expect(rows).toHaveCount(2);
  await panel.locator('[data-filter="boldItalic"]').click();
  await expect(rows).toHaveCount(2);
  await panel.locator('[data-filter="any"]').click();
  await expect(rows).toHaveCount(all);

  // Style filter, and both together (an impossible pair shows a way back).
  await panel.locator('[data-style="script"]').click();
  await expect(rows).toHaveCount(1);
  await panel.locator('[data-style="boxed"]').click();
  await expect(rows).toHaveCount(6);
  await panel.locator('[data-filter="bold"]').click();
  await expect(rows).toHaveCount(0);
  await panel.locator(".font-empty-reset").click();
  await expect(rows).toHaveCount(all);

  // Picking applies the font to the selection and closes the panel.
  await panel.locator('[data-font="currency"]').click();
  await expect(panel).toBeHidden();
  await expect(page.locator("#output-body")).toHaveText("ⱧɆⱠⱠØ");
  await expect(page.locator("#font-select")).toContainText("Currency");

  // Fonts applied from the panel show up in the menu under "Recent" (the short
  // list's own fonts don't), and in the panel's Recent filter, newest first.
  await page.locator("#font-select").click();
  await page.locator('#font-menu [data-font="sans"]').click();
  await page.locator("#font-select").click();
  await expect(page.locator("#font-menu .font-menu-recent [role=option]")).toHaveCount(1);
  await expect(page.locator('#font-menu .font-menu-recent [data-font="currency"]')).toBeVisible();
  await page.locator("#btn-more-fonts").click();
  await panel.locator('[data-font="tiny"]').click();
  await page.locator("#font-select").click();
  await expect(page.locator("#font-menu .font-menu-recent [role=option]")).toHaveCount(2);
  await expect(page.locator("#font-menu .font-menu-recent [role=option]").first()).toHaveAttribute("data-font", "tiny");
  await page.locator("#btn-more-fonts").click();
  await panel.locator('[data-style="recent"]').click();
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toHaveAttribute("data-font", "tiny");
  await page.keyboard.press("Escape");

  // With nothing selected the rows fall back to the stock sample, and the filters reset.
  await page.keyboard.press("End");
  await page.locator("#font-select").click();
  await page.locator("#btn-more-fonts").click();
  await expect(panel.locator('[data-font="sans"] .font-row-sample')).toHaveText("𝖧𝖾𝗅𝗅𝗈 𝖶𝗈𝗋𝗅𝖽 𝟣𝟤𝟥");
  await expect(panel.locator(".font-sample-note")).toHaveCount(0);
  await expect(rows).toHaveCount(all);
  await page.keyboard.press("Escape");

  // Close button and Escape both dismiss it without changing the font.
  await page.locator("#font-select").click();
  await page.locator("#btn-more-fonts").click();
  await panel.locator(".btn-close-panel").click();
  await expect(panel).toBeHidden();
  await page.locator("#font-select").click();
  await page.locator("#btn-more-fonts").click();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page.locator("#output-body")).toHaveText("ʜᴇʟʟᴏ"); // still Tiny: closing never changes the font
});

test("divider editor: stays open while editing, applies, closes three ways", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("above");
  await page.locator("#btn-more").click();
  await page.locator("#btn-divider").click();
  await expect(page.locator("#output-body")).toContainText("━━━━━━━━━━");

  // Tapping the divider opens its editor as a floating panel.
  await page.locator(".i-divider-line").click();
  const menu = page.locator("#divider-menu");
  await expect(menu).toBeVisible();

  // Every control works without the panel closing (it used to close on the first press).
  await menu.locator(".i-divider-swatch", { hasText: "======" }).first().click();
  await expect(menu).toBeVisible();
  await expect(page.locator("#output-body")).toContainText("=====");
  await menu.locator(".divider-tab", { hasText: "Line" }).click();
  await menu.locator('.divider-field input[type="text"]').fill("*");
  await menu.locator('.divider-field input[type="range"]').first().fill("6");
  await menu.locator(".divider-apply").click();
  await expect(menu).toBeVisible();
  await expect(page.locator("#output-body")).toContainText("******");

  await menu.locator(".float-panel-close").click();
  await expect(menu).toHaveCount(0);
  await page.locator(".i-divider-line").click();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await page.locator(".i-divider-line").click();
  await expect(menu).toBeVisible();
  await page.locator("#output-body").click();
  await expect(menu).toHaveCount(0);
  await expect(page.locator("#output-body")).toContainText("******");
});

test("bullet and divider panels resize by dragging or with the arrow keys, and remember it", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("item one");
  await page.locator("#btn-more").click();
  await page.locator("#btn-ul").click();
  await page.locator("#bullet-handle .bullet-handle-btn").click();
  const bullet = page.locator("#bullet-menu");
  const before = (await bullet.boundingBox())!;

  // Mouse drag on the corner grip.
  const grip = (await bullet.locator(".resize-grip").boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 120, grip.y + 80, { steps: 5 });
  await page.mouse.up();
  const after = (await bullet.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width + 100);
  expect(after.height).toBeGreaterThan(before.height + 60);

  // Arrow keys on the grip, in 16px steps.
  await bullet.locator(".resize-grip").focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  const keyed = (await bullet.boundingBox())!;
  expect(Math.round(keyed.width)).toBe(Math.round(after.width) - 16);
  expect(Math.round(keyed.height)).toBe(Math.round(after.height) - 16);

  // The size survives closing and reopening.
  await page.keyboard.press("Escape");
  await page.locator("#bullet-handle .bullet-handle-btn").click();
  const again = (await bullet.boundingBox())!;
  expect(Math.round(again.width)).toBe(Math.round(keyed.width));

  // The divider panel has the same grip.
  await page.keyboard.press("Escape");
  await page.locator("#btn-more").click();
  await page.locator("#btn-divider").click();
  await page.locator(".i-divider-line").click();
  const divider = page.locator("#divider-menu");
  const d0 = (await divider.boundingBox())!;
  await divider.locator(".resize-grip").focus();
  await page.keyboard.press("ArrowLeft");
  const d1 = (await divider.boundingBox())!;
  expect(Math.round(d1.width)).toBe(Math.round(d0.width) - 16);
});

test("a font picked before the editor was ever focused still applies and shows everywhere", async ({ page, browser }) => {
  await page.goto("/app/");
  await page.locator("#btn-welcome-skip").click();
  // Straight to the panel, never having clicked into the editor.
  await page.locator("#font-select").click();
  await page.locator("#btn-more-fonts").click();
  await page.locator('#font-panel [data-font="currency"]').click();
  await expect(page.locator("#font-select")).toContainText("Currency");
  await expect(page.locator("#font-stat")).toHaveText("Currency");
  await page.keyboard.type("Hi");
  await expect(page.locator("#output-body")).toHaveText("Ⱨł");

  // Same through the menu, in a fresh browser (the draft is kept when a page is left).
  page = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
  await page.goto("/app/");
  await page.locator("#btn-welcome-skip").click();
  await page.locator("#font-select").click();
  await page.locator('#font-menu [data-font="script"]').click();
  await expect(page.locator("#font-select")).toContainText("Script");
  await expect(page.locator("#font-stat")).toHaveText("Script");
  await page.keyboard.type("Hi");
  await expect(page.locator("#output-body")).toHaveText("ℋ𝒾");
});

test("a shortcut can't store bold or italic in a font that has neither", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("Hello");
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator("#font-select").click();
  await page.locator("#btn-more-fonts").click();
  await page.locator('#font-panel [data-font="mono"]').click();
  await page.keyboard.press("ControlOrMeta+B");
  await page.keyboard.press("ControlOrMeta+I");
  await page.locator("#font-select").click();
  await page.locator('#font-menu [data-font="serif"]').click();
  await expect(page.locator("#output-body")).toHaveText("Hello"); // no hidden bold/italic surfacing
});

test("Tab nests a list item (with the pair's sub-marker), Shift+Tab un-nests, Tab elsewhere leaves the editor", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("one");
  await page.locator("#btn-more").click();
  await page.locator("#btn-ul").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".editor")).toBeFocused(); // closing the menu keeps the caret
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("two");
  await page.keyboard.press("Tab");
  await expect(page.locator("#output-body")).toHaveText("• one\n  ◦ two");
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#output-body")).toHaveText("• one\n• two");
});

test("the copy has no blank lines at either end, one around each divider, and the counts match it", async ({ page }) => {
  const editor = await start(page);
  await page.locator("#btn-more").click();
  await page.locator("#btn-divider").click(); // into an empty editor
  await editor.pressSequentially("after");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.locator("#output-body")).toHaveText("━━━━━━━━━━\n\nafter");
  await expect(page.locator("#word-stat")).toHaveText("1 word"); // the divider isn't a word
  await expect(page.locator("#line-stat")).toHaveText("3 lines");
  await expect(page.locator("#char-stat")).toHaveText("17 chars");
});

test("a saved post is still the open post after a reload", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("My caption");
  await page.locator("#btn-save-hdr").click();
  await page.locator("#save-name-input").fill("Trip");
  await page.locator("#btn-do-save").click();
  await page.reload();
  await expect(page.locator("#doc-title .doc-name")).toHaveText("Trip");
  await expect(page.locator("#btn-save-hdr")).toContainText("Saved");
  await page.locator(".editor").click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("!");
  await expect(page.locator("#btn-save-hdr")).toContainText("Update");
});
