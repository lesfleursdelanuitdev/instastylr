import { useEffect, useRef, useState } from "react";
import { MARKS, MARK_GROUPS, MAX_MARKS } from "../fonts/marks";
import { transformRun } from "../fonts/transform";

/** A mark across the selection: on everywhere, nowhere, or on some of it. */
export type MarkState = "on" | "off" | "mixed";

const Chevron = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
);

/**
 * The toolbar's Marks control: a line through, under, over or around every
 * character, on top of any font. Tap a mark to put it on the selected text (or
 * the text about to be typed), tap again to take it off. Up to MAX_MARKS stack.
 */
export function MarksMenu({
  state,
  fontId,
  bold,
  italic,
  onToggle,
  onClear,
}: {
  /** Each mark's state across the selection (missing = off). */
  state: Record<string, MarkState>;
  /** The selection's font, for the previews (null = several). */
  fontId: string | null;
  bold: boolean;
  italic: boolean;
  onToggle: (markId: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const noFocusSteal = (e: React.MouseEvent) => e.preventDefault();

  const active = MARKS.filter((m) => (state[m.id] ?? "off") !== "off");
  const onCount = MARKS.filter((m) => state[m.id] === "on").length;
  const full = onCount >= MAX_MARKS;
  const around = active.some((m) => m.group === "around");

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

  const preview = (markId: string) =>
    transformRun({ text: "Aa", fontId: fontId ?? "serif", bold, italic, marks: [markId] });

  return (
    <div id="marks-menu-wrap" ref={rootRef}>
      <button
        id="btn-marks"
        ref={buttonRef}
        type="button"
        className={`tbtn${active.length ? " active" : ""}`}
        title="Marks: a line through, under, over or around each letter"
        aria-label={active.length ? `Marks: ${active.map((m) => m.label).join(", ")}` : "Marks"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={noFocusSteal}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="marks-btn-glyph" aria-hidden="true">
          {"a̶̲"}
        </span>
        {Chevron}
      </button>
      {open && (
        <div id="marks-menu" role="dialog" aria-label="Marks">
          {MARK_GROUPS.map((g) => (
            <div key={g.id} className="marks-group" role="group" aria-labelledby={`marks-h-${g.id}`}>
              <div className="font-menu-heading" id={`marks-h-${g.id}`}>
                {g.label}
              </div>
              <div className="marks-grid">
                {MARKS.filter((m) => m.group === g.id).map((m) => {
                  const st = state[m.id] ?? "off";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`mark-option${st === "on" ? " on" : ""}${st === "mixed" ? " mixed" : ""}`}
                      data-mark={m.id}
                      aria-pressed={st === "on" ? true : st === "mixed" ? "mixed" : false}
                      disabled={full && st !== "on"}
                      title={full && st !== "on" ? `Up to ${MAX_MARKS} marks at once` : m.label}
                      onMouseDown={noFocusSteal}
                      onClick={() => onToggle(m.id)}
                    >
                      <span className="mark-preview">{preview(m.id)}</span>
                      <span className="mark-label">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="marks-foot">
            <p className="marks-note">
              {full
                ? `Up to ${MAX_MARKS} marks at once.`
                : "Marks stack, in the order you add them."}{" "}
              Some apps count each mark as an extra character.
              {around && " Marks around letters don’t line up on every phone."}
            </p>
            <button
              type="button"
              id="btn-marks-clear"
              className="font-option"
              disabled={!active.length}
              onMouseDown={noFocusSteal}
              onClick={onClear}
            >
              <span className="font-option-label">Clear marks</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
