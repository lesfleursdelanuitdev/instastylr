/**
 * Still pictures of the app, drawn from the demo data:
 * `data-shot="styles:5"` = step 5 of the "styles" sequence.
 */
import { DEMOS } from "./demos";
import { createMock } from "./mock";

export function mountShots(): void {
  for (const slot of document.querySelectorAll<HTMLElement>("[data-shot]")) {
    const [name, step] = (slot.dataset.shot ?? "").split(":");
    const demo = DEMOS[name];
    if (!demo) continue;
    createMock(slot, { animate: false }).render(demo.at(Math.min(demo.steps - 1, Number(step) || 0)));
  }
}
