import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getSelection, $isRangeSelection } from "lexical";
import { $getNearestNodeOfType } from "@lexical/utils";
import { ListNode } from "@lexical/list";
import { $isMarkedListNode } from "../nodes/MarkedListNode";

/**
 * Floating bullet picker. The per-list marker model already exists (MarkedListNode
 * carries `__marker`, serialize.ts emits it, the editor previews it via --ist-marker);
 * this is the only thing that *writes* a marker outside the tests.
 *
 * Discoverability: a handle is anchored to the left gutter of whichever bulleted list
 * the caret sits in (numbered lists ignore the marker, so they get no handle). The
 * handle is an absolute child of the scrolling #editor-wrap, so it rides along with
 * its list on scroll for free. The picker popover is `position: fixed` (measured at
 * open) to escape #editor-wrap's overflow clipping, and closes on scroll/resize so it
 * can't drift from the handle.
 */

const PRESETS = ["•", "◦", "▪", "‣", "·", "-", "+", "*", "–", "→", "★", "✦"];

// Clamp arbitrary input to a single user-perceived character (so an emoji or a
// combining sequence counts as one bullet, matching how the counter measures text).
type SegmenterLike = { segment(input: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (l?: string, o?: { granularity: "grapheme" }) => SegmenterLike;
const SegImpl = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
const segmenter = typeof SegImpl === "function" ? new SegImpl(undefined, { granularity: "grapheme" }) : null;
function firstGrapheme(s: string): string {
  if (!s) return "";
  if (segmenter) {
    for (const seg of segmenter.segment(s)) return seg.segment;
    return "";
  }
  return [...s][0] ?? "";
}

type Anchor = { key: string; top: number; marker: string };

export function BulletMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [custom, setCustom] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Top of the list (relative to #editor-wrap's scrolled content) so the handle
  // tracks the list as the editor scrolls.
  const measureTop = useCallback(
    (key: string): number | null => {
      const el = editor.getElementByKey(key);
      const wrap = el?.closest("#editor-wrap") as HTMLElement | null;
      if (!el || !wrap) return null;
      return el.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop;
    },
    [editor],
  );

  const readState = useCallback(() => {
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      let next: Anchor | null = null;
      if ($isRangeSelection(sel)) {
        const list = $getNearestNodeOfType(sel.anchor.getNode(), ListNode);
        if (list && $isMarkedListNode(list) && list.getListType() === "bullet") {
          const key = list.getKey();
          const top = measureTop(key);
          if (top != null) next = { key, top, marker: list.getMarker() };
        }
      }
      // Don't yank the handle out from under an open popover.
      if (next === null && openRef.current) return;
      setAnchor((prev) =>
        prev && next && prev.key === next.key && prev.top === next.top && prev.marker === next.marker
          ? prev
          : next,
      );
    });
  }, [editor, measureTop]);

  useEffect(() => {
    readState();
    const unregister = editor.registerUpdateListener(() => readState());
    window.addEventListener("resize", readState);
    return () => {
      unregister();
      window.removeEventListener("resize", readState);
    };
  }, [editor, readState]);

  // Close on outside click / Escape; the fixed popover would drift on scroll, so
  // close there too rather than re-track it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const MENU_W = 200;
    let left = r.right + 6;
    if (left + MENU_W > window.innerWidth - 8) left = Math.max(8, r.left - MENU_W - 6);
    setMenuPos({ left, top: r.top });
    setCustom("");
    setOpen(true);
  };

  const apply = (raw: string, close: boolean) => {
    const g = firstGrapheme(raw);
    const key = anchor?.key;
    if (!g || !key) return;
    editor.update(() => {
      const node = $getNodeByKey(key);
      if (node && $isMarkedListNode(node) && node.getListType() === "bullet") node.setMarker(g);
    });
    setAnchor((a) => (a ? { ...a, marker: g } : a));
    if (close) {
      setOpen(false);
      editor.focus();
    }
  };

  if (!anchor) return null;

  return (
    <div id="bullet-handle" ref={rootRef} style={{ top: anchor.top }}>
      <button
        ref={btnRef}
        className={`bullet-handle-btn${open ? " active" : ""}`}
        title="Change bullet"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleOpen}
      >
        <span className="bullet-handle-glyph">{anchor.marker}</span>
      </button>

      {open && (
        <div id="bullet-menu" role="menu" style={{ left: menuPos.left, top: menuPos.top }}>
          <div className="bullet-menu-title">Bullet</div>
          <div className="bullet-grid">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`bullet-swatch${anchor.marker === p ? " active" : ""}`}
                title={`Use “${p}”`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(p, false)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="bullet-custom">
            <input
              type="text"
              value={custom}
              placeholder="Custom…"
              aria-label="Custom bullet character"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply(custom, true);
                }
              }}
            />
            <button
              type="button"
              className="bullet-custom-apply"
              disabled={!firstGrapheme(custom)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(custom, true)}
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
