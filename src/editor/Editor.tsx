import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { PersistencePlugin } from "./plugins/PersistencePlugin";

/**
 * The contenteditable surface plus its Lexical plugins. The surrounding
 * `#editor-wrap` (with its layout sizing and reset-flash) is owned by the App
 * shell; this component only supplies the editing region and its placeholder.
 */
export function Editor() {
  return (
    <>
      <RichTextPlugin
        contentEditable={
          <ContentEditable className="editor" spellCheck aria-label="Caption editor" />
        }
        placeholder={<div id="placeholder">Start typing your post…</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <ListPlugin />
      <PersistencePlugin />
    </>
  );
}
