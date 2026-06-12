import { describe, it, expect } from "vitest";
import { createEditor } from "lexical";
import { ListNode, ListItemNode } from "@lexical/list";
import { MarkedListNode } from "./nodes/MarkedListNode";
import { $populateDefaultTemplate } from "./template";
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

describe("default template", () => {
  it("produces a bold headline, body, bullets and hashtags", () => {
    const editor = makeEditor();
    editor.update(() => $populateDefaultTemplate(), { discrete: true });
    const out = editorStateToOutput(editor.getEditorState());
    expect(out).toBe(
      [
        "✨ 𝐘𝐨𝐮𝐫 𝐡𝐞𝐚𝐝𝐥𝐢𝐧𝐞 𝐡𝐞𝐫𝐞 ✨",
        "Write a few words about your photo. Select text and pick a font or hit B/I.",
        "• 📍 Location",
        "• 📷 Shot on …",
        "#instastylr #captions #styledtext",
      ].join("\n"),
    );
  });
});
