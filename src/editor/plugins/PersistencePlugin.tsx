import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $populateDefaultTemplate } from "../template";

const STORAGE_KEY = "instastylr.draft.v1";
const SAVE_DEBOUNCE_MS = 600;

/**
 * Drafts persist between browser sessions via localStorage. We store the
 * serialized Lexical editor state (lossless) — never the output string, which
 * isn't round-trippable. On first run (no saved draft) we seed the default
 * template instead.
 */
export function PersistencePlugin() {
  const [editor] = useLexicalComposerContext();
  const loadedRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  // Load once on mount (guarded against StrictMode's double-invoke).
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null; // storage unavailable (private mode, etc.)
    }

    if (saved) {
      try {
        editor.setEditorState(editor.parseEditorState(saved));
        return;
      } catch {
        // Corrupt draft — fall through to the template.
      }
    }
    editor.update(() => $populateDefaultTemplate());
  }, [editor]);

  // Debounced autosave on every change.
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(editorState.toJSON()));
        } catch {
          // Ignore quota/availability errors — autosave is best-effort.
        }
      }, SAVE_DEBOUNCE_MS);
    });
  }, [editor]);

  return null;
}
