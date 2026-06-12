import { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, $isRangeSelection } from "lexical";
import { EMOJI_CATEGORIES } from "../../ui/emojiData";

/**
 * Inline emoji insertion without leaving the tool. Emoji are inserted as plain
 * text at the caret; the font transform passes them through untouched (they have
 * no ASCII mapping), so they render the same everywhere.
 */
export function EmojiPicker() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const insertEmoji = (emoji: string) => {
    editor.update(() => {
      let selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        $getRoot().selectEnd();
        selection = $getSelection();
      }
      if ($isRangeSelection(selection)) selection.insertText(emoji);
    });
    editor.focus();
  };

  return (
    <div className="emoji-wrap" ref={rootRef}>
      <button
        type="button"
        className={`tb-btn${open ? " is-active" : ""}`}
        title="Insert emoji"
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        😊
      </button>

      {open && (
        <div className="emoji-pop" role="dialog" aria-label="Emoji picker">
          <div className="emoji-tabs">
            {EMOJI_CATEGORIES.map((c, i) => (
              <button
                key={c.name}
                type="button"
                className={`emoji-tab${i === category ? " is-active" : ""}`}
                title={c.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCategory(i)}
              >
                {c.icon}
              </button>
            ))}
          </div>
          <div className="emoji-grid">
            {EMOJI_CATEGORIES[category].emojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                className="emoji-cell"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
