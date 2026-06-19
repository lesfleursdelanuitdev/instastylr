# Divider presets & builder spec

Horizontal rules in Instastylr are plain Unicode lines (no `<hr>`). Each divider
stores a rendered `line` string for export, and optionally a `recipe` object so
the picker can reopen the builder with the same settings.

**Hard limits (match current app):**

| Constraint | Value |
|------------|-------|
| Max output length | 40 chars |
| Default phone width target | 24 chars |
| Blank lines in export | one above + one below the line |

---

## Architecture

### Layers

```
[ optional wrapper: left + right ]
        [ core recipe ]
```

- **Core recipe** — generates the middle content (line, framed accent, bookend, pattern).
- **Wrapper** — optional brackets/corners around the core (`༺…༻`, `+---+`, `< >`, etc.).
- **Raw** — bypasses recipes; `line` is the source of truth.

### Storage shape

```ts
type DividerRecipe =
  | { kind: "repeat"; char: string; count: number; mode: "solid" | "spaced" | "grouped"; groupSize?: number }
  | { kind: "framed"; flankChar: string; flankLen: number; center: CenterSpec; gap: "none" | "space" }
  | { kind: "bookend"; leftCap: string; spanChar: string; spanLen: number; rightCap: string; gap: "none" | "space" }
  | { kind: "pattern"; tokens: string[]; joiner: string; cycles: number }
  | { kind: "motif"; text: string }
  | { kind: "raw"; text: string };

type CenterSpec =
  | { mode: "single"; char: string }
  | { mode: "repeat"; char: string; count: number; gap: "none" | "space" }
  | { mode: "sequence"; chars: string[]; gap: "none" | "space" }
  | { mode: "motif"; text: string };

type DividerWrapper = { left: string; right: string } | null;

type DividerConfig = {
  line: string;           // always set — what serialize/export uses
  recipe?: DividerRecipe;
  wrapper?: DividerWrapper;
};
```

Presets ship as `{ id, label, category, line, recipe?, wrapper? }`. Tapping a
preset applies `line` and stores `recipe`/`wrapper` when present so the builder
reopens pre-filled.

### Render pipeline

1. If `recipe.kind === "raw"` or `recipe.kind === "motif"` → use `recipe.text` (truncate to 40).
2. Else render core from recipe params.
3. If `wrapper` → `left + core + right` (truncate total to 40, shrink flanks first).
4. Store result in `line`.

**Truncation priority when over 40:** shrink flank lengths → shrink span length →
shrink repeat counts → truncate motif text (last resort).

---

## Builder UI — five tabs

Tabs: **Line · Framed · Bookend · Pattern · Custom**

Shared footer on tabs 1–4: live preview + **Apply**. Custom tab is full-string only.

---

### Tab 1: Line

For solid, spaced, and grouped repeat rules.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Character | single-grapheme picker + input | `─` | Palette rows below |
| Length | slider 4–40 or preset chips (12 / 20 / 24 / 30) | 20 | “Length” = output char budget for solid mode |
| Mode | `solid` \| `spaced` \| `grouped` | `solid` | |
| Group size | 1–4 | 2 | Only when mode = `grouped` |
| Spacer | ` ` (fixed for v1) | space | Spaced/grouped only |

**Render:**

- `solid`: `char.repeat(count)`
- `spaced`: `chars.join(" ")`
- `grouped`: `char.repeat(groupSize)` repeated `count` times, joined by spacer

**Character palettes (quick picks):**

- ASCII: `-` `_` `=` `*` `~` `.` `:` `;` `,`
- Unicode: `─` `━` `─` `⋯` `⋅` `·` `•` `◦` `○` `●` `∘` `╌` `┄` `┈`

Maps to `recipe: { kind: "repeat", ... }`.

---

### Tab 2: Framed

