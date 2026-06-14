import { useEffect, useRef, useState } from "react";

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" tints the confirm button red for destructive actions. */
  tone?: "danger" | "default";
  onConfirm: () => void;
};

/**
 * Styled replacement for window.confirm. Controlled by a nullable request: a
 * non-null request opens it; confirming runs `onConfirm` then closes; cancelling,
 * scrim-click, or Escape just closes. The last request is cached locally so its
 * text survives the fade-out after the parent clears the request.
 */
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const open = request !== null;
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const lastRef = useRef<ConfirmRequest | null>(request);
  if (request) lastRef.current = request;
  const data = request ?? lastRef.current;

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = window.setTimeout(() => setRender(false), 200);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render || !data) return null;

  return (
    <div
      className={`confirm-overlay${shown ? " visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`confirm-box${shown ? " in" : ""}`}>
        <div className="confirm-title">{data.title}</div>
        <div className="confirm-message">{data.message}</div>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onClose}>
            {data.cancelLabel ?? "Cancel"}
          </button>
          <button
            className={`confirm-ok${data.tone === "danger" ? " danger" : ""}`}
            autoFocus
            onClick={() => {
              data.onConfirm();
              onClose();
            }}
          >
            {data.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
