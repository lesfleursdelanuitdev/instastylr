import { type ReactNode, useEffect, useRef, useState } from "react";
import { EmojiPicker } from "./EmojiPicker";

type ListState = "bullet" | "number" | null;

const KEBAB = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

/**
 * Collapses the lower-frequency formatting controls — bulleted/numbered lists and
 * the emoji picker — behind a single "More" (⋯) button. The emoji picker keeps its
 * own sub-panel; clicking inside it does not close this menu (it's a descendant of
 * the same root the outside-click guard checks). The ⋯ button itself stays lit while
 * the caret sits inside a list, so the list active-state survives being folded away.
 */
export function MoreMenu({
  listType,
  ulIcon,
  olIcon,
  dividerIcon,
  onToggleBullet,
  onToggleNumber,
  onInsertDivider,
  resetIcon,
  onReset,
}: {
  listType: ListState;
  ulIcon: ReactNode;
  olIcon: ReactNode;
  dividerIcon: ReactNode;
  onToggleBullet: () => void;
  onToggleNumber: () => void;
  onInsertDivider: () => void;
  resetIcon: ReactNode;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape (mirrors EmojiPicker).
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

  const inList = listType !== null;

  return (
    <div id="btn-more-wrap" ref={rootRef}>
      <button
        className={`tbtn${open || inList ? " active" : ""}`}
        id="btn-more"
        title="More"
        aria-label="More formatting"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {KEBAB}
      </button>
      <div id="more-menu" className={open ? "open" : ""} role="menu" aria-label="More formatting">
        <button
          className={`tbtn${listType === "bullet" ? " active" : ""}`}
          id="btn-ul"
          title="Bulleted list"
          aria-label="Bulleted list"
          aria-pressed={listType === "bullet"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleBullet}
        >
          {ulIcon}
        </button>
        <button
          className={`tbtn${listType === "number" ? " active" : ""}`}
          id="btn-ol"
          title="Numbered list"
          aria-label="Numbered list"
          aria-pressed={listType === "number"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleNumber}
        >
          {olIcon}
        </button>
        <button
          className="tbtn"
          id="btn-divider"
          title="Insert divider"
          aria-label="Insert divider"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onInsertDivider();
            setOpen(false);
          }}
        >
          {dividerIcon}
        </button>
        <EmojiPicker />
        {/* Phones only (styles.css): the toolbar's own Reset is folded in here so
            the bar stays on one row. */}
        <button
          className="tbtn"
          id="btn-reset-more"
          title="Reset to start"
          aria-label="Reset to start"
          onClick={() => {
            setOpen(false);
            onReset();
          }}
        >
          {resetIcon}
        </button>
      </div>
    </div>
  );
}