Flank + center + flank. Covers `──── ✦ ────` and `─── ✦ ✦ ✦ ───`.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Flank character | picker + input | `─` | |
| Flank length (each side) | 2–12 | 4 | Symmetric v1 |
| Gap around center | on/off | on | Inserts ` ` between flank and center |
| Center mode | `single` \| `repeat` \| `sequence` \| `motif` | `single` | |
| Center character | picker | `✦` | single + repeat modes |
| Center count | 1–9 | 3 | repeat mode only |
| Center sequence | up to 5 grapheme slots | — | sequence mode; e.g. `☽ ☼ ☾` |
| Center motif | text input | — | motif mode; e.g. `⋆⋅☆⋅⋆` |
| Center gap | on/off | on | Spaces between repeated/sequence chars |

**Render:** `{flank}{gap?}{center}{gap?}{flank}` where each flank is
`flankChar.repeat(flankLen)`.

Maps to `recipe: { kind: "framed", ... }`.

**Wrapper sub-section (collapsible):** optional bracket pair — see Wrapper catalog below.

---

### Tab 3: Bookend

Cap + long span + cap. Covers `✦ ─────────── ✦` and `☽ ─────────── ☾`.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Left cap | picker + input | `✦` | |
| Right cap | picker + input | mirror left | Toggle “Match left” |
| Span character | picker | `─` | |
| Span length | 4–30 | 15 | |
| Gap | on/off | on | Space between cap and span |

**Render:** `{left}{gap?}{span}{gap?}{right}`

Maps to `recipe: { kind: "bookend", ... }`.

---

### Tab 4: Pattern

Alternating and lattice rhythms. Covers `x-x-x-x`, `o-o-o-o`, `#-#-#-`, `+----+----+`.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Pattern preset | dropdown | `alternating-ab` | See pattern presets below |
| Token A | input | `x` | |
| Token B | input (optional) | `-` | Omit for single-token + joiner |
| Joiner | `-` \| ` ` \| `` \| `+` \| `\|` | `-` | |
| Cycles | 3–20 | 10 | How many A(+B) repetitions |

**Render examples:**

- `alternating-ab`: `(A + joiner + B + joiner).repeat(cycles)` trimmed
- `single-spaced`: `A` joined by joiner, `cycles` times
- `plus-lattice`: `+` + `-`.repeat(4) repeated, with `+` between groups

Maps to `recipe: { kind: "pattern", tokens, joiner, cycles }`.

---

### Tab 5: Custom

| Field | Type | Notes |
|-------|------|-------|
| Full line | text input | Paste/type entire divider; max 40 |
| | | Clears `recipe`; sets `{ kind: "raw", text }` |

Used for kaomoji / aesthetic strings the builder cannot express.

---

## Wrapper catalog (optional, all tabs except Custom)

Applied after core render. Pairs are symmetric by default.

| ID | Left | Right | Example core inside |
|----|------|-------|---------------------|
| `bracket-tibetan` | `༺` | `༻` | `────────────` |
| `corner-lower` | `╰` | `╯` | `──── ✦ ────` |
| `corner-upper` | `╭` | `╮` | `──── ❀ ────` |
| `box-double-top` | `╔` | `╗` | `════════════` |
| `box-double-bottom` | `╚` | `╝` | `════════════` |
| `plus-bar` | `+` | `+` | `-`.repeat(28) → `+----------------------------+` |
| `chevron` | `<` | `>` | `---------- ✦ ----------` |
| `square-bracket` | `[` | `]` | `---------- ❀ ----------` |
| `curly` | `{` | `}` | `---------- ♡ ----------` |

When wrapper + core exceeds 40 chars, shrink inner flank/span/repeat counts first.

---

## Preset manifest

Each preset: `{ id, category, line }`. Lengths tuned for ~24–32 chars unless noted.
Implementation can attach `recipe` + `wrapper` from ids for builder round-trip.

### 1. Simple (ASCII solid) — 20 presets

