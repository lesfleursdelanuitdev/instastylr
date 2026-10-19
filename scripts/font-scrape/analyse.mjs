// Turn the raw font-generator captures into per-character mappings, drop what the
// engine (or an earlier site) already has, and report gaps.
//
//   npx vite-node scripts/font-scrape/analyse.mjs
//
// Sites are read in order — LingoJam, Picsart, Glyphy — and a font is kept only the
// first time it turns up. Writes src/fonts/scraped/<site>.ts (the mappings) and
// REPORT.md next to this file. vite-node because it imports the engine's
// TypeScript to compare against.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BASE_FONTS, resolveVariantMap } from "../../src/fonts/mappings";
import { markByChar } from "../../src/fonts/marks";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const INPUT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CHARS = [...INPUT];
const LETTERS = CHARS.filter((c) => /[A-Za-z]/.test(c));
const DIGITS = CHARS.filter((c) => /[0-9]/.test(c));

// A font that matches another on at least this many of the 52 letters is the
// same font with different gap-filling, not a new one.
const NEAR_SAME = 39;

const camelLabel = (name) =>
  name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const slug = (name) =>
  name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const SOURCES = [
  {
    key: "lingojam",
    title: "LingoJam",
    exportName: "LINGOJAM_FONTS",
    // LingoJam names are its generator's identifiers (camelCase); ids predate the
    // other sites, so they stay unprefixed.
    id: (name) => name,
    label: camelLabel,
    // Within LingoJam only exact copies count as duplicates (as when it was first scraped).
    nearSameWithin: false,
    // Characters the site leaves plain that Unicode does have (taken from another site).
    gapFills: { tiny: { Q: "ǫ", q: "ǫ" } }, // Glyphy's "Lil Caps Lock"
    leftOut: {
      blueBold: "flag-letter emoji held apart by invisible spaces",
      wingdings: "unreadable symbols",
      symbolQ: "decorative symbols that don't read as letters",
      squiggle2: "lower-case only: every capital is left plain",
    },
  },
  {
    key: "picsart",
    title: "Picsart",
    exportName: "PICSART_FONTS",
    id: (name) => `picsart-${slug(name)}`,
    label: (name) => name,
    nearSameWithin: true,
    leftOut: {
      "Mirrored / Flipped": "swaps letters (A→Z, B→Y) as well as mirroring them: unreadable",
      Censored: "every character becomes the same block: unreadable",
      "Country Codes": "flag-letter emoji: two in a row become a country flag",
      "Emojis Text": "emoji pictures that don't read as letters",
      Hourglass: "decorative symbols that don't read as letters",
    },
  },
  {
    key: "glyphy",
    title: "Glyphy",
    exportName: "GLYPHY_FONTS",
    id: (name) => `glyphy-${slug(name)}`,
    label: (name) => name,
    nearSameWithin: true,
    leftOut: {
      "Big Brother": "every character becomes the same block: unreadable",
      Straightjacket: "flag-letter emoji held apart by spaces",
    },
  },
];

// ── what the engine already has: every variant of every font ──
const engine = [];
for (const font of BASE_FONTS)
  for (const [bold, italic, tag] of [[false, false, ""], [true, false, " bold"], [false, true, " italic"], [true, true, " bold italic"]]) {
    const map = resolveVariantMap(font.id, bold, italic);
    const table = Object.fromEntries(CHARS.map((c) => [c, map?.get(c) ?? c]));
    const key = JSON.stringify(table);
    if (!engine.some((e) => e.key === key)) engine.push({ name: `${font.label}${tag}`, table, key, fontId: font.id, bold, italic });
  }
const takenIds = new Set(BASE_FONTS.map((f) => f.id));
const takenLabels = new Set(BASE_FONTS.map((f) => f.label.toLowerCase()));

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
const lettersShared = (a, b) => LETTERS.filter((c) => a[c] === b[c]).length;

