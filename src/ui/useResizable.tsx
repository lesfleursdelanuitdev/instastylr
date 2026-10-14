import { useCallback, useRef, useState } from "react";

export type Size = { w: number; h: number };

const KEY_PREFIX = "instastylr.panelsize.";
const STEP = 16;

function load(key: string): Size | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(`${KEY_PREFIX}${key}.v1`) ?? "null") as Size | null;
    return v && Number.isFinite(v.w) && Number.isFinite(v.h) ? v : null;
  } catch {
    return null;
  }
}

function save(key: string, size: Size) {
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${key}.v1`, JSON.stringify(size));
  } catch {
    // best-effort
  }
}

/** The room a floating panel can use: the visible viewport (keyboard excluded) minus a margin. */
export function viewportRoom(): Size {
  const vv = window.visualViewport;
  return { w: (vv?.width ?? window.innerWidth) - 16, h: (vv?.height ?? window.innerHeight) - 16 };
}

/**
 * Size state for a floating panel the user can resize by dragging a corner grip
 * (mouse, touch or pen — CSS `resize` has no touch support) or with the arrow
 * keys on the grip. The chosen size is remembered per panel on this device.
 *
 * `size` is always clamped to the viewport, so a size saved on a big window
 * still fits after a rotate or a resize.
 */
export function useResizable(key: string, initial: Size, min: Size) {
  const [stored, setStored] = useState<Size>(() => load(key) ?? initial);
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = useCallback(
    (s: Size): Size => {
      const room = viewportRoom();
      return {
        w: Math.round(Math.max(Math.min(min.w, room.w), Math.min(s.w, room.w))),
        h: Math.round(Math.max(Math.min(min.h, room.h), Math.min(s.h, room.h))),
      };
    },
    [min.w, min.h],
  );

  const size = clamp(stored);

  const commit = (next: Size) => {
    const c = clamp(next);
    setStored(c);
    save(key, c);
  };

  const grip = (
    <button
      type="button"
      className={`resize-grip${dragging ? " dragging" : ""}`}
      title="Drag to resize"
      aria-label="Resize panel. Use the arrow keys."
      onPointerDown={(e) => {
        e.preventDefault(); // no text selection, no focus theft
        const start = { x: e.clientX, y: e.clientY, w: size.w, h: size.h, id: e.pointerId };
        drag.current = start;
        setDragging(true);
        // Listen on the document rather than capturing the pointer: a touch that
        // ends outside the grip (or is cancelled) must still end the drag, or the
        // grip keeps every later tap for itself.
        const move = (ev: PointerEvent) => {
          if (ev.pointerId !== start.id) return;
          setStored(clamp({ w: start.w + (ev.clientX - start.x), h: start.h + (ev.clientY - start.y) }));
        };
        const end = (ev: PointerEvent) => {
          if (ev.pointerId !== start.id) return;
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", end);
          document.removeEventListener("pointercancel", end);
          drag.current = null;
          setDragging(false);
          setStored((s) => {
            save(key, clamp(s));
            return s;
          });
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", end);
        document.addEventListener("pointercancel", end);
      }}
      onKeyDown={(e) => {
        const d: Record<string, [number, number]> = {
          ArrowRight: [STEP, 0],
          ArrowLeft: [-STEP, 0],
          ArrowDown: [0, STEP],
          ArrowUp: [0, -STEP],
        };
        const delta = d[e.key];
        if (!delta) return;
        e.preventDefault();
        e.stopPropagation();
        commit({ w: size.w + delta[0], h: size.h + delta[1] });
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><line x1="11" y1="3" x2="3" y2="11" /><line x1="11" y1="7" x2="7" y2="11" /></svg>
    </button>
  );

  return { size, grip, dragging };
}

/** Keep a fixed-position panel of `size` inside the visible viewport. */
export function fitInViewport(left: number, top: number, size: Size): { left: number; top: number } {
  const room = viewportRoom();
  return {
    left: Math.round(Math.max(8, Math.min(left, room.w + 8 - size.w))),
    top: Math.round(Math.max(8, Math.min(top, room.h + 8 - size.h))),
  };
}
