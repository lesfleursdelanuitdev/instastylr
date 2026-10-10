# InstaStylr: the architecture in five minutes

InstaStylr is a caption editor whose output is plain text. Social platforms drop formatting on paste, so the app swaps letters for Unicode characters that look bold, italic or decorative, and those survive.

## The one idea

Every styling feature reduces to the same operation: replace ASCII characters with look-alike Unicode characters. Bold `hello` becomes `𝐡𝐞𝐥𝐥𝐨`, five characters from the Mathematical Alphanumeric Symbols block. A bulleted list becomes lines that start with `• `. A divider becomes a line of `━`.

So the app has two halves:

```
 Lexical document  ──projection──▶  plain Unicode string  ──▶  clipboard
 (source of truth)                  (rebuilt on every change)
```

The projection only goes one way. The output is never parsed back into a document, because the reverse is ambiguous: the output of bold text in the default font and of plain text in a bold-looking font can be the same characters.

## The parts

| Part | File | What it does |
|---|---|---|
| Font tables | `src/fonts/mappings.ts` | Each font is data: where its alphabet starts in Unicode, plus exceptions |
| Transform | `src/fonts/transform.ts` | Applies a table to a run of text, by code point |
| Projection | `src/editor/serialize.ts` | Walks the Lexical tree and emits the output string |
| Custom nodes | `src/editor/nodes/` | A list that remembers its bullet, and a divider that remembers its recipe |
| Counter | `src/count.ts` | Counts grapheme clusters with `Intl.Segmenter` |
| Document state | `src/App.tsx`, `docs/STATE_MODEL.md` | Untitled, saved or changed, and what each button does in each state |
| Storage | `src/saves.ts` | Saved posts as serialized editor state in `localStorage` |

## Decisions and why

**Fonts as data.** A font is a descriptor, not code. Adding one means adding a row. The transform knows nothing about the editor, so it is tested alone (48 cases).

**The gaps in Unicode.** The math alphabets are almost a fixed offset from ASCII, but Unicode left holes where a letter already existed elsewhere. Italic `h` is U+210E (the Planck constant), and script capitals B, E, F, H, I, L, M and R live in the Letterlike Symbols block. Each font lists its exceptions, and a test checks every letter of every font, because one missed hole shows up as an empty box in a real word.

**Iterating by code point.** The substituted characters sit above U+FFFF, so each is two UTF-16 units. Anything that indexes a string by unit (`charAt`, `.length`) would cut them in half. The transform iterates with `for...of`, and the counter counts grapheme clusters, so a styled letter and an emoji with joiners each count as one.

**The font rides Lexical's style channel.** A text node's font is stored as a CSS custom property (`--ist-font`) in its style string. Lexical already carries a caret's pending style to the next typed characters, splits nodes when it changes, and includes it in undo and in saved state. Using that channel gave all four behaviours without custom code.

**Styles that cannot exist are shown as unavailable.** Unicode has no bold monospace. When a font has no bold or italic form, the button is disabled, the style is removed from the text, and a notice says why. The rule behind it: the interface shows what the output will be, never a setting that has no effect.

**Lists and dividers are structure only while editing.** A list is a real list in the editor, so Enter starts the next item. In the output it is plain lines with a marker. Each list stores its own marker, so changing one list's bullet leaves the others alone. A divider stores the rendered line and the recipe that made it, so the builder reopens with the same settings.

**An explicit document state.** The first version kept about eighteen independent flags, with no record of which saved post was open or whether it had changed. That was replaced with four states (blank, untitled draft, saved, saved with changes) and a table of what the title, the Save button and the discard guards do in each. `docs/STATE_MODEL.md` is that table.

**No backend.** An earlier version was a server-rendered app. This one is static files: nothing runs on the server, nothing is stored there, and the Content-Security-Policy allows only the site's own scripts and styles and no outside connections.

## Tradeoffs

- **Saved posts live in one browser.** They do not sync between devices, and clearing site data removes them.
- **The editor does not preview fonts.** Script or Fraktur text looks plain while editing and styled in the output panel. Bold and italic do show in the editor.
- **Only Latin letters and digits have styled forms.** Accented letters, punctuation and other scripts pass through unchanged.

## Known limits

- **Accessibility of the output.** Screen readers read mathematical letters badly or skip them, and search does not match them. The app makes this text; it cannot fix how other software treats it.
- **How it looks depends on the reader's device.** A phone without a glyph for a character shows a box. The common math alphabets are widely supported; some dividers and bullets are less so.
- **Platform limits drift.** The character limits are each platform's published figures in `src/platforms.ts` and need updating by hand. Instagram does not document how it counts; the app counts what a person sees.
- **The starter template shows a 1970 date** in the saved-posts list, because it is created with a zero timestamp.
- **Browser tests run in Chromium only.**
