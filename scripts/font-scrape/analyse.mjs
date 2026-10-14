// Turn the raw LingoJam capture into per-character mappings, drop what the
// engine already has, and report gaps.
//
//   npx vite-node scripts/font-scrape/analyse.mjs
//
// Writes src/fonts/scraped/lingojam.ts (the mappings) and REPORT.md next to this
// file. vite-node because it imports the engine's TypeScript to compare against.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BASE_FONTS, resolveVariantMap } from "../../src/fonts/mappings";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const raw = JSON.parse(readFileSync(here("./lingojam.raw.json"), "utf8"));
const CHARS = [...raw.input];
const LETTERS = CHARS.filter((c) => /[A-Za-z]/.test(c));
const DIGITS = CHARS.filter((c) => /[0-9]/.test(c));

// ── what the engine already has: every variant of every font ──
const existing = [];
for (const font of BASE_FONTS)
  for (const [bold, italic, tag] of [[false, false, ""], [true, false, " bold"], [false, true, " italic"], [true, true, " bold italic"]]) {
    const map = resolveVariantMap(font.id, bold, italic);
    const table = Object.fromEntries(CHARS.map((c) => [c, map?.get(c) ?? c]));
    const key = JSON.stringify(table);
    if (!existing.some((e) => e.key === key)) existing.push({ name: `${font.label}${tag}`, table, key });
  }
const existingIds = new Set(BASE_FONTS.map((f) => f.id));
// A font that matches an engine font on at least this many of the 52 letters is
// the same font with different gap-filling, not a new one.
const NEAR_SAME = 39;

const commonPrefix = (strs) => {
  let p = strs[0];
  for (const s of strs) while (!s.startsWith(p)) p = p.slice(0, -1);
  return p;
};
const commonSuffix = (strs) => {
  let p = strs[0];
  for (const s of strs) while (!s.endsWith(p)) p = p.slice(1);
  return p;
};
const same = (a, b, keys) => keys.every((k) => a[k] === b[k]);
const label = (name) =>
  name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const cps = (s) => [...s].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");

// Usable as fonts, but left out of the app on purpose.
const LEFT_OUT = {
  blueBold: "flag-letter emoji held apart by invisible spaces",
  wingdings: "unreadable symbols",
  symbolQ: "decorative symbols that don't read as letters",
  squiggle2: "lower-case only: every capital is left plain",
};

const seenNames = new Map();
const kept = [];
const report = { exists: [], duplicate: [], notAMapping: [], noChange: [], leftOut: [] };
const reject = (name, why) => {
  const base = name.replace(/\d+$/, "");
  const prior = report.notAMapping.find((e) => e.base === base && e.why === why);
  if (prior) prior.count++;
  else report.notAMapping.push({ name, base, why, count: 1 });
};

raw.names.forEach((rawName, i) => {
  const n = (seenNames.get(rawName) ?? 0) + 1;
  seenNames.set(rawName, n);
  const name = n === 1 ? rawName : `${rawName}${n}`;
  const full = raw.full[i];
  const per = Object.fromEntries(CHARS.map((c) => [c, raw.perChar[c][i]]));

  // Is it a per-character substitution at all?
  if (full !== raw.fullAgain[i]) return void reject(name, "random: a different result each time");
  let table = per;
  let wrapper = "";
  if (CHARS.map((c) => per[c]).join("") !== full) {
    const pre = commonPrefix(Object.values(per));
    const suf = commonSuffix(Object.values(per).map((s) => s.slice(pre.length)));
    const inner = Object.fromEntries(CHARS.map((c) => [c, per[c].slice(pre.length, per[c].length - suf.length)]));
    const joined = CHARS.map((c) => inner[c]).join("");
    if (pre + joined + suf === full) {
      table = inner;
      wrapper = `${pre}…${suf}`;
    } else if (CHARS.map((c) => inner[c]).reverse().join("") === full.slice(pre.length, full.length - suf.length)) {
      return void reject(name, "reverses the order of the text");
    } else {
      const body = full.slice(pre.length, full.length - suf.length);
      const sep = body.slice(inner[CHARS[0]].length, body.indexOf(inner[CHARS[1]], inner[CHARS[0]].length));
      const joins = sep !== "" && CHARS.map((c) => inner[c]).join(sep) === body;
      return void reject(
        name,
        joins
          ? `puts ${JSON.stringify(sep)} between characters (not after each one), so it can't be applied one character at a time`
          : "the result for the whole text isn't the per-character results put together",
      );
    }
  }
  if (same(table, Object.fromEntries(CHARS.map((c) => [c, c])), CHARS))
    return wrapper
      ? void reject(name, `only wraps the text (${wrapper}); the characters themselves don't change`)
      : void report.noChange.push({ name });

  // Already in the engine? Letters decide; digits are noted.
  const hit = existing
    .map((e) => ({ e, n: LETTERS.filter((c) => e.table[c] === table[c]).length }))
    .sort((a, b) => b.n - a.n)[0];
  if (hit.n >= NEAR_SAME)
    return void report.exists.push({
      name,
      as: hit.e.name,
      differing: LETTERS.filter((c) => hit.e.table[c] !== table[c]),
      digitsDiffer: !same(hit.e.table, table, DIGITS),
    });
  const dup = kept.find((k) => same(k.table, table, CHARS));
  if (dup) return void report.duplicate.push({ name, of: dup.name });

  if (LEFT_OUT[name]) return void report.leftOut.push({ name, why: LEFT_OUT[name] });

  const unmapped = CHARS.filter((c) => table[c] === c);
  const empty = CHARS.filter((c) => table[c] === "");
  const folded = LETTERS.filter((c) => c !== c.toLowerCase() && table[c] !== c && table[c] === table[c.toLowerCase()]);
  const multi = CHARS.filter((c) => [...table[c]].length > 1);
  const notes = [];
  if (wrapper) notes.push(`the site also adds “${wrapper}” around the text; left out`);
  if (multi.length) {
    const marks = multi.some((c) => /\p{M}/u.test(table[c]));
    const invisible = multi.some((c) => /[​-‍﻿︎️]/u.test(table[c]));
    notes.push(`${multi.length} characters become more than one code point${marks ? " (combining marks)" : ""}${invisible ? " (includes invisible characters)" : ""}, so they count as more than one character against a platform limit`);
  }
  if (existingIds.has(name)) throw new Error(`id clash with an engine font: ${name}`);
  kept.push({ name, label: label(name), table, unmapped, empty, folded, notes });
});

