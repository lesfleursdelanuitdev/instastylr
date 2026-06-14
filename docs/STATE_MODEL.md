# Instastylr state model

A design note. It defines the state the app tracks and how every piece is reflected in
the interface. **Status: implemented** (was: ~18 flat `useState` hooks with no document
identity, dirty concept, or guarded transitions). Key files: `App.tsx` (identity/dirty,
guards, overlays, advisory toasts), `tips.ts` (suppression), `editor/plugins/ToolbarPlugin.tsx`
(tri-state + disable + strip), `ui/SettingsPanel.tsx`, `ui/SideMenu.tsx`. Resolved during
build: delete-current → drop to untitled draft (text kept); drawer style → launcher;
theme/layout → mirrored in Settings (shared localStorage source of truth).

The single rule everything below serves:

> **The interface always shows what the output will actually be** — effective
> formatting, effective dirtiness — never the raw underlying bit.

---

## 1. Three independent axes (do not conflate)

1. **View / shell preferences** — `theme {light,dark}`, `layout {row,col}`, `outputOpen`,
   pane sizes. Orthogonal, persistent, no interesting transitions → keep as flat state.
   Only wrinkle: `layout=col` is force-dropped to `row` below 769px (a constraint, not a
   user transition).
2. **Transient feedback** — `copied` (2s), `flash` (450ms), `toast` (2.2s),
   `handleDragging`. Self-resetting timed sub-states. Not part of any machine.
3. **The working document** — the one axis that wants to be a real state machine, and
   where the UI currently misrepresents reality. The rest of this note is about (3).

---

## 2. Document lifecycle (the state machine)

The working document has three dimensions the current code doesn't track:

- **content**: empty / non-empty
- **identity**: untitled (never saved) vs. bound to a `SavedPost` (id + name)
- **sync**: clean (matches snapshot) / dirty (diverged) — only meaningful when bound

Collapsed into the states that matter:

```
        type/format
  ┌──────────────────────┐
  ▼                      │
BLANK ──type──▶ UNTITLED-DRAFT ──Save(name)──▶ SAVED-CLEAN
  ▲                │                              │  ▲
  │                │                         edit │  │ Save/Update
  │ Reset/New      │ Save(name)                   ▼  │
  └────────────────┴─────────────◀──────────  SAVED-DIRTY
                   (guarded if dirty)
```

| State | Meaning | Title indicator | Save control | Copy | Guard on Open/Reset |
|---|---|---|---|---|---|
| BLANK | empty, no identity | "Untitled" (muted) | disabled | disabled | none |
| UNTITLED-DRAFT | content, never saved | "Untitled •" | **Save** (name prompt) | enabled | confirm before discard |
| SAVED-CLEAN | bound, == snapshot | save name | "Saved ✓" (disabled) | enabled | safe |
| SAVED-DIRTY | bound, diverged | name + "•" | **Update** (+ Save as new) | enabled | confirm before discard |

The unifying idea: surface **identity** (a document title in the header) and **dirty**
(a dot), and make the Save control *state-dependent* — Save / Update / disabled.

**Decisions taken:** file-style (explicit save, keep UNTITLED-DRAFT); hard confirm only
on Reset; auto-save-on-Open for the bound doc. Open question left for later: what happens
to the editor when you delete the post you're currently editing.

---

## 3. Identity / dirty tracking

New fields in `AppInner`:

- `docId: string | null` — bound `SavedPost.id`, or `null` = untitled. **Identity.**
- `docName: string | null` — display name (or look up from `saves` by id).
- `savedSnapshotRef: Ref<string | null>` — serialized editor-state JSON as of the last
  save/open. The **dirty baseline**. A **ref, not state** (see gotcha).
- derived `dirty` — `serialize(current) !== savedSnapshotRef.current` when bound.

Baseline write points:

| Transition | docId | savedSnapshot ← |
|---|---|---|
| Open(post), kind=post | `post.id` | `post.state` (exact stored string) |
| Open(post), kind=template | id after first Save / null | serialize **after** `$populate` runs |
| Save (new) | `entry.id` | exact string just written |
| Update (existing) | unchanged | exact string just written |
| Reset / New | `null` | canonical empty-doc string (or `null`) |

**Compute dirty off the existing listener.** `App.tsx` already registers one update
listener that serializes on every change for the output box. Add one comparison there:
`JSON.stringify(editorState.toJSON()) !== savedSnapshotRef.current`. No second listener.

**Why a ref:** that listener registers once with deps `[editor]`. A `useState` baseline
would be captured stale in the closure, forcing a re-register (subscription teardown) on
every save. A ref lets the long-lived closure always read the current baseline.

Caveats:

