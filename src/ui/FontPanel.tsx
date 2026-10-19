import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_SAMPLE,
  FONT_FEATURES,
  FONT_STYLES,
  filterFonts,
  panelFonts,
  renderUiFont,
  type FontFilter,
} from "../fonts/uiFonts";
import type { MyStyle } from "../fonts/myStyles";

const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const EditIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
);
const Check = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
);

/** What the rows preview: the user's selected text, with its bold/italic. */
export type PanelSample = { text: string; bold: boolean; italic: boolean };

const NO_FILTER: FontFilter = { style: "all", feature: "any" };

/**
 * Every font, in a panel that slides in from the left (the other panels own the
 * right edge). Each row shows the selected text (or a stock sample) in that
 * font. Filter by look and by which styled alphabets a font has; picking one
 * applies it and closes the panel. The user's saved styles come first, with
 * Rename and Delete on their rows.
 *
 * Portalled to <body>: the toolbar that opens it is a stacking context of its
 * own, which would trap the panel underneath the header.
 */
export function FontPanel({
  open,
  fontId,
  sample,
  recent,
  mine,
  paused,
  onPick,
  onRename,
  onDelete,
  onClose,
}: {
  open: boolean;
  /** Current font, or null when the selection spans several. */
  fontId: string | null;
  /** Selected text to preview, or null to show the stock sample. */
  sample: PanelSample | null;
  /** Recently applied font ids, newest first, for the Recent filter. */
  recent: string[];
  /** The user's saved styles, newest first. */
  mine: MyStyle[];
  /** A dialog is open on top: Escape belongs to it. */
  paused: boolean;
  onPick: (fontId: string) => void;
  onRename: (styleId: string) => void;
  onDelete: (styleId: string) => void;
  onClose: () => void;
}) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [filter, setFilter] = useState<FontFilter>(NO_FILTER);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      setFilter(NO_FILTER);
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
      if (e.key === "Escape" && !paused) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, paused, onClose]);

  if (!render) return null;

  const fonts = filterFonts(panelFonts(mine), { ...filter, recent });
  const text = sample?.text || DEFAULT_SAMPLE;

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

        <div className="font-filters">
          <div className="font-filter-row" role="group" aria-label="Style">
            <span className="font-filter-label">Style</span>
            {[{ id: "all" as const, label: "All" }, { id: "mine" as const, label: "Mine" }, { id: "recent" as const, label: "Recent" }, ...FONT_STYLES].map((s) => (
              <button
                key={s.id}
                type="button"
                className={`font-filter${filter.style === s.id ? " on" : ""}`}
                aria-pressed={filter.style === s.id}
                data-style={s.id}
                onClick={() => setFilter((f) => ({ ...f, style: s.id }))}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="font-filter-row" role="group" aria-label="Has">
            <span className="font-filter-label">Has</span>
            {FONT_FEATURES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`font-filter${filter.feature === f.id ? " on" : ""}`}
                aria-pressed={filter.feature === f.id}
                data-filter={f.id}
                onClick={() => setFilter((cur) => ({ ...cur, feature: f.id }))}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="font-filter-status">
            <span className="font-count" aria-live="polite">
              {fonts.length} {fonts.length === 1 ? "font" : "fonts"}
            </span>
            {sample && <span className="font-sample-note">Previewing your selected text</span>}
          </div>
        </div>

        <div className="font-list">
          {fonts.length === 0 && (
            <div className="font-empty">
              {filter.style === "recent" && recent.length === 0
                ? "No fonts used yet. The last ten you apply will show up here."
                : filter.style === "mine" && mine.length === 0
                  ? "No styles saved yet. Style some text, then choose “Save as my style…” in the font menu."
                  : "No font has that look and that style."}
              <button type="button" className="font-empty-reset" onClick={() => setFilter(NO_FILTER)}>
                Show all fonts
              </button>
            </div>
          )}
          {fonts.map((f) => {
            const row = (
              <button
                key={f.id}
                type="button"
                className={`font-row${f.id === fontId ? " current" : ""}`}
                aria-current={f.id === fontId ? "true" : undefined}
                data-font={f.id}
                onClick={() => onPick(f.id)}
              >
                <span className="font-row-text">
                  <span className="font-row-sample">{renderUiFont(f, text, sample?.bold, sample?.italic)}</span>
                  <span className="font-row-meta">
                    <span className="font-row-name">{f.label}</span>
                    {f.mine && <span className="font-badge">Mine</span>}
                    {f.bold && <span className="font-badge" title="Has bold">Bold</span>}
                    {f.italic && <span className="font-badge" title="Has italic">Italic</span>}
                  </span>
                </span>
                <span className="font-row-check">{f.id === fontId && Check}</span>
              </button>
            );
            if (!f.mine) return row;
            return (
              <div key={f.id} className={`font-row-mine${f.id === fontId ? " current" : ""}`}>
                {row}
                <div className="font-row-actions">
                  <button type="button" className="font-row-action" data-rename={f.id} aria-label={`Rename ${f.label}`} title="Rename" onClick={() => onRename(f.id)}>
                    {EditIcon}
                  </button>
                  <button type="button" className="font-row-action" data-delete={f.id} aria-label={`Delete ${f.label}`} title="Delete" onClick={() => onDelete(f.id)}>
                    {TrashIcon}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}