```
simple-dash-20        ------------------------------
simple-dash-24        ----------------------------------------
simple-dash-30        --------------------------------------------------
simple-underscore-20  ______________________
simple-underscore-24  ________________________________
simple-equals-20      ==============================
simple-equals-24      ========================================
simple-star-20        ******************************
simple-star-24        ****************************************
simple-tilde-20       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
simple-tilde-24       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
simple-dot-20         ..............................
simple-dot-24         ........................................
simple-colon-20       ::::::::::::::::::::::::::::::
simple-semi-20        ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
simple-comma-20       ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
simple-minus-12       ------------
simple-eq-12          ============
simple-hash-20        ####################
simple-plus-20        ++++++++++++++++++++
```

### 2. Spaced marks — 18 presets

```
spaced-dash           - - - - - - - - - - - - -
spaced-dash-wide      -  -  -  -  -  -  -  -  -
spaced-underscore     _ _ _ _ _ _ _ _ _ _ _ _ _
spaced-equals         = = = = = = = = = = = = =
spaced-star           * * * * * * * * * * * * *
spaced-tilde          ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
spaced-dot            . . . . . . . . . . . . .
spaced-colon          : : : : : : : : : : : : :
spaced-semi           ; ; ; ; ; ; ; ; ; ; ; ; ;
spaced-comma          , , , , , , , , , , , , ,
spaced-bullet         • • • • • • • • • • • •
spaced-middot         · · · · · · · · · · · ·
spaced-dot-op         ⋅ ⋅ ⋅ ⋅ ⋅ ⋅ ⋅ ⋅ ⋅ ⋅ ⋅ ⋅
spaced-ring           ◦ ◦ ◦ ◦ ◦ ◦ ◦ ◦ ◦ ◦ ◦ ◦
spaced-circle         ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○
spaced-bullet-solid   ● ● ● ● ● ● ● ● ● ● ● ●
spaced-ring-op        ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘
spaced-ellipsis       ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯
```

### 3. Grouped marks — 12 presets

```
group-dash-2          -- -- -- -- -- -- -- --
group-dash-3          --- --- --- --- ---
group-underscore-2    __ __ __ __ __ __ __
group-equals-2        == == == == == == ==
group-equals-3        === === === === ===
group-star-2          ** ** ** ** ** ** **
group-star-3          *** *** *** *** ***
group-tilde-2         ~~ ~~ ~~ ~~ ~~ ~~ ~~
group-tilde-3         ~~~ ~~~ ~~~ ~~~
group-dot-2           .. .. .. .. .. .. ..
group-dot-3           ... ... ... ... ...
group-plus-2          ++ ++ ++ ++ ++ ++ ++
```

### 4. Unicode strokes (solid) — 15 presets

```
stroke-light-16       ────────────────
stroke-light-24       ────────────────────────
stroke-heavy-16       ━━━━━━━━━━━━━━━━
stroke-heavy-24       ━━━━━━━━━━━━━━━━━━━━━━━━
stroke-ellipsis-16    ⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯
stroke-dot-op-16      ⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅
stroke-middot-16      ················
stroke-bullet-16      ••••••••••••••••
stroke-dash-16        ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
stroke-dotted-16      ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
stroke-dotted-16b     ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
stroke-heavy-dash-16  ┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅
stroke-double-16      ┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉┉
stroke-double-line-16 ╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍
stroke-light-12       ────────────
```

### 5. Center accent (framed single) — 24 presets

```
frame-star-4          ──── ✦ ────
frame-star-bright-4   ──── ✧ ────
frame-sparkle-4       ──── ✨ ────
frame-star-black-4    ──── ★ ────
frame-star-white-4    ──── ☆ ────
frame-star-op-4       ──── ⋆ ────
frame-flower-4        ──── ❀ ────
frame-flower-4b       ──── ✿ ────
frame-flower-4c       ──── ❁ ────
frame-flower-4d       ──── ✾ ────
frame-flower-4e       ──── ❃ ────
frame-snowflake-4     ──── ❋ ────
frame-blossom-4       ──── ❊ ────
frame-floral-4        ──── ❈ ────
frame-diamond-4       ──── ❖ ────
frame-diamond-4b      ──── ◆ ────
frame-diamond-4c      ──── ◇ ────
frame-diamond-4d      ──── ◈ ────
frame-heart-4         ──── ♡ ────
frame-heart-4b        ──── ♥ ────
frame-heart-4c        ──── ❥ ────
frame-heart-4d        ──── ❦ ────
frame-moon-4          ──── ☽ ────
frame-moon-4b         ──── ☾ ────
```