/** Every style a site showed, once each: LingoJam's flat capture, or the paged ones. */
function entriesOf(raw) {
  if (raw.names && !raw.pages) {
    const seen = new Map();
    return raw.names.map((rawName, i) => {
      const n = (seen.get(rawName) ?? 0) + 1;
      seen.set(rawName, n);
      return {
        name: n === 1 ? rawName : `${rawName}${n}`,
        category: "",
        pages: [raw.source],
        full: raw.full[i],
        fullAgain: raw.fullAgain[i],
        per: Object.fromEntries(CHARS.map((c) => [c, raw.perChar[c][i]])),
      };
    });
  }
  // Paged sites repeat a style on several pages: same name and same output is one
  // style; same name, different output gets a number.
  const out = [];
  for (const page of raw.pages)
    page.names.forEach((name, i) => {
      const full = page.full[i];
      const twin = out.find((e) => e.siteName === name && e.full === full);
      if (twin) return void twin.pages.push(page.url);
      const n = out.filter((e) => e.siteName === name).length + 1;
      out.push({
        siteName: name,
        name: n === 1 ? name : `${name} ${n}`,
        category: (page.categories[i] ?? "").replace(name, "").trim(),
        pages: [page.url],
        full,
        fullAgain: page.fullAgain[i],
        per: Object.fromEntries(CHARS.map((c) => [c, page.perChar[c][i]])),
      });
    });
  return out;
}

/** The font panel's Style group for a new font (uiFonts.ts lists them), by what its letters are. */
const SMALL = /[\u1D00-\u1D2B\u1D2C-\u1D6A\u02B0-\u02FF\u2070-\u209F\uA730-\uA7FF\u0280-\u02AF]/u;
const ENCLOSED = /[\u2460-\u24FF\u2776-\u2793\u{1F100}-\u{1F1FF}\u3200-\u32FF]/u;
function styleOf(table) {
  const vals = LETTERS.map((c) => table[c]);
  const bare = (v) => v.replace(/[\p{M}\s]/gu, "");
  const share = (test) => vals.filter(test).length / vals.length;
  if (share((v) => ENCLOSED.test(v)) > 0.6) return "boxed";
  if (share((v) => SMALL.test(bare(v)) && [...bare(v)].length === 1) > 0.6) return "small";
  // the letter itself (plain or styled) with marks, or with symbols around it
  if (share((v) => /\p{M}/u.test(v) && [...bare(v)].length === 1) > 0.8) return "marked";
  if (share((v) => [...bare(v)].length > 1) > 0.8) return "boxed";
  return "lookalike";
}
// Combining marks left out wherever they appear (checked in a browser 2026-10-19).
const UNDRAWN_MARKS = [{ char: "\u20EB", name: "the long double slash (U+20EB)" }];

// Where the rule above guesses wrong.
const STYLE_OVERRIDES = {};

const allKept = []; // across sites, in order
const presets = []; // engine font + marks, from fontPlusMark
const results = [];

