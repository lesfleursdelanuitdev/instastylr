import { useEffect, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { ListNode, ListItemNode } from "@lexical/list";
import { Editor } from "./editor/Editor";
import { OutputBox } from "./ui/OutputBox";
import { LayoutToggle, type Layout } from "./ui/LayoutToggle";
import { MarkedListNode } from "./editor/nodes/MarkedListNode";

// Font lives in each TextNode's style (see fontStyle.ts), so no custom *text*
// node is needed — bold/italic ride the native format bitmask. Lists do use a
// custom node so each bulleted list can carry its own marker.
const initialConfig: InitialConfigType = {
  namespace: "instastylr",
  theme: {
    text: { bold: "i-bold", italic: "i-italic" },
    list: { ul: "i-ul", ol: "i-ol", listitem: "i-li" },
  },
  onError(error: Error) {
    throw error;
  },
  nodes: [
    ListNode,
    ListItemNode,
    MarkedListNode,
    {
      replace: ListNode,
      with: (node: ListNode) => new MarkedListNode(node.getListType(), node.getStart()),
      withKlass: MarkedListNode,
    },
  ],
};

const LAYOUT_KEY = "instastylr.layout.v1";

function loadLayout(): Layout {
  try {
    const v = window.localStorage.getItem(LAYOUT_KEY);
    if (v === "side" || v === "stack") return v;
  } catch {
    // storage unavailable
  }
  return "side";
}

export function App() {
  const [output, setOutput] = useState("");
  const [layout, setLayout] = useState<Layout>(loadLayout);

  useEffect(() => {
    try {
      window.localStorage.setItem(LAYOUT_KEY, layout);
    } catch {
      // best-effort
    }
  }, [layout]);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="app">
        <header className="app-header">
          <div className="app-title">
            <h1>Instastylr</h1>
            <p className="tagline">Format captions for platforms that don’t allow formatting.</p>
          </div>
          <LayoutToggle value={layout} onChange={setLayout} />
        </header>
        <main className={`panes panes--${layout}`}>
          <Editor onOutputChange={setOutput} />
          <OutputBox value={output} />
        </main>
        <footer className="app-footer">
          by lesfleursdelanuit · everything runs in your browser — nothing is uploaded
        </footer>
      </div>
    </LexicalComposer>
  );
}
