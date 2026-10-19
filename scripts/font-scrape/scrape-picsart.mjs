// Scrape https://tools.picsart.com/text/font-generator/ and its style pages (the
// case converter isn't a font, so it's skipped). Writes picsart.raw.json;
// analyse.mjs turns that into mappings.
//
//   PW_CHROMIUM=… node scripts/font-scrape/scrape-picsart.mjs
import { fileURLToPath } from "node:url";
import { captureSite } from "./capture.mjs";

const BASE = "https://tools.picsart.com/text/font-generator/";
const STYLE_PAGES = ["bold", "cool", "cursive", "fancy", "glitch", "small", "symbols", "text-art"];

await captureSite(
  {
    source: BASE,
    pages: [BASE, ...STYLE_PAGES.map((p) => `${BASE}${p}/`)],
    host: "picsart.com",
    input: "#sticky-search-input",
    card: "[class*=FontRow-root]",
    text: "[class*=FontRow-generatedText]",
    name: "[class*=FontInfo-name]",
    category: "[class*=FontInfo-category]",
    loadMore: /load more fonts/i,
  },
  fileURLToPath(new URL("./picsart.raw.json", import.meta.url)),
);