for (const src of SOURCES) {
  const file = here(`./${src.key}.raw.json`);
  if (!existsSync(file)) {
    console.log(`(no ${src.key}.raw.json — skipped)`);
    continue;
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  if (raw.input !== INPUT) throw new Error(`${src.key}: captured with a different input`);
  const entries = entriesOf(raw);
  const kept = [];
  const report = { exists: [], fontPlusMark: [], earlier: [], duplicate: [], notAMapping: [], noChange: [], leftOut: [] };
  const reject = (name, why) => {
    const base = name.replace(/\s*\d+$/, "");
    const prior = report.notAMapping.find((e) => e.base === base && e.why === why);
    if (prior) prior.count++;
    else report.notAMapping.push({ name, base, why, count: 1 });
  };

  for (const { name, category, pages, full, fullAgain, per } of entries) {
    // Is it a per-character substitution at all?
    if (full !== fullAgain) {
      reject(name, "random: a different result each time");
      continue;
    }
    if (/[\n\r]/.test(full)) {
      reject(name, "art over several lines, not a font");
      continue;
    }
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
        reject(name, "reverses the order of the text");
        continue;
      } else {
        const body = full.slice(pre.length, full.length - suf.length);
        const sep = body.slice(inner[CHARS[0]].length, body.indexOf(inner[CHARS[1]], inner[CHARS[0]].length));
        const joins = sep !== "" && CHARS.map((c) => inner[c]).join(sep) === body;
        reject(
          name,
          joins
            ? `puts ${JSON.stringify(sep)} between characters (not after each one), so it can't be applied one character at a time`
            : "the result for the whole text isn't the per-character results put together",
        );
        continue;
      }
    }
    // Some sites put a combining mark before each character as well as after it; the
    // leading one lands on the previous character and doubles its mark. Drop it.
    let leadingMarks = false;
    // (The odd character the site forgets still counts: Picsart skips lower-case a.)
    if (CHARS.filter((c) => /^\p{M}/u.test(table[c]) && /\p{M}$/u.test(table[c])).length >= CHARS.length - 3) {
      table = Object.fromEntries(CHARS.map((c) => [c, table[c].replace(/^\p{M}+/u, "")]));
      leadingMarks = true;
    }
    if (CHARS.filter((c) => table[c].trim() === "").length > CHARS.length / 2) {
      reject(name, "gives nothing (or only spaces) for a single character");
      continue;
    }
    if (same(table, Object.fromEntries(CHARS.map((c) => [c, c.toLowerCase()])), CHARS) || same(table, Object.fromEntries(CHARS.map((c) => [c, c.toUpperCase()])), CHARS)) {
      reject(name, "only changes upper or lower case");
      continue;
    }
    if (same(table, Object.fromEntries(CHARS.map((c) => [c, c])), CHARS)) {
      if (wrapper) reject(name, `only wraps the text (${wrapper}); the characters themselves don't change`);
      else report.noChange.push({ name });
      continue;
    }

    // Already in the engine? Letters decide; digits are noted.
    const hit = engine.map((e) => ({ e, n: lettersShared(e.table, table) })).sort((a, b) => b.n - a.n)[0];
    if (hit.n >= NEAR_SAME) {
      report.exists.push({
        name,
        as: hit.e.name,
        differing: LETTERS.filter((c) => hit.e.table[c] !== table[c]),
        digitsDiffer: !same(hit.e.table, table, DIGITS),
      });
      continue;
    }
    // Kept already from an earlier site?
    const prev = allKept.map((k) => ({ k, n: lettersShared(k.table, table) })).sort((a, b) => b.n - a.n)[0];
    if (prev && prev.n >= NEAR_SAME) {
      report.earlier.push({
        name,
        as: `${prev.k.label} (${prev.k.site})`,
        differing: LETTERS.filter((c) => prev.k.table[c] !== table[c]),
      });
      continue;
    }
    // Marks most phones and desktop browsers can't draw: the style would look plain.
    const unseen = UNDRAWN_MARKS.find((m) => CHARS.some((c) => table[c].includes(m.char)));
    if (unseen) {
      report.leftOut.push({ name, why: `uses ${unseen.name}, which most phones and browsers don't draw` });
      continue;
    }
    // (Checked after the earlier sites, so a plain-plus-mark style LingoJam already
    // has stays a duplicate of that.)
    // An engine font with the same mark(s) on every character: a font plus a mark,
    // not a new font. Listed apart, grouped by mark.
    const mark = commonSuffix(CHARS.map((c) => table[c]));
    if (mark && /^[\p{M}\s]+$/u.test(mark) && /\p{M}/u.test(mark)) {
      const base = Object.fromEntries(CHARS.map((c) => [c, table[c].slice(0, table[c].length - mark.length)]));
      const plain = Object.fromEntries(CHARS.map((c) => [c, c]));
      const b = engine.map((e) => ({ e, n: lettersShared(e.table, base) })).sort((x, y) => y.n - x.n)[0];
      // Plain letters plus a mark count too, except LingoJam's (saved posts use those as fonts).
      if (b.n >= NEAR_SAME && (src.key !== "lingojam" || lettersShared(plain, base) < NEAR_SAME)) {
        // A preset when every mark is one the Marks control offers (spaces dropped:
        // marks never go on spaces here).
        const chars = [...mark].filter((c) => /\p{M}/u.test(c));
        const ids = chars.map((c) => markByChar(c)?.id);
        let preset = null;
        if (ids.every(Boolean) && ids.length <= 3) {
          const id = src.id(name);
          if (takenIds.has(id)) throw new Error(`${src.key}: id clash: ${id}`);
          takenIds.add(id);
          let label = src.label(name);
          if (takenLabels.has(label.toLowerCase())) label = `${label} (${src.title})`;
          takenLabels.add(label.toLowerCase());
          preset = { site: src.title, id, label, font: b.e.fontId, bold: b.e.bold, italic: b.e.italic, marks: ids };
          presets.push(preset);
        }
        // A mark the control doesn't offer: kept as a font of its own instead.
        if (preset) {
          report.fontPlusMark.push({ name, font: b.e.name, mark, preset: preset.id });
          continue;
        }
      }
    }
    const dup = kept.find((k) =>
      src.nearSameWithin ? lettersShared(k.table, table) >= NEAR_SAME : same(k.table, table, CHARS),
    );
    if (dup) {
      report.duplicate.push({ name, of: dup.name, differing: LETTERS.filter((c) => dup.table[c] !== table[c]) });
      continue;
    }
    if (src.leftOut[name]) {
      report.leftOut.push({ name, why: src.leftOut[name] });
      continue;
    }

    // Some sites cut an emoji in half (a lone surrogate) or emit U+FFFD: leave
    // those characters plain rather than copy the junk.
    const broken = CHARS.filter((c) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|\uFFFD/.test(table[c]));
    if (broken.length > CHARS.length / 2) {
      reject(name, "the site's output is broken (cut-up emoji) for most characters");
      continue;
    }
    if (broken.length) table = { ...table, ...Object.fromEntries(broken.map((c) => [c, c])) };
    const fills = src.gapFills?.[name];
    if (fills) table = { ...table, ...fills };
    const unmapped = CHARS.filter((c) => table[c] === c);
    const empty = CHARS.filter((c) => table[c] === "");
    const folded = LETTERS.filter((c) => c !== c.toLowerCase() && table[c] !== c && table[c] === table[c.toLowerCase()]);
    const multi = CHARS.filter((c) => [...table[c]].length > 1);
    const notes = [];
    if (wrapper) notes.push(`the site also adds “${wrapper}” around the text; left out`);
    if (broken.length) notes.push(`left plain where the site's output is broken: ${broken.join(" ")}`);
    if (fills) notes.push(`gaps filled by hand: ${Object.entries(fills).map(([k, v]) => `${k} → ${v}`).join(", ")}`);
    if (leadingMarks) notes.push("the site also puts the mark before each character (it lands on the one before); left out");
    if (multi.length) {
      const marks = multi.some((c) => /\p{M}/u.test(table[c]));
      const invisible = multi.some((c) => /[​-‍﻿︎️]/u.test(table[c]));
      notes.push(`${multi.length} characters become more than one code point${marks ? " (combining marks)" : ""}${invisible ? " (includes invisible characters)" : ""}, so they count as more than one character against a platform limit`);
    }
    const id = src.id(name);
    if (!id || id.endsWith("-")) throw new Error(`${src.key}: no usable id for "${name}"`);
    if (takenIds.has(id)) throw new Error(`${src.key}: id clash: ${id}`);
    takenIds.add(id);
    // Keep the site's name; when another font already has it, say which site this one is from.
    let label = src.label(name);
    if (takenLabels.has(label.toLowerCase())) label = `${label} (${src.title})`;
    takenLabels.add(label.toLowerCase());
    const style = src.key === "lingojam" ? undefined : (STYLE_OVERRIDES[id] ?? styleOf(table));
    const font = { site: src.title, name, id, label, style, category, pages, table, unmapped, empty, folded, notes };
    kept.push(font);
    allKept.push(font);
  }
  results.push({ src, raw, entries, kept, report });
}

