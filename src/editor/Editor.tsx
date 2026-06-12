import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import type { EditorState } from "lexical";
import { editorStateToOutput } from "./serialize";
import { ToolbarPlugin } from "./plugins/ToolbarPlugin";
import { PersistencePlugin } from "./plugins/PersistencePlugin";

/** The input box: where the user composes. Lexical owns the editing state. */
export function Editor({ onOutputChange }: { onOutputChange: (output: string) => void }) {
  const handleChange = (state: EditorState) => onOutputChange(editorStateToOutput(state));

  return (
    <section className="pane input-pane">
      <div className="pane-label">Compose</div>
      <ToolbarPlugin />
      <div className="editor-shell">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" aria-label="Caption editor" />}
          placeholder={<div className="editor-placeholder">Type your caption…</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <PersistencePlugin />
      {/* Selection-only changes don't change the output, so skip those recomputes. */}
      <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
    </section>
  );
}
