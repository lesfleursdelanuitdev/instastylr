import { describe, expect, it } from "vitest";
import { generatePages } from "./generate";
import fontsHtml from "../../fonts/index.html?raw";
import bulletsHtml from "../../symbols/bullets/index.html?raw";
import dividersHtml from "../../symbols/dividers/index.html?raw";
import sitemap from "../../public/sitemap.xml?raw";
import viteConfig from "../../vite.config.ts?raw";

const committed: Record<string, string> = {
  "fonts/index.html": fontsHtml,
  "symbols/bullets/index.html": bulletsHtml,
  "symbols/dividers/index.html": dividersHtml,
};

const pages = generatePages();

describe("generated reference pages", () => {
  it.each(pages.map((p) => [p.file, p.html]))("%s is up to date (run `npm run pages`)", (file, html) => {
    expect(committed[file]).toBe(html);
  });

  it.each(pages.map((p) => [p.file, p.html]))("%s has one h1, a short description and a canonical", (_file, html) => {
    expect(html.match(/<h1>/g)).toHaveLength(1);
    const desc = html.match(/<meta name="description" content="([^"]*)"/)![1];
    expect(desc.length).toBeGreaterThan(70);
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/instastylr\.lesfleursdelanuit\.com\/[a-z/]+\/"/);
  });

  it("lists every font's sample with a copy button", () => {
    const fonts = pages.find((p) => p.file === "fonts/index.html")!.html;
    expect(fonts).toContain('data-font="script"');
    expect(fonts).toContain('data-font="tiny"');
    expect(fonts).toContain("𝐇𝐞𝐥𝐥𝐨"); // serif bold
  });

  it("escapes symbols that are HTML syntax", () => {
    const dividers = pages.find((p) => p.file === "symbols/dividers/index.html")!.html;
    expect(dividers).not.toMatch(/data-copy="[^"]*<[^"]*"/);
  });

  it("is listed in the sitemap and the build", () => {
    for (const p of pages) {
      expect(sitemap).toContain(`/${p.file.replace(/index\.html$/, "")}</loc>`);
      expect(viteConfig).toContain(`"./${p.file}"`);
    }
  });
});