// ── mappings files ──
const q = (s) => JSON.stringify(s);
mkdirSync(here("../../src/fonts/scraped/"), { recursive: true });
for (const { src, raw, kept } of results) {
  const header =
    src.key === "lingojam"
      ? `// GENERATED by scripts/font-scrape/analyse.mjs — do not edit by hand.
// Source: ${raw.source} (captured ${raw.scrapedAt.slice(0, 10)}).
// Each font maps ${CHARS.length} characters (A-Z, a-z, 0-9) to what the site produced for it.
// A character missing from \`map\` has no substitute in that font and passes through.

export type ScrapedFont = {
  /** Name the source site's generator uses for this style. */
  id: string;
  label: string;
  /** The font panel's Style group (uiFonts.ts); LingoJam's are listed there by hand. */
  style?: string;
  map: Record<string, string>;
};
`
      : `// GENERATED by scripts/font-scrape/analyse.mjs — do not edit by hand.
// Source: ${raw.source} (captured ${raw.scrapedAt.slice(0, 10)}).
// Each font maps ${CHARS.length} characters (A-Z, a-z, 0-9) to what the site produced for it.
// A character missing from \`map\` has no substitute in that font and passes through.
// Fonts LingoJam${src.key === "glyphy" ? " or Picsart" : ""} already gave us are left out.

import type { ScrapedFont } from "./lingojam";
`;
  const ts = `${header}
export const ${src.exportName}: ScrapedFont[] = [
${kept
  .map(
    (f) =>
      `  {\n    id: ${q(f.id)},\n    label: ${q(f.label)},\n${f.style ? `    style: ${q(f.style)},\n` : ""}    map: {${CHARS.filter((c) => f.table[c] !== c && f.table[c] !== "")
        .map((c) => `${/[0-9]/.test(c) ? q(c) : c}: ${q(f.table[c])}`)
        .join(", ")}},\n  },`,
  )
  .join("\n")}
];
`;
  writeFileSync(here(`../../src/fonts/scraped/${src.key}.ts`), ts);
}