### 6. Center repeat (framed triple) — 20 presets

```
frame-triple-star     ─── ✦ ✦ ✦ ───
frame-triple-star-b   ─── ✧ ✧ ✧ ───
frame-triple-star-c   ─── ★ ★ ★ ───
frame-triple-star-d   ─── ☆ ☆ ☆ ───
frame-triple-star-e   ─── ⋆ ⋆ ⋆ ───
frame-triple-flower   ─── ❀ ❀ ❀ ───
frame-triple-flower-b ─── ✿ ✿ ✿ ───
frame-triple-flower-c ─── ❁ ❁ ❁ ───
frame-triple-heart    ─── ♡ ♡ ♡ ───
frame-triple-heart-b  ─── ♥ ♥ ♥ ───
frame-triple-bullet   ─── • • • ───
frame-triple-dot      ─── · · · ───
frame-triple-dot-op   ─── ⋅ ⋅ ⋅ ───
frame-triple-sparkle  ─── ✨ ✨ ✨ ───
frame-triple-floral   ─── ❦ ❦ ❦ ───
frame-seq-moon-sun    ─── ☽ ☼ ☾ ───
frame-seq-star-flower ─── ✦ ❀ ✦ ───
frame-seq-star-heart  ─── ✧ ♡ ✧ ───
frame-seq-star-flower-b ─── ⋆ ❀ ⋆ ───
frame-seq-diamond     ─── ◇ ◆ ◇ ───
```

### 7. Bookends — 16 presets

```
bookend-star          ✦ ─────────── ✦
bookend-star-b        ✧ ─────────── ✧
bookend-star-c        ★ ─────────── ★
bookend-star-d        ☆ ─────────── ☆
bookend-star-e        ⋆ ─────────── ⋆
bookend-flower        ❀ ─────────── ❀
bookend-flower-b      ✿ ─────────── ✿
bookend-flower-c      ❁ ─────────── ❁
bookend-heart         ♡ ─────────── ♡
bookend-heart-b       ♥ ─────────── ♥
bookend-floral        ❦ ─────────── ❦
bookend-diamond       ❖ ─────────── ❖
bookend-diamond-b     ◆ ─────────── ◆
bookend-diamond-c     ◇ ─────────── ◇
bookend-moon          ☽ ─────────── ☾
bookend-sun           ☼ ─────────── ☼
```

### 8. Motif clusters (center only) — 20 presets

```
motif-star-dots       ⋆⋅☆⋅⋆
motif-star-dots-b     ⋆⋅✦⋅⋆
motif-star-dots-c     ⋆⋅✧⋅⋆
motif-star-dots-d     ⋆⋅❀⋅⋆
motif-star-dots-e     ⋆⋅✿⋅⋆
motif-star-dots-f     ⋆⋅♡⋅⋆
motif-star-dots-g     ⋆⋅☽⋅⋆
motif-star-dots-h     ⋆⋅☼⋅⋆
motif-star-dots-i     ⋆⋅❦⋅⋆
motif-star-dots-j     ⋆⋅•⋅⋆
motif-flank-star      ✦⋅⋆⋅✦
motif-flank-star-b    ✧⋅⋆⋅✧
motif-flank-flower    ❀⋅⋆⋅❀
motif-flank-flower-b  ✿⋅⋆⋅✿
motif-flank-heart     ♡⋅⋆⋅♡
motif-flank-moon      ☽⋅⋆⋅☾
motif-flank-sun       ☼⋅⋆⋅☼
motif-flank-floral    ❦⋅⋆⋅❦
motif-flank-diamond   ◆⋅⋆⋅◆
motif-flank-diamond-b ◇⋅⋆⋅◇
```

