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
  await page.goto("/");
  await expect(page.locator("#brand")).toContainText("instastylr");
  // First-run welcome modal — dismiss it before touching the editor.
  await page.locator("#btn-welcome-skip").click({ timeout: 5000 }).catch(() => {});
  const editor = page.locator(".editor");
  await editor.click();
  return editor;
}

test("loads blank with the welcome modal and an empty projection", async ({ page }) => {
  await page.goto("/");
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
  await page.locator("#font-select").selectOption("sans");

  await expect(page.locator("#output-body")).toHaveText("𝖧𝖾𝗅𝗅𝗈");
});

test("a font with no bold variant disables Bold and shows a strip advisory", async ({ page }) => {
  const editor = await start(page);
  await editor.pressSequentially("hello");
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator("#btn-bold").click(); // bold serif

  await page.locator("#font-select").selectOption("mono");

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
