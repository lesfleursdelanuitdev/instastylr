// Scrape https://glyphy.io/font-generator and its style pages. Writes
// glyphy.raw.json; analyse.mjs turns that into mappings.
//
//   PW_CHROMIUM=… node scripts/font-scrape/scrape-glyphy.mjs
import { fileURLToPath } from "node:url";
import { captureSite } from "./capture.mjs";

const BASE = "https://glyphy.io/font-generator";
const STYLE_PAGES = [
  "big-text", "bold-text", "cool-text", "creepy-text", "cursed-text", "cursive-text",
  "discord-fonts", "facebook-fonts", "fancy-text", "glitch-text", "instagram-fonts",
  "italic-text", "small-text", "strikethrough-text", "stylish-text", "tiktok-fonts",
  "twitter-fonts", "underline-text", "upside-down-text", "weird-text", "whatsapp-fonts",
  "zalgo-text",
];

await captureSite(
  {
    source: BASE,
    pages: [BASE, ...STYLE_PAGES.map((p) => `${BASE}/${p}`)],
    host: "glyphy.io",
    input: "input[class*=Generator_input]",
    card: "[class*=FontCard_container]",
    text: "[class*=FontCard_text]",
    name: "[class*=FontCard_title]",
    category: "[class*=FontCard_tag__]", // "AA" or "Aa": the case marker, not the name
    loadMore: /load more fonts/i,
  },
  fileURLToPath(new URL("./glyphy.raw.json", import.meta.url)),
);
