/**
 * Headless proof of the core loop and the font-via-style model. We build real
 * Lexical documents in Node (no browser), run the projection, and assert the
 * output Unicode — including the collapsed-caret "pending font" behavior.
 */
import { describe, it, expect } from "vitest";
import {
  createEditor,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  $createLineBreakNode,
} from "lexical";
import { $patchStyleText } from "@lexical/selection";
import { editorStateToOutput } from "./serialize";
import { FONT_STYLE_PROP } from "./fontStyle";
import { transformRun } from "../fonts/transform";
import { $createDividerNode, DEFAULT_DIVIDER, DividerNode } from "./nodes/DividerNode";

const makeEditor = () => createEditor({ namespace: "test", onError: (e) => { throw e; } });
const styleFor = (fontId: string) => `${FONT_STYLE_PROP}: ${fontId};`;

describe("editor -> output projection", () => {
  it("projects a bold run to substituted Unicode", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p = $createParagraphNode();
        const t = $createTextNode("hello");
        t.toggleFormat("bold");
        p.append(t);
        root.append(p);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("𝐡𝐞𝐥𝐥𝐨");
  });

  it("reads font from a node's style and mixes fonts in one paragraph", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p = $createParagraphNode();
        p.append($createTextNode("plain "));
        const script = $createTextNode("Script");
        script.setStyle(styleFor("script"));
        p.append(script);
        root.append(p);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("plain 𝒮𝒸𝓇𝒾𝓅𝓉");
  });

  it("separates paragraphs with newlines and honors line breaks", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p1 = $createParagraphNode();
        p1.append($createTextNode("a"));
        p1.append($createLineBreakNode());
        p1.append($createTextNode("b"));
        const p2 = $createParagraphNode();
        p2.append($createTextNode("c"));
        root.append(p1);
        root.append(p2);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("a\nb\nc");
  });
});

describe("divider projection", () => {
  const makeDividerEditor = () =>
    createEditor({ namespace: "test", nodes: [DividerNode], onError: (e) => { throw e; } });

  const build = (blocks: (string | null)[]) => {
    // string = a paragraph with that text ("" = empty paragraph); null = a divider
    const editor = makeDividerEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        for (const b of blocks) {
          if (b === null) root.append($createDividerNode("───"));
          else {
            const para = $createParagraphNode();
            if (b) para.append($createTextNode(b));
            root.append(para);
          }
        }
      },
      { discrete: true },
    );
    return editorStateToOutput(editor.getEditorState());
  };

  it("empty paragraphs next to a divider don't stack into extra blank lines", () => {
    expect(build(["a", "", null, "", "b"])).toBe("a\n\n───\n\nb");
    expect(build(["a", "", "", null, "b"])).toBe("a\n\n───\n\nb");
  });

  it("nothing blank at the start or end of the copy", () => {
    expect(build(["", null, "after"])).toBe("───\n\nafter"); // divider inserted into an empty editor
    expect(build(["a", "", "", ""])).toBe("a"); // Enter pressed a few times at the end
    expect(build(["", "", "a"])).toBe("a");
  });

  it("keeps blank lines the user puts between ordinary paragraphs", () => {
    expect(build(["a", "", "", "b"])).toBe("a\n\n\nb");
  });

  it("collapses a divider to its line with a blank line above and below", () => {
    const editor = makeDividerEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const above = $createParagraphNode();
        above.append($createTextNode("above"));
        const below = $createParagraphNode();
        below.append($createTextNode("below"));
        root.append(above);
        root.append($createDividerNode());
        root.append(below);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe(`above\n\n${DEFAULT_DIVIDER}\n\nbelow`);
  });

  it("emits the per-node custom line and survives a JSON round-trip", () => {
    const editor = makeDividerEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createDividerNode("✦ ✦ ✦"));
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("✦ ✦ ✦") /* a divider alone: no blank lines at the ends */;

    const restored = makeDividerEditor();
    restored.setEditorState(restored.parseEditorState(JSON.stringify(editor.getEditorState().toJSON())));
    expect(editorStateToOutput(restored.getEditorState())).toBe("✦ ✦ ✦") /* a divider alone: no blank lines at the ends */;
  });

  it("persists divider recipe and wrapper through JSON round-trip", () => {
    const editor = makeDividerEditor();
    const recipe = {
      kind: "framed" as const,
      flankChar: "─",
      flankLen: 4,
      center: { mode: "single" as const, char: "✦" },
      gap: "space" as const,
    };
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createDividerNode("──── ✦ ────", recipe));
      },
      { discrete: true },
    );
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).toContain('"recipe"');

    const restored = makeDividerEditor();
    restored.setEditorState(restored.parseEditorState(json));
    expect(editorStateToOutput(restored.getEditorState())).toBe("──── ✦ ────");
  });
});

describe("collapsed-caret pending font", () => {
  it("applies a font to a collapsed selection so the next typed text uses it", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p = $createParagraphNode();
        root.append(p);
        p.selectEnd(); // collapsed caret, no text selected
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, { [FONT_STYLE_PROP]: "fraktur" });
          selection.insertText("Hi"); // should inherit the pending font
        }
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe(
      transformRun({ text: "Hi", fontId: "fraktur", bold: false, italic: false }),
    );
  });
});

describe("font survives the splits formatting causes", () => {
  it("keeps the font on both halves when bolding part of a styled run", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p = $createParagraphNode();
        const node = $createTextNode("Fraktur");
        node.setStyle(styleFor("fraktur"));
        p.append(node);
        root.append(p);
        node.select(0, 4); // select "Frak"
        const selection = $getSelection();
        if ($isRangeSelection(selection)) selection.formatText("bold");
      },
      { discrete: true },
    );
    const expected =
      transformRun({ text: "Frak", fontId: "fraktur", bold: true, italic: false }) +
      transformRun({ text: "tur", fontId: "fraktur", bold: false, italic: false });
    expect(editorStateToOutput(editor.getEditorState())).toBe(expected);
  });
});

describe("persistence round-trip", () => {
  it("preserves font + format through serialized JSON (localStorage-ready)", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p = $createParagraphNode();
        const t = $createTextNode("Hi");
        t.setStyle(styleFor("fraktur"));
        t.toggleFormat("bold");
        p.append(t);
        root.append(p);
      },
      { discrete: true },
    );
    const json = JSON.stringify(editor.getEditorState().toJSON());

    const restored = makeEditor();
    restored.setEditorState(restored.parseEditorState(json));
    expect(editorStateToOutput(restored.getEditorState())).toBe(editorStateToOutput(editor.getEditorState()));
    expect(editorStateToOutput(restored.getEditorState())).toBe("𝕳𝖎"); // bold-fraktur
  });
});
