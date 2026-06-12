/**
 * Headless proof that lists and rules collapse to plain Unicode in the output —
 * bullets/numbers are inserted text, not <ul>/<li>, per the spec.
 */
import { describe, it, expect } from "vitest";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import {
  ListNode,
  ListItemNode,
  $createListNode,
  $createListItemNode,
} from "@lexical/list";
import { MarkedListNode, $isMarkedListNode } from "./nodes/MarkedListNode";
import { editorStateToOutput } from "./serialize";

const makeEditor = () =>
  createEditor({
    namespace: "test",
    onError: (e) => {
      throw e;
    },
    nodes: [
      ListNode,
      ListItemNode,
      MarkedListNode,
      {
        replace: ListNode,
        with: (n: ListNode) => new MarkedListNode(n.getListType(), n.getStart()),
        withKlass: MarkedListNode,
      },
    ],
  });

const item = (text: string) => {
  const li = $createListItemNode();
  li.append($createTextNode(text));
  return li;
};

describe("bulleted lists", () => {
  it("emits the default bullet as plain text", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const list = $createListNode("bullet");
        list.append(item("one"), item("two"));
        root.append(list);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("• one\n• two");
  });

  it("uses a per-list custom marker", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const list = $createListNode("bullet");
        list.append(item("a"), item("b"));
        if ($isMarkedListNode(list)) list.setMarker("→");
        root.append(list);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("→ a\n→ b");
  });

  it("applies fonts inside list items", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const list = $createListNode("bullet");
        const li = $createListItemNode();
        const t = $createTextNode("Bold");
        t.toggleFormat("bold");
        li.append(t);
        list.append(li);
        root.append(list);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("• 𝐁𝐨𝐥𝐝");
  });
});

describe("numbered lists", () => {
  it("emits incrementing numbers as plain text", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const list = $createListNode("number");
        list.append(item("first"), item("second"), item("third"));
        root.append(list);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("1. first\n2. second\n3. third");
  });
});

describe("nested lists", () => {
  it("indents nested levels and restarts numbering", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const outer = $createListNode("bullet");
        const wrapper = $createListItemNode();
        const inner = $createListNode("number");
        inner.append(item("n1"), item("n2"));
        wrapper.append(inner);
        outer.append(item("a"), wrapper);
        root.append(outer);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("• a\n  1. n1\n  2. n2");
  });
});

describe("horizontal rule", () => {
  it("is just a run of characters in a paragraph", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const before = $createParagraphNode();
        before.append($createTextNode("title"));
        const rule = $createParagraphNode();
        rule.append($createTextNode("━".repeat(5)));
        root.append(before, rule);
      },
      { discrete: true },
    );
    expect(editorStateToOutput(editor.getEditorState())).toBe("title\n━━━━━");
  });
});

describe("list persistence", () => {
  it("round-trips the custom marker through serialized JSON", () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const list = $createListNode("bullet");
        list.append(item("x"));
        if ($isMarkedListNode(list)) list.setMarker("★");
        root.append(list);
      },
      { discrete: true },
    );
    const json = JSON.stringify(editor.getEditorState().toJSON());
    const restored = makeEditor();
    restored.setEditorState(restored.parseEditorState(json));
    expect(editorStateToOutput(restored.getEditorState())).toBe("★ x");
  });
});