// ── mappings file ──
const q = (s) => JSON.stringify(s);
const ts = `// GENERATED by scripts/font-scrape/analyse.mjs — do not edit by hand.
// Source: ${raw.source} (captured ${raw.scrapedAt.slice(0, 10)}).
// Each font maps ${CHARS.length} characters (A-Z, a-z, 0-9) to what the site produced for it.
// A character missing from \`map\` has no substitute in that font and passes through.

export type ScrapedFont = {
  /** Name the source site's generator uses for this style. */
  id: string;
  label: string;
  map: Record<string, string>;
};

export const LINGOJAM_FONTS: ScrapedFont[] = [
${kept
  .map(
    (f) =>
      `  {\n    id: ${q(f.name)},\n    label: ${q(f.label)},\n    map: {${CHARS.filter((c) => f.table[c] !== c && f.table[c] !== "")
        .map((c) => `${/[0-9]/.test(c) ? q(c) : c}: ${q(f.table[c])}`)
        .join(", ")}},\n  },`,
  )
  .join("\n")}
];
`;
mkdirSync(here("../../src/fonts/scraped/"), { recursive: true });
writeFileSync(here("../../src/fonts/scraped/lingojam.ts"), ts);

// ── report ──
const list = (a) => (a.length ? a.join(" ") : "none");
const md = `# LingoJam font scrape — report

Source: ${raw.source}, captured ${raw.scrapedAt.slice(0, 10)}. Input: \`${raw.input}\`.
Generated by \`scripts/font-scrape/analyse.mjs\`; don't edit by hand.

${raw.names.length} styles on the site → **${kept.length} new fonts**, ${report.leftOut.length} left out on purpose, ${report.exists.length} already in the engine, ${report.duplicate.length} duplicates, ${report.notAMapping.reduce((n, e) => n + e.count, 0)} not usable as a per-character font, ${report.noChange.length} that change nothing.

## New fonts

| Font | Sample (\`Hello 123\`) | Characters without a mapping | Capital and lower-case share one glyph | Notes |
|---|---|---|---|---|
${kept
  .map((f) => {
    const sample = [..."Hello 123"].map((c) => f.table[c] ?? c).join("");
    return `| ${f.label} (\`${f.name}\`) | ${sample} | ${list([...f.unmapped, ...f.empty.map((c) => c + " (dropped)")])} | ${f.folded.length === 26 ? "all 26" : list(f.folded)} | ${f.notes.join("; ") || ""} |`;
  })
  .join("\n")}

Complete for all 62 characters, each capital distinct: ${list(kept.filter((f) => !f.unmapped.length && !f.empty.length && !f.folded.length).map((f) => "`" + f.name + "`"))}.

## Left out on purpose

${report.leftOut.map((e) => `- \`${e.name}\`: ${e.why}`).join("\n")}

## Already in the engine (ignored)

${report.exists
  .map(
    (e) =>
      `- \`${e.name}\` = ${e.as}${e.differing.length ? `, except ${e.differing.length} letters the site fills differently (${e.differing.join(" ")})` : ""}${e.digitsDiffer ? "; digits differ" : ""}`,
  )
  .join("\n")}

## Duplicates of another scraped font (ignored)

${report.duplicate.map((e) => `- \`${e.name}\` = \`${e.of}\``).join("\n") || "none"}

## Not usable as a per-character font

${report.notAMapping.map((e) => `- \`${e.name}\`${e.count > 1 ? ` (×${e.count})` : ""}: ${e.why}`).join("\n")}
${report.noChange.length ? "\n## No change to any character\n\n" + report.noChange.map((e) => `- \`${e.name}\``).join("\n") + "\n" : ""}`;
writeFileSync(here("./REPORT.md"), md);
console.log(md);
