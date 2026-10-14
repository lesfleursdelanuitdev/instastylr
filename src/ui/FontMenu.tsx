import { useEffect, useRef, useState } from "react";
import { QUICK_FONTS, uiFont } from "../fonts/uiFonts";

const Chevron = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
);
const Check = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
);
const Arrow = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18" /></svg>
);

/**
 * The toolbar's font control: a button showing the current font, opening a short
 * menu of the everyday fonts plus "More fonts…", which hands over to the font
 * panel. (A native <select> can't hold that last item as a real button.)
 *
 * `fontId` null means the selection spans several fonts.
 */
export function FontMenu({
  fontId,
  onPick,
  onMore,
}: {
  fontId: string | null;
  onPick: (fontId: string) => void;
  onMore: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = fontId === null ? undefined : uiFont(fontId);

  // Close on outside press / Escape (mirrors MoreMenu).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);

  // Opened from the keyboard → put focus on the current font (or the first item).
  const openedByKey = useRef(false);
  useEffect(() => {
    if (!open || !openedByKey.current) return;
    openedByKey.current = false;
    const all = items();
    (all.find((b) => b.getAttribute("aria-selected") === "true") ?? all[0])?.focus();
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (at + 1) % all.length;
    else if (e.key === "ArrowUp") next = (at - 1 + all.length) % all.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = all.length - 1;
    else if (e.key === "Tab") return void setOpen(false);
    else return;
    e.preventDefault();
    all[next]?.focus();
  };

  // Keep the editor's selection alive while the menu is used with a pointer.
  const noFocusSteal = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div id="font-menu-wrap" ref={rootRef}>
      <button
        id="font-select"
        ref={buttonRef}
        type="button"
        className={fontId === null ? "mixed" : ""}
        title="Font"
        aria-label={`Font: ${current?.label ?? "Mixed"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-font={fontId ?? ""}
        onMouseDown={noFocusSteal}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openedByKey.current = true;
            setOpen(true);
          }
        }}
      >
        {current && <span className="font-preview">{current.preview}</span>}
        <span className="font-select-label">{current?.label ?? "Mixed"}</span>
        {Chevron}
      </button>
      {open && (
        <div id="font-menu" ref={menuRef} role="listbox" aria-label="Font" onKeyDown={onMenuKey}>
          {QUICK_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="option"
              aria-selected={f.id === fontId}
              className="font-option"
              data-font={f.id}
              onMouseDown={noFocusSteal}
              onClick={() => {
                setOpen(false);
                onPick(f.id);
              }}
            >
              <span className="font-preview">{f.preview}</span>
              <span className="font-option-label">{f.label}</span>
              <span className="font-option-check">{f.id === fontId && Check}</span>
            </button>
          ))}
          <div className="font-menu-sep" role="separator" />
          <button
            type="button"
            id="btn-more-fonts"
            className="font-option"
            onMouseDown={noFocusSteal}
            onClick={() => {
              setOpen(false);
              onMore();
            }}
          >
            <span className="font-option-label">More fonts…</span>
            <span className="font-option-check">{Arrow}</span>
          </button>
        </div>
      )}
    </div>
  );
}
