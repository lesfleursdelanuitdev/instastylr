import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type StyleNameRequest = {
  title: string;
  /** What the style looks like, shown above the name box. */
  preview: string;
  initialName: string;
  saveLabel: string;
  /** A problem with the look itself (can't be fixed by renaming): shown, and saving is off. */
  blocked?: string | null;
  /** Problem with a name as typed, or null when it's fine. */
  checkName: (name: string) => string | null;
  onSave: (name: string) => void;
};

/**
 * The box that asks for a style's name, for saving a new style and renaming one.
 * Looks like ConfirmDialog. Portalled to <body>: the toolbar that opens it is its
 * own stacking context. Escape and the scrim close it; the font panel underneath
 * is told to ignore Escape while it is open.
 */
export function StyleNameDialog({ request, onClose }: { request: StyleNameRequest | null; onClose: () => void }) {
  const open = request !== null;
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [name, setName] = useState("");
  const lastRef = useRef<StyleNameRequest | null>(request);
  if (request) lastRef.current = request;
  const data = request ?? lastRef.current;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(request!.initialName);
      setRender(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = window.setTimeout(() => setRender(false), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the name once the box is on screen (it isn't rendered on the first pass).
  useEffect(() => {
    if (!shown) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [shown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render || !data) return null;

  const problem = data.blocked ?? data.checkName(name);
  const save = () => {
    if (problem) return;
    data.onSave(name.trim());
    onClose();
  };

  return createPortal(
    <div
      id="style-dialog"
      className={`confirm-overlay${shown ? " visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className={`confirm-box${shown ? " in" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="confirm-title" id="style-dialog-title">
          {data.title}
        </div>
        <div className="style-dialog-preview" aria-hidden="true">
          {data.preview}
        </div>
        <label className="style-name-label" htmlFor="style-name">
          Name
        </label>
        <input
          id="style-name"
          ref={inputRef}
          className="style-name-input"
          type="text"
          autoComplete="off"
          maxLength={60}
          value={name}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? "style-name-problem" : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        <div id="style-name-problem" className="style-name-problem" role="status">
          {problem ?? ""}
        </div>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" id="btn-style-save" className="confirm-ok" disabled={Boolean(problem)}>
            {data.saveLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