1. Selection is excluded from `toJSON()` — moving the caret won't flip dirty. Free.
2. Template entries have empty `state`; serialize *after* `$populatePhotoCaptionTemplate()`
   or the doc reads instantly-dirty on open.
3. Cost is already paid (output serializes anyway); don't pre-optimize with hashing.
4. Raw string equality is fine — Lexical serialization is order-stable for unchanged
   content.
5. **One predicate gates everything:** `hasUnsavedWork = (docId === null ? nonEmpty : dirty)`.
   Drives the discard guards, the dirty dot, and the Save/Update label swap.

---

## 4. Formatting state & the toolbar tri-state table

Formatting lives at two scopes:

- **Run-level** (per `TextNode`): **font** (8 options, CSS prop `--ist-font`), **bold**,
  **italic** (native Lexical format bits).
- **Block-level** (per paragraph/list): **list type** (none/bullet/number, exclusive);
  **bullet marker** (per `MarkedListNode`, currently no UI control).

### The trap: font × bold × italic is ragged

`font` constrains which of {bold, italic} are *expressible*:

| Font | bold | italic |
|---|:-:|:-:|
| serif (Default), sans | ✓ | ✓ |
| script, fraktur | ✓ | — |
| mono, double, fullwidth, circled | — | — |

Press Bold in Monospace today: the bit sets, the button lights up, but there's no bold-mono
variant so the output is unchanged — the UI claims a style the output won't render.

**Decisions taken:**
1. Bold/italic in an unsupported font → **disable** the button.
2. Switching to a font that drops a current style → **strip** the now-unsupported bit from
   the nodes (not kept latent).

Strip means **effective state == raw state always** — no latent/expressed split. A font
that can't express bold never keeps the bold bit.

### State vocabulary

