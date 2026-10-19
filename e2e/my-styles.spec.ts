import { test, expect, type Page } from "@playwright/test";
import { transformRun } from "../src/fonts/transform";

/**
 * "Save as my style": save the selection's font + bold/italic + marks under a
 * name, pick it again from the font menu or panel, rename and delete it.
 */
const KEY = "instastylr.myStyles.v1";
// Not the same look as any built-in preset (those would name the text instead).
const sunday = { id: "my-sunday", label: "Sunday post", font: "sans", bold: true, italic: false, marks: ["strike", "underline"] };
const sundayMarks = ["strike", "underline"];

async function start(page: Page, text: string) {
  await page.goto("/app/");
  await page.locator("#btn-welcome-skip").click({ timeout: 5000 }).catch(() => {});
  const editor = page.locator(".editor");
  await editor.click();
  await editor.pressSequentially(text);
  await page.keyboard.press("ControlOrMeta+A");
  return editor;
}

async function seed(page: Page, styles: unknown[]) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [KEY, JSON.stringify(styles)] as const,
  );
}

const out = (page: Page) => page.locator("#output-body");
const fontButton = (page: Page) => page.locator("#font-select");
const dialog = (page: Page) => page.locator("#style-dialog");

test("save the selection's look as a style; it names the text and survives a reload", async ({ page }) => {
  await start(page, "Hi");
  await page.locator("#btn-bold").click();
  await page.locator("#btn-marks").click();
  await page.locator('#marks-menu [data-mark="strike"]').click();
  await page.keyboard.press("Escape");

  await fontButton(page).click();
  await page.locator("#btn-save-style").click();
  await expect(dialog(page)).toBeVisible();
  const name = page.locator("#style-name");
  // Serif bold + strike is a built-in preset, so its name is offered.
  await expect(name).toHaveValue("Classic Strikes");
  await expect(name).toBeFocused();
  await name.fill("Sunday post");
  await page.locator("#btn-style-save").click();
  await expect(dialog(page)).toBeHidden();

  await expect(fontButton(page)).toHaveAttribute("aria-label", "Font: Sunday post");
  await expect(out(page)).toHaveText(transformRun({ text: "Hi", fontId: "serif", bold: true, italic: false, marks: ["strike"] }));

  // The same look can't be saved twice.
  await fontButton(page).click();
  await page.locator("#btn-save-style").click();
  await expect(page.locator("#style-name-problem")).toContainText("Sunday post");
  await expect(page.locator("#btn-style-save")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();

  await page.reload();
  await fontButton(page).click();
  await expect(page.locator('#font-menu .font-menu-mine [data-font^="my-"]')).toHaveText(/Sunday post/);
});

test("saving needs one look, something added, and a name", async ({ page }) => {
  await start(page, "Plain");
  await fontButton(page).click();
  await page.locator("#btn-save-style").click();
  await expect(page.locator("#style-name-problem")).toContainText("just the Serif font");
  await expect(page.locator("#btn-style-save")).toBeDisabled();
  await page.locator("#style-dialog .confirm-cancel").click();
  await expect(dialog(page)).toBeHidden();

  // Two looks in the selection: the item explains instead of opening.
  const editor = page.locator(".editor");
  await page.keyboard.press("End");
  await page.keyboard.press("Shift+Home");
  await page.keyboard.press("Shift+ArrowRight");
  await page.locator("#btn-italic").click();
  await editor.press("ControlOrMeta+A");
  await fontButton(page).click();
  const save = page.locator("#btn-save-style");
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await expect(save).toContainText("one look");
  await save.click({ force: true });
  await expect(dialog(page)).toBeHidden();
  await page.keyboard.press("Escape");

  // Bold makes it a style; an empty name can't be saved.
  await editor.press("ControlOrMeta+Z");
  await editor.press("ControlOrMeta+A");
  await expect(page.locator("#btn-italic")).toHaveAttribute("aria-pressed", "false");
  await page.locator("#btn-bold").click();
  await fontButton(page).click();
  await page.locator("#btn-save-style").click();
  await page.locator("#style-name").fill("   ");
  await expect(page.locator("#btn-style-save")).toBeDisabled();
  await page.locator("#style-name").fill("Loud");
  await page.locator("#style-name").press("Enter");
  await expect(dialog(page)).toBeHidden();
  await expect(fontButton(page)).toHaveAttribute("aria-label", "Font: Loud");
});

test("a saved style applies from the menu and the panel", async ({ page }) => {
  await seed(page, [sunday]);
  await start(page, "Hi you");
  await fontButton(page).click();
  await page.locator('#font-menu [data-font="my-sunday"]').click();
  const want = transformRun({ text: "Hi you", fontId: "sans", bold: true, italic: false, marks: sundayMarks });
  await expect(out(page)).toHaveText(want);
  await expect(fontButton(page)).toHaveAttribute("aria-label", "Font: Sunday post");
  await expect(page.locator("#btn-bold")).toHaveAttribute("aria-pressed", "true");

  // Back to plain, then from the panel's Mine filter.
  await fontButton(page).click();
  await page.locator('#font-menu [data-font="serif"]').click();
  await page.locator("#btn-bold").click();
  await page.locator("#btn-marks").click();
  await page.locator("#btn-marks-clear").click();
  await page.keyboard.press("Escape");
  await expect(out(page)).toHaveText("Hi you");

  await fontButton(page).click();
  await page.locator("#btn-more-fonts").click();
  await page.locator('#font-panel [data-style="mine"]').click();
  await expect(page.locator("#font-panel .font-count")).toHaveText("1 font");
  await page.locator('#font-panel [data-font="my-sunday"]').click();
  await expect(page.locator("#font-panel")).toBeHidden();
  await expect(out(page)).toHaveText(want);
});

test("rename and delete in the panel; text keeps its look", async ({ page }) => {
  await seed(page, [sunday]);
  await start(page, "Hi");
  await fontButton(page).click();
  await page.locator('#font-menu [data-font="my-sunday"]').click();

  await fontButton(page).click();
  await page.locator("#btn-more-fonts").click();
  await page.locator('#font-panel [data-style="mine"]').click();
  await page.locator('#font-panel [data-rename="my-sunday"]').click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator("#style-name")).toHaveValue("Sunday post");
  await page.locator("#style-name").fill("Monday post");
  await page.locator("#btn-style-save").click();
  await expect(dialog(page)).toBeHidden();
  // Escape closed only the dialog before; the panel is still open.
  await expect(page.locator('#font-panel [data-font="my-sunday"]')).toContainText("Monday post");

  await page.locator('#font-panel [data-delete="my-sunday"]').click();
  await expect(page.locator(".confirm-box")).toContainText("Monday post");
  await page.locator(".confirm-ok").click();
  await expect(page.locator('#font-panel [data-font="my-sunday"]')).toHaveCount(0);
  await expect(page.locator("#font-panel .font-empty")).toContainText("Save as my style");
  await page.keyboard.press("Escape");
  await expect(page.locator("#font-panel")).toBeHidden();

  // The text still has the look; the button falls back to the plain font's name.
  await expect(out(page)).toHaveText(transformRun({ text: "Hi", fontId: "sans", bold: true, italic: false, marks: sundayMarks }));
  await expect(fontButton(page)).toHaveAttribute("aria-label", "Font: Sans-Serif");
});

test("Escape in the name box closes only the box, not the font panel", async ({ page }) => {
  await seed(page, [sunday]);
  await start(page, "Hi");
  await fontButton(page).click();
  await page.locator("#btn-more-fonts").click();
  await page.locator('#font-panel [data-rename="my-sunday"]').click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator("#font-panel")).toBeVisible();
});
