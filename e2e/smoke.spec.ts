import { test, expect } from "@playwright/test";

/**
 * Real-browser smoke test: drives the actual app in Chromium to confirm the
 * editor → projection → output loop works end-to-end (not just in headless
 * unit tests). Clears the seeded template, then exercises typing + toolbar.
 */

async function clearEditor(page: import("@playwright/test").Page) {
  const editor = page.locator(".editor-input");
  await editor.click();
  // Wait for the first-run template to finish seeding before we clear, so we
  // don't race the populate effect.
  await expect(editor).toContainText("Your headline");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  return editor;
}

test("loads and projects the default template", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Instastylr" })).toBeVisible();

  const output = page.locator(".output-text");
  await expect(output).toContainText("𝐘𝐨𝐮𝐫 𝐡𝐞𝐚𝐝𝐥𝐢𝐧𝐞 𝐡𝐞𝐫𝐞"); // bold headline
  await expect(output).toContainText("• 📍 Location"); // bullet emitted as Unicode
  await expect(page.locator(".char-count")).toContainText("/ 2,200");
});

test("typing + Bold yields substituted Unicode in the output", async ({ page }) => {
  await page.goto("/");
  const editor = await clearEditor(page);

  await editor.pressSequentially("hello");
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator('button[title^="Bold"]').click();

  await expect(page.locator(".output-text")).toHaveText("𝐡𝐞𝐥𝐥𝐨");
});

test("font dropdown restyles the selection", async ({ page }) => {
  await page.goto("/");
  const editor = await clearEditor(page);

  await editor.pressSequentially("Hello");
  await page.keyboard.press("ControlOrMeta+A");
  await page.locator(".tb-font select").selectOption("sans");

  await expect(page.locator(".output-text")).toHaveText("𝖧𝖾𝗅𝗅𝗈");
});

test("copy button reports success", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await clearEditor(page);
  await page.locator(".editor-input").pressSequentially("hi");

  const copyBtn = page.getByRole("button", { name: "Copy" });
  await copyBtn.click();
  await expect(page.getByRole("button", { name: "Copied ✓" })).toBeVisible();
});
