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
  const [flipLeft, setFlipLeft] = useState(false);
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

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (next && rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        setFlipLeft(rect.left + 300 > window.innerWidth - 12);
      }
      return next;
    });
  };

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
    <div
      id="btn-emoji"
      className={`tbtn${open ? " active" : ""}`}
      ref={rootRef}
      title="Insert emoji"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={open}
      onMouseDown={(e) => e.preventDefault()}
      onClick={toggleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleOpen();
        }
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>😊</span>
      <div
        id="emoji-picker"
        className={`${open ? "open" : ""}${flipLeft ? " flip-left" : ""}`}
        role="dialog"
        aria-label="Emoji picker"
        onClick={(e) => e.stopPropagation()}
      >
        <div id="emoji-tabs">
          {EMOJI_CATEGORIES.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className={`emoji-tab${i === category ? " active" : ""}`}
              title={c.name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setCategory(i);
              }}
            >
              {c.icon}
            </button>
          ))}
        </div>
        <div id="emoji-grid">
          {EMOJI_CATEGORIES[category].emojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              className="emoji-btn"
              title={emoji}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                insertEmoji(emoji);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