// ── presets: an engine font plus marks, under the site's name ──
writeFileSync(
  here("../../src/fonts/scraped/presets.ts"),
  `// GENERATED by scripts/font-scrape/analyse.mjs — do not edit by hand.
// Styles the font sites list as fonts that are one of our fonts with the same
// marks on every character (fonts/marks.ts). Picking one sets all three.

export type StylePreset = {
  id: string;
  label: string;
  font: string;
  bold: boolean;
  italic: boolean;
  marks: string[];
};

export const STYLE_PRESETS: StylePreset[] = [
${presets.map((p) => `  { id: ${q(p.id)}, label: ${q(p.label)}, font: ${q(p.font)}, bold: ${p.bold}, italic: ${p.italic}, marks: ${q(p.marks)} },`).join("\n")}
];
`,
);

// ── report ──
const list = (a) => (a.length ? a.join(" ") : "none");
const section = ({ src, raw, entries, kept, report }) => {
  const skipped = (raw.pages ?? []).filter((p) => p.error);
  const repeats = (raw.pages ?? []).reduce((n, p) => n + (p.alsoShown?.length ?? 0), 0);
  const pageNote = raw.pages
    ? ` ${raw.pages.length} pages (${raw.pages.map((p) => "`" + (new URL(p.url).pathname.split("/").filter(Boolean).pop() ?? "/") + "`").join(" ")}); the same style on several pages counts once${repeats ? ` (${repeats} repeats of a style an earlier page showed)` : ""}.${skipped.length ? ` Skipped: ${skipped.map((p) => `${p.url} (${p.error})`).join("; ")}.` : ""}`
    : "";
  const cat = (f) => (f.category ? ` · ${f.category}` : "");
  return `## ${src.title}

Source: ${raw.source}, captured ${raw.scrapedAt.slice(0, 10)}.${pageNote}

${entries.length} styles → **${kept.length} new fonts**, ${report.leftOut.length} left out on purpose, ${report.exists.length} already in the engine, ${report.fontPlusMark.length} presets (one of our fonts plus marks), ${report.earlier.length} already from an earlier site, ${report.duplicate.length} duplicates, ${report.notAMapping.reduce((n, e) => n + e.count, 0)} not usable as a per-character font, ${report.noChange.length} that change nothing.

### New fonts

| Font | Sample (\`Hello 123\`) | Characters without a mapping | Capital and lower-case share one glyph | Notes |
|---|---|---|---|---|
${kept
  .map((f) => {
    const sample = [..."Hello 123"].map((c) => f.table[c] ?? c).join("");
    return `| ${f.label} (\`${f.id}\`${cat(f)}) | ${sample} | ${list([...f.unmapped, ...f.empty.map((c) => c + " (dropped)")])} | ${f.folded.length === 26 ? "all 26" : list(f.folded)} | ${f.notes.join("; ") || ""} |`;
  })
  .join("\n")}

