import { useEffect, useRef, useState } from "react";
import { type SavedPost, formatDate } from "../saves";

const TrashIcon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
);
const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

/**
 * Off-canvas "Saved Posts" panel. Fully controlled: the parent owns the saves
 * array and all editor-touching actions; this renders the slide-in surface, the
 * save-name field, and the list with open/delete affordances.
 */
export function SavesPanel({
  open,
  saves,
  docId,
  docName,
  dirty,
  onClose,
  onSave,
  onUpdate,
  onOpen,
  onDelete,
}: {
  open: boolean;
  saves: SavedPost[];
  /** Currently-bound post id, or null when editing an untitled draft. */
  docId: string | null;
  docName: string | null;
  dirty: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onUpdate: () => void;
  onOpen: (post: SavedPost) => void;
  onDelete: (id: string) => void;
}) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = window.setTimeout(() => setRender(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  // The panel is visibility:hidden until it has the "open" class, and a hidden
  // field can't take focus — so focus once that class has been committed.
  useEffect(() => {
    if (shown) inputRef.current?.focus();
  }, [shown]);

  const doSave = () => {
    onSave(name.trim() || "Untitled post");
    setName("");
  };

  // Newest first.
  const ordered = [...saves].reverse();

  return (
    <>
      <div
        id="saves-overlay"
        className={render ? `open${shown ? " visible" : ""}` : ""}
        onClick={onClose}
      />
      <div id="saves-panel" className={shown ? "open" : ""}>
        <div id="saves-panel-header">
          <span id="saves-panel-title">Saved Posts</span>
          <button id="btn-close-panel" title="Close" aria-label="Close" onClick={onClose}>
            {CloseIcon}
          </button>
        </div>
        {docId !== null && (
          // Bound to a saved post → offer an in-place Update, plus Save-as-new below.
          <div id="saves-update-section">
            <div className="saves-bound-info">
              <span className="saves-bound-label">Editing</span>
              <span className="saves-bound-name">{docName}</span>
              {dirty && <span className="saves-bound-dirty">unsaved changes</span>}
            </div>
            <button id="btn-do-update" disabled={!dirty} onClick={onUpdate}>
              {dirty ? "Update" : "Saved"}
            </button>
          </div>
        )}
        <div id="saves-save-section">
          <input
            id="save-name-input"
            ref={inputRef}
            type="text"
            placeholder={docId !== null ? "Save as a new post…" : "Name this post…"}
            maxLength={60}
            autoComplete="off"
            spellCheck={false}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doSave();
            }}
          />
          <button id="btn-do-save" onClick={doSave}>
            {docId !== null ? "Save as new" : "Save"}
          </button>
        </div>
        <div id="saves-list">
          {ordered.length === 0 ? (
            <div id="saves-empty">
              No saved posts yet.
              <br />
              Type something and hit Save.
            </div>
          ) : (
            ordered.map((item) => (
              <div
                className={`save-item${item.id === docId ? " current" : ""}`}
                key={item.id}
                onClick={() => onOpen(item)}
              >
                <div className="save-item-info">
                  <div className="save-item-name">
                    {item.name}
                    {item.id === docId && <span className="save-item-badge">Editing</span>}
                  </div>
                  <div className="save-item-date">
                    {item.kind === "template" ? "Template" : formatDate(item.createdAt)}
                  </div>
                </div>
                <div className="save-item-actions">
                  <button
                    className="btn-load-save"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(item);
                    }}
                  >
                    Open
                  </button>
                  <button
                    className="btn-del-save"
                    title="Delete"
                    aria-label={`Delete “${item.name}”`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                  >
                    {TrashIcon}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