- **off** unpressed · **on** pressed/filled · **mixed** indeterminate (dashed/—)
- **disabled** greyed (font can't express it)
- Selection shapes: **Caret** (collapsed, acts on pending typing) · **Uniform** (axis
  consistent) · **Mixed** (axis varies)

### Precedence rule (governs bold & italic)

> Availability (font constraint) is the **outer gate**. Resolve disabled first; only if
> enabled, show value. A button is never disabled-and-pressed at once.

### Bold

| Context | Shows | Enabled when | Click effect |
|---|---|---|---|
| Caret | pending bold bit | caret font ∈ {serif, sans, script, fraktur} | toggles bit for next chars |
| Uniform range | all → on; none → off | every covered run's font supports bold | toggles across range |
| Mixed range (varies) | **mixed** | every covered run's font supports bold | first click → all on |
| Range incl. a no-bold font | **disabled** | — | — |

### Italic

Same shape; availability set is only **{serif, sans}**.

| Context | Shows | Enabled when | Click effect |
|---|---|---|---|
| Caret | pending italic bit | caret font ∈ {serif, sans} | toggles bit |
| Uniform range | all → on; none → off | every covered run is serif/sans | toggles across range |
| Mixed range | **mixed** | every covered run is serif/sans | first click → all on |
| Range incl. script/fraktur/mono/… | **disabled** | — | — |

> In **script**, Bold is enabled but Italic is disabled — the two buttons carry different
> enabled states at the same caret. Correct and honest.

### Font selector

| Context | Shows | Click effect (+ strip) |
|---|---|---|
| Caret | caret's font (default serif) | sets pending font |
| Uniform range | that one font | applies uniformly |
| Mixed range (≥2 fonts) | **"Mixed"** placeholder | applies chosen font uniformly |

Strip side-effects:
- serif **bold-italic** → **script**: italic stripped, bold survives.
- anything → **mono / double / fullwidth / circled**: both bold & italic stripped.

Because stripping is visible loss, it raises a **suppressible advisory toast** so the
disappearance isn't mysterious — see §5.

### Bullet / Number list (block-level, mutually exclusive, font-independent)

| Context | Bullet | Number | Click effect |
|---|---|---|---|
| Caret in paragraph | off | off | make bulleted / numbered |
| Caret in bullet list | **on** | off | bullet→remove; number→**convert** |
| Caret in number list | off | **on** | number→remove; bullet→convert |
| Uniform range | reflects type | reflects type | toggle/convert |
| Mixed range | **mixed** | **mixed** | first click → all that type |

Never disabled by font. Pressing the *other* list button converts type rather than stacking.

### Undo / Redo (history-scoped, selection-independent)

| Control | Enabled when |
|---|---|
| Undo | history has a past entry |
| Redo | history has a future entry (cleared by a fresh edit) |

### Latent, no current control

- **Bullet marker** — `MarkedListNode` carries a per-list marker; no toolbar control today.
  If added: block-level, font-independent, same Caret/Uniform/Mixed shape as list buttons.
- **Compound mixed** — a selection can be Mixed on font *and* mixed/disabled on bold at
  once. The precedence rule keeps it sane: resolve each control independently, availability
  before value.

---

## 5. Advisory toasts (suppressible notices)

Two kinds of toast:

- **Confirmation** — acknowledges an explicit user action (Saved "X", Opened "X", Post
  deleted). Always shown, short dwell (~2.2s), no action button. Unchanged from today.
- **Advisory** — explains a behavior the user didn't directly ask for and might find
  surprising (e.g. a format bit stripped on font change). Carries a **"Don't show again"**
  action and a longer dwell (~5s) so it can be read and acted on.

Suppression is **per class, not per message** — dismissing once silences the whole class,
whatever font/style triggered it.

| Class id | Triggered by | Example message (dynamic) |
|---|---|---|
| `format-stripped` | font change drops an unsupported bold/italic bit | "Italic isn't available in Script — removed." · "Bold and italic aren't available in Monospace — removed." |

(One class today; the table grows as new advisories appear.)

Mechanism:

- New persisted preference `instastylr.tips.dismissed.v1` → JSON array of dismissed class
  ids. Same lineage as the existing `welcomed` one-shot flag, generalized from a single
  boolean to a set.
- `showAdvisory(classId, message)`: if `classId ∈ dismissed`, no-op; otherwise show an
  advisory toast whose action adds `classId` to the set, persists, and hides the toast.
- The toast model grows an optional action: `{ message, action?: { label, onClick } }`.
  Confirmations pass no action; the longer dwell applies only when an action is present.

**Decisions taken:** show the strip toast; make it suppressible per class via
"Don't show again"; **re-enabling lives in the settings panel** (§6) — per-class, so a
silenced advisory can be brought back individually.

---

## 6. Settings panel

A new overlay reached from the **side menu drawer** (§7), not its own navbar icon. It
joins the welcome modal, saves panel, and drawer as an overlay surface; **only one overlay
is open at a time** — opening settings closes the drawer, and vice versa.

### Contents

**Tips & notifications** (the decided content).
Lists the advisory classes (§5) with each one's state — **Active** or **Silenced** — and a
per-class toggle to re-enable a silenced one. Re-enabling removes the class id from
`instastylr.tips.dismissed.v1`. Empty/all-active state reads "All tips are on." A
"Reset all tips" affordance clears the whole set at once.

| Setting | Source of truth | Control |
|---|---|---|
| `format-stripped` advisory | `instastylr.tips.dismissed.v1` (membership) | Active / Silenced toggle |
| Reset all tips | same key | button → clears the set |

### Option, not decided — consolidating view preferences

`theme` and `layout` currently live as ad-hoc toggles (a theme button in the navbar, a
layout button in the toolbar). The settings panel is their natural consolidated home, and
could surface them as labelled controls:

| Setting | Source of truth | Control |
|---|---|---|
| Theme | `instastylr.theme.v1` | Light / Dark |
| Layout | `instastylr.layout.v2` | Row / Column (auto-forced to Row < 769px) |

Trade-off: the standalone toggles are faster to reach mid-edit; settings is more
discoverable and tidier. Recommendation: **keep the standalone toggles and also mirror
them in settings** (two views of one source of truth — no duplicated state, since both
read/write the same localStorage key). Not yet decided.

---

## 7. Side menu (navigation drawer)

The hamburger (`btn-menu`) is **repurposed**. Today it opens the saves panel — redundant
with the Save/Open buttons beside it. Instead it opens a **side menu drawer**: the app's
navigation hub, with Settings as one entry among several.

The drawer is an overlay; the one-overlay-at-a-time rule (§6) extends to it. Selecting a
drawer item **closes the drawer and opens that surface** — a hand-off, not stacking.

Contents (a launcher list):

| Item | Opens / does |
|---|---|
| Saved posts | saves panel (same surface as the Save / Open navbar buttons) |
| Settings | settings panel (§6) — incl. tips re-enabling |
| How it works | re-opens the welcome modal |
| About | byline / version (lesfleursdelanuit) |

Navbar after this change: **Save · Open · Theme · ☰**. Save/Open stay as quick actions;
the drawer is the catch-all and the only route to Settings, Help, and About.

**Sub-decision — drawer style.** *Launcher* (each item opens its own panel/modal, as above)
vs *in-drawer sub-views* (Settings renders inside the drawer with a back button, no separate
panel). Recommendation: **launcher** — keeps the Settings panel (§6) intact and all overlays
uniform. Not yet hard-decided.