### 9. Bracket & corner frames — 16 presets

```
wrap-tibetan-line     ༺────────────༻
wrap-tibetan-line-b   ༻────────────༺
wrap-tibetan-star     ༺ ✦ ───── ✦ ༻
wrap-tibetan-flower   ༺ ❀ ───── ❀ ༻
wrap-tibetan-heart    ༺ ♡ ───── ♡ ༻
wrap-tibetan-moon     ༺ ☽ ───── ☾ ༻
wrap-corner-lower     ╰────────────╯
wrap-corner-upper     ╭────────────╮
wrap-corner-star      ╰──── ✦ ────╯
wrap-corner-flower    ╭──── ❀ ────╮
wrap-box-bottom       ╚════════════╝
wrap-box-top          ╔════════════╗
wrap-box-star         ╚════ ✦ ════╝
wrap-box-flower       ╔════ ❀ ════╗
wrap-plus-bar         +----------------------------+
wrap-plus-bar-short   +------------------------+
```

### 10. Chevrons & ASCII borders — 12 presets

```
border-chevron        <---------------------------->
border-chevron-short  <------------------------>
border-chevron-star   <---------- ✦ ---------->
border-chevron-flower <---------- ❀ ---------->
border-chevron-heart  <---------- ♡ ---------->
border-bracket        [----------------------------]
border-bracket-short  [------------------------]
border-bracket-star   [---------- ✦ ----------]
border-bracket-flower [---------- ❀ ----------]
border-curly          {---------- ♡ ----------}
border-plus-grid      +----+----+----+----+
border-plus-star      +------------+------------+
```

### 11. Patterns — 16 presets

```
pat-x-spaced          x x x x x x x x x x
pat-x-dash            x-x-x-x-x-x-x-x-x-x
pat-x-upper           X X X X X X X X X X
pat-o-spaced          o o o o o o o o o o
pat-o-dash            o-o-o-o-o-o-o-o-o-o
pat-o-upper           O O O O O O O O O O
pat-plus-spaced       + + + + + + + + + +
pat-plus-solid        ++++++++++++++++++++
pat-hash-spaced       # # # # # # # # # #
pat-hash-dash         #-#-#-#-#-#-#-#-#-#
pat-slash-spaced      / / / / / / / / / /
pat-slash-solid       ////////////////////
pat-backslash         \ \ \ \ \ \ \ \ \ \
pat-pipe-spaced       | | | | | | | | | |
pat-pipe-solid        ||||||||||||||||||||
pat-zigzag            /\/\/\/\/\/\/\/\/\/\
```

### 12. Aesthetic / kaomoji (raw presets) — 20 presets

These are **raw only** — no recipe round-trip beyond `{ kind: "raw" }`.

```
aesthetic-star-1      ｡･:*:･ﾟ★,｡･:*:･ﾟ☆
aesthetic-star-2      ｡･:*:･ﾟ✧｡･:*:･ﾟ✧
aesthetic-star-3      ✧･ﾟ: *✧･ﾟ:*
aesthetic-star-4      *:･ﾟ✧*:･ﾟ✧
aesthetic-sparkle-1   ⋆｡°✩⋆｡°✩
aesthetic-sparkle-2   ⋆｡°✦⋆｡°✦
aesthetic-sparkle-3   ⋆｡°❀⋆｡°❀
aesthetic-bow-star    ˚₊‧꒰ა ☆ ໒꒱ ‧₊˚
aesthetic-bow-heart   ˚₊‧꒰ა ♡ ໒꒱ ‧₊˚
aesthetic-bow-spark   ˚₊‧꒰ა ✦ ໒꒱ ‧₊˚
aesthetic-tag-heart   ₊˚⊹♡
aesthetic-tag-star    ₊˚⊹✦
aesthetic-tag-flower  ₊˚⊹❀
aesthetic-tag-spark   ₊˚⊹⋆
aesthetic-dust        ✧˖°. ✧˖°.
aesthetic-chain       ⋆ ˚｡⋆୨୧˚
aesthetic-floral-line ♡ ───── ♡
aesthetic-star-line   ✦ ───── ✦
aesthetic-flower-line ❀ ───── ❀
aesthetic-bow-line    ୨୧ ───── ୨୧
```

