import { useMemo, useState } from "react";
import { instagramCount, IG_CAPTION_LIMIT } from "../count";

/**
 * The output box: a derived, read-only projection of the editor. Never editable,
 * never round-tripped. Floating copy button pinned top-right; the box is
 * resizable (CSS `resize`). The header carries the Instagram character counter,
 * measured on the *output* (what actually gets pasted) and counted by grapheme.
 */
export function OutputBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const count = useMemo(() => instagramCount(value), [value]);
  const over = count > IG_CAPTION_LIMIT;

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="pane output-pane">
      <div className="pane-head">
        <span className="pane-label">Output — copy this</span>
        <span className={`char-count${over ? " is-over" : ""}`} title="Instagram caption length (grapheme count)">
          {count.toLocaleString()} / {IG_CAPTION_LIMIT.toLocaleString()}
        </span>
      </div>
      <div className="output-shell">
        <button className="copy-btn" onClick={copy} disabled={!value} type="button">
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <div className="output-text" aria-live="polite" aria-readonly="true">
          {value || <span className="output-empty">…your styled caption appears here</span>}
        </div>
      </div>
    </section>
  );
}
