/** Reference pages (fonts, bullets, dividers): copy on tap, and the fonts page's live preview. */
import { bootChrome } from "./chrome";
import { renderSample } from "../fonts/uiFonts";

bootChrome();

const status = document.getElementById("copy-status");
let statusTimer = 0;

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // older browsers, or no clipboard permission: copy through a hidden field
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}

document.addEventListener("click", async (e) => {
  const button = (e.target as Element).closest<HTMLButtonElement>("button[data-copy], button[data-copy-from]");
  if (!button) return;
  const text =
    button.dataset.copy ?? (button.previousElementSibling as HTMLElement | null)?.textContent ?? "";
  if (!text) return;
  const ok = await copy(text);
  button.classList.remove("copied", "failed");
  void button.offsetWidth; // restart the flash if tapped twice
  button.classList.add(ok ? "copied" : "failed");
  if (button.classList.contains("fx-copy")) {
    button.textContent = ok ? "Copied" : "Try again";
    window.setTimeout(() => (button.textContent = "Copy"), 1400);
  }
  if (status) {
    status.textContent = ok ? "Copied" : "Couldn't copy. Select the text and copy it yourself.";
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => (status.textContent = ""), 2000);
  }
});

const input = document.querySelector<HTMLInputElement>("#fx-text");
if (input) {
  const samples = [...document.querySelectorAll<HTMLElement>(".fx-sample")];
  const render = () => {
    const text = input.value || input.defaultValue;
    for (const el of samples) {
      el.textContent = renderSample(el.dataset.font!, text, el.dataset.bold === "true", el.dataset.italic === "true");
    }
  };
  input.addEventListener("input", render);
  if (input.value !== input.defaultValue) render(); // restored by the browser on back/forward
}
