import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getSelection, $isRangeSelection } from "lexical";
import { $getNearestNodeOfType } from "@lexical/utils";
import { ListNode } from "@lexical/list";
import { BULLET_CATEGORY_FILTERS, BULLET_PRESETS } from "../bullet/presets";
import { BULLET_CATEGORY_LABELS, bulletPresetMarker, isBulletPresetActive, type BulletCategory } from "../bullet/types";
import { firstGrapheme } from "../grapheme";
import { $isMarkedListNode } from "../nodes/MarkedListNode";

/**
 * Floating bullet picker. The per-list marker model already exists (MarkedListNode
 * carries `__marker`, serialize.ts emits it, the editor previews it via --ist-marker);
 * this is the only thing that *writes* a marker outside the tests.
 */

const MENU_W = 280;

type Anchor = { key: string; top: number; marker: string };

export function BulletMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [custom, setCustom] = useState("");
  const [category, setCategory] = useState<BulletCategory | "all">("all");
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const menuInteractingRef = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const filteredPresets = useMemo(
    () => (category === "all" ? BULLET_PRESETS : BULLET_PRESETS.filter((p) => p.category === category)),
    [category],
  );

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

  useEffect(() => {
    if (!open) menuInteractingRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const wrap = document.getElementById("editor-wrap");
    if (!wrap) return;
    const onWrapScroll = () => {
      if (menuInteractingRef.current) return;
      setOpen(false);
    };
    wrap.addEventListener("scroll", onWrapScroll, { passive: true });
    return () => wrap.removeEventListener("scroll", onWrapScroll);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      let left = r.right + 6;
      if (left + MENU_W > window.innerWidth - 8) left = Math.max(8, r.left - MENU_W - 6);
      setMenuPos({ left, top: r.top });
    };
    const vv = window.visualViewport;
    window.addEventListener("resize", reposition);
    vv?.addEventListener("resize", reposition);
    vv?.addEventListener("scroll", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      vv?.removeEventListener("resize", reposition);
      vv?.removeEventListener("scroll", reposition);
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
        <div
          id="bullet-menu"
          role="menu"
          style={{ left: menuPos.left, top: menuPos.top }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="bullet-menu-title">Bullet</div>

          <div className="bullet-categories">
            {BULLET_CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                className={`bullet-category${category === c ? " active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCategory(c)}
              >
                {BULLET_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <div className="bullet-grid bullet-preset-grid">
            {filteredPresets.map((p) => {
              const marker = bulletPresetMarker(p);
              const active = isBulletPresetActive(p, anchor.marker);
              const title =
                p.kind === "nested"
                  ? `Use “${p.main}” here · “${p.sub}” for nested sub-lists`
                  : `Use “${marker}”`;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`bullet-swatch${active ? " active" : ""}${p.kind === "nested" ? " nested" : ""}`}
                  title={title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => apply(marker, false)}
                >
                  {p.kind === "nested" ? (
                    <span className="bullet-nested-pair">
                      <span>{p.main}</span>
                      <span className="bullet-nested-sep">›</span>
                      <span>{p.sub}</span>
                    </span>
                  ) : (
                    p.marker
                  )}
                </button>
              );
            })}
          </div>

          <div className="bullet-custom">
            <input
              ref={customInputRef}
              type="text"
              value={custom}
              placeholder="Custom…"
              aria-label="Custom bullet character"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              onFocus={() => {
                menuInteractingRef.current = true;
              }}
              onBlur={() => {
                menuInteractingRef.current = false;
              }}
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