**Total: 209 presets** across 12 categories.

---

## Picker UX layout

```
┌─ Divider ─────────────────────────────────────┐
│ [ Line | Framed | Bookend | Pattern | Custom ]│
│  …builder fields for active tab…              │
│  Preview: ──── ✦ ────                         │
│                              [ Apply ]        │
├───────────────────────────────────────────────┤
│ Categories ▼                                  │
│  [chip grid — 2 cols, scrollable]             │
│  tapping chip applies + syncs builder if able │
└───────────────────────────────────────────────┘
```

- Category filter chips: All · Simple · Spaced · Unicode · Accent · Triple ·
  Bookend · Motif · Frames · Borders · Patterns · Aesthetic
- Active preset highlights when `line` matches
- Opening builder from a preset reverse-maps `recipe` when stored; otherwise
  fills Custom tab only

---

## Recipe ↔ preset examples

| Preset line | Recipe | Wrapper |
|-------------|--------|---------|
| `----------------------------` | `{ kind:"repeat", char:"-", count:28, mode:"solid" }` | null |
| `- - - - - - - - - - - - -` | `{ kind:"repeat", char:"-", count:13, mode:"spaced" }` | null |
| `-- -- -- -- -- -- -- --` | `{ kind:"repeat", char:"-", count:8, mode:"grouped", groupSize:2 }` | null |
| `──── ✦ ────` | `{ kind:"framed", flankChar:"─", flankLen:4, center:{mode:"single",char:"✦"}, gap:"space" }` | null |
| `─── ✦ ✦ ✦ ───` | `{ kind:"framed", ..., center:{mode:"repeat",char:"✦",count:3,gap:"space"} }` | null |
| `─── ☽ ☼ ☾ ───` | `{ kind:"framed", ..., center:{mode:"sequence",chars:["☽","☼","☾"],gap:"space"} }` | null |
| `✦ ─────────── ✦` | `{ kind:"bookend", leftCap:"✦", spanChar:"─", spanLen:11, rightCap:"✦", gap:"space" }` | null |
| `⋆⋅☆⋅⋆` | `{ kind:"motif", text:"⋆⋅☆⋅⋆" }` | null |
| `༺ ✦ ───── ✦ ༻` | framed bookend-like inner OR framed single | `{ left:"༺ ", right:" ༻" }` |
| `x-x-x-x-x-x-x-x-x-x` | `{ kind:"pattern", tokens:["x"], joiner:"-", cycles:10 }` | null |
| `˚₊‧꒰ა ☆ ໒꒱ ‧₊˚` | `{ kind:"raw", text:"…" }` | null |

---

## Implementation order

1. **Render functions** — `renderRecipe()`, `applyWrapper()`, truncation helper
2. **Extend DividerNode** — optional `recipe` + `wrapper` on node (JSON serialize)
3. **Builder tabs** — Line + Custom first (covers categories 1–4)
4. **Framed + Bookend tabs** — categories 5–7
5. **Pattern tab** — category 11
6. **Preset manifest** — load from this doc as `dividerPresets.ts`
7. **Category filter UI** — scrollable grid
8. **Reverse-map** — best-effort parse from `line` when opening old dividers without recipe

---

## Open questions (defer unless needed)

- **Width strategy:** fixed repeat counts vs “fill to N chars” — recommend *fill to
  target* for Line/Bookend, fixed counts for Framed triples
- **Emoji in flanks:** allow but warn when export length exceeds cap
- **Asymmetric flanks:** v2; v1 symmetric only