Complete for all 62 characters, each capital distinct: ${list(kept.filter((f) => !f.unmapped.length && !f.empty.length && !f.folded.length).map((f) => "`" + f.id + "`"))}.

### Left out on purpose

${report.leftOut.map((e) => `- \`${e.name}\`: ${e.why}`).join("\n") || "none"}

### Already in the engine (ignored)

${report.exists
  .map(
    (e) =>
      `- \`${e.name}\` = ${e.as}${e.differing.length ? `, except ${e.differing.length} letters the site fills differently (${e.differing.join(" ")})` : ""}${e.digitsDiffer ? "; digits differ" : ""}`,
  )
  .join("\n") || "none"}
${report.fontPlusMark.length ? `
### One of our fonts with marks on every character: presets (${report.fontPlusMark.length})

${Object.entries(Object.groupBy(report.fontPlusMark, (e) => e.mark))
  .sort((a, b) => b[1].length - a[1].length)
  .map(([m, es]) => `- mark ${JSON.stringify(m)} (${[...m].filter((c) => /\p{M}/u.test(c)).map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ")}) on ${es.length}: ${es.map((e) => `\`${e.name}\` = ${e.font}`).join(", ")}`)
  .join("\n")}
` : ""}${src.key === "lingojam" ? "" : `
### Already from an earlier site (ignored)

${report.earlier.map((e) => `- \`${e.name}\` = ${e.as}${e.differing.length ? `, except ${e.differing.join(" ")}` : ""}`).join("\n") || "none"}
`}
### Duplicates of another ${src.title} font (ignored)

${report.duplicate.map((e) => `- \`${e.name}\` = \`${e.of}\`${e.differing.length ? `, except ${e.differing.join(" ")}` : ""}`).join("\n") || "none"}

### Not usable as a per-character font

${report.notAMapping.map((e) => `- \`${e.name}\`${e.count > 1 ? ` (×${e.count})` : ""}: ${e.why}`).join("\n") || "none"}
${report.noChange.length ? "\n### No change to any character\n\n" + report.noChange.map((e) => `- \`${e.name}\``).join("\n") + "\n" : ""}`;
};

const md = `# Font scrape — report

Input: \`${INPUT}\`. Sites are read in order and a font is kept only the first time it turns up
(${NEAR_SAME} of 52 letters the same counts as the same font).
Generated by \`scripts/font-scrape/analyse.mjs\`; don't edit by hand.

${results.map((r) => `- ${r.src.title}: **${r.kept.length}** new fonts (\`src/fonts/scraped/${r.src.key}.ts\`)`).join("\n")}
- **${presets.length}** presets: one of our fonts plus marks (\`src/fonts/scraped/presets.ts\`)

${results.map(section).join("\n")}`;
writeFileSync(here("./REPORT.md"), md);
console.log(results.map((r) => `${r.src.title}: ${r.entries.length} styles → ${r.kept.length} new`).join("\n"));
