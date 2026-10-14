/** Writes the generated reference pages (see src/pages/generate.ts). Run with `npm run pages`. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generatePages } from "../src/pages/generate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const { file, html } of generatePages()) {
  const out = join(root, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`wrote ${file}`);
}
