import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ALL_UI_FONTS, FONT_FILTERS, filterFonts, type FontFilter } from "../fonts/uiFonts";

const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const Check = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
);

/**
 * Every font, in a panel that slides in from the left (the other panels own the
 * right edge). Filter by which styled alphabets a font has; picking one applies
 * it and closes the panel.
 *
 * Portalled to <body>: the toolbar that opens it is a stacking context of its
 * own, which would trap the panel underneath the header.
 */
export function FontPanel({
  open,
  fontId,
  onPick,
  onClose,
}: {
  open: boolean;
  /** Current font, or null when the selection spans several. */
  fontId: string | null;
  onPick: (fontId: string) => void;
  onClose: () => void;
}) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [filter, setFilter] = useState<FontFilter>("all");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      setFilter("all");
      // Two frames: the panel has to be painted once in its parked position, or
      // the browser has nothing to transition from and it just appears.
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = window.setTimeout(() => setRender(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  // Focus moves in once the panel is visible (it can't take focus while hidden).
  useEffect(() => {
    if (shown) closeRef.current?.focus();
  }, [shown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;

  const fonts = filterFonts(ALL_UI_FONTS, filter);

  return createPortal(
    <>
      <div id="font-overlay" className={`overlay-scrim${shown ? " visible" : ""}`} onClick={onClose} />
      <div id="font-panel" className={shown ? "open" : ""} role="dialog" aria-modal="true" aria-label="Fonts">
        <div className="panel-header">
          <span className="panel-title">Fonts</span>
          <button ref={closeRef} className="btn-close-panel" title="Close" aria-label="Close" onClick={onClose}>
            {CloseIcon}
          </button>
        </div>

        <div className="font-filters" role="group" aria-label="Show fonts that have">
          {FONT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`font-filter${filter === f.id ? " on" : ""}`}
              aria-pressed={filter === f.id}
              data-filter={f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <span className="font-count" aria-live="polite">
            {fonts.length} {fonts.length === 1 ? "font" : "fonts"}
          </span>
        </div>

        <div className="font-list">
          {fonts.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`font-row${f.id === fontId ? " current" : ""}`}
              aria-current={f.id === fontId ? "true" : undefined}
              data-font={f.id}
              onClick={() => onPick(f.id)}
            >
              <span className="font-row-text">
                <span className="font-row-sample">{f.sample}</span>
                <span className="font-row-meta">
                  <span className="font-row-name">{f.label}</span>
                  {f.bold && <span className="font-badge" title="Has bold">Bold</span>}
                  {f.italic && <span className="font-badge" title="Has italic">Italic</span>}
                </span>
              </span>
              <span className="font-row-check">{f.id === fontId && Check}</span>
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}
