/**
 * DividerNode — a horizontal rule for a plain-text world.
 *
 * Stores a rendered `line` for export plus optional `recipe` / `wrapper` so the
 * picker builder can reopen with the same settings.
 */
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $applyNodeReplacement,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { normalizeDividerLine } from "../divider/render";
import { DEFAULT_DIVIDER_LINE, type DividerConfig, type DividerRecipe, type DividerWrapper } from "../divider/types";
import { DividerPicker } from "./DividerPicker";
import { fitInViewport, useResizable, viewportRoom } from "../../ui/useResizable";

export const DEFAULT_DIVIDER = DEFAULT_DIVIDER_LINE;

const DEFAULT_DIVIDER_RECIPE: DividerRecipe = {
  kind: "repeat",
  char: "━",
  count: 10,
  mode: "solid",
};

const MIN_SIZE = { w: 260, h: 240 };

export type SerializedDividerNode = Spread<
  { line: string; recipe?: DividerRecipe; wrapper?: DividerWrapper | null },
  SerializedLexicalNode
>;

function DividerComponent({
  nodeKey,
  line,
  recipe,
  wrapper,
}: {
  nodeKey: NodeKey;
  line: string;
  recipe?: DividerRecipe;
  wrapper?: DividerWrapper | null;
}) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const lineRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The editor panel's own open state. It can't follow the node selection: any
  // press inside the panel moves the selection, which used to close it mid-edit.
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; height: number } | null>(null);
  const { size, grip } = useResizable("divider", { w: 340, h: 520 }, MIN_SIZE);

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isDividerNode(node)) node.remove();
        });
        return true;
      }
      return false;
    },
    [editor, isSelected, nodeKey],
  );

  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          CLICK_COMMAND,
          (event: MouseEvent) => {
            if (lineRef.current && lineRef.current.contains(event.target as Node)) {
              if (!event.shiftKey) clearSelection();
              setSelected(true);
              setOpen((v) => !v);
              return true;
            }
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
        editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      ),
    [editor, isSelected, nodeKey, clearSelection, setSelected, onDelete],
  );

  // Sit under the divider, or above it when there's no room, always on screen.
  const place = useCallback(() => {
    const line = lineRef.current?.closest(".i-divider");
    if (!line) return;
    const r = line.getBoundingClientRect();
    const room = viewportRoom();
    // Whichever side has more room; if the chosen height doesn't fit there, the
    // panel is shown shorter rather than laid over the divider being edited.
    const below = room.h + 8 - (r.bottom + 6);
    const above = r.top - 6 - 8;
    const under = below >= size.h || below >= above;
    const height = Math.max(MIN_SIZE.h, Math.min(size.h, under ? below : above));
    const top = under ? r.bottom + 6 : r.top - 6 - height;
    setPos({ ...fitInViewport(r.left + r.width / 2 - size.w / 2, top, { w: size.w, h: height }), height });
  }, [size.w, size.h]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    // Outside press / Escape close it; scrolling and resizing only move it.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || lineRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const vv = window.visualViewport;
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    vv?.addEventListener("resize", place);
    vv?.addEventListener("scroll", place);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      vv?.removeEventListener("resize", place);
      vv?.removeEventListener("scroll", place);
    };
  }, [open, place]);

  const applyConfig = useCallback(
    (config: DividerConfig) => {
      const nextLine = normalizeDividerLine(config.line);
      if (!nextLine) return;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isDividerNode(node)) node.setConfig({ ...config, line: nextLine });
      });
    },
    [editor, nodeKey],
  );

  return (
    <div
      className={`i-divider${isSelected || open ? " selected" : ""}`}
      role="separator"
      aria-label="Divider"
      title="Edit divider"
    >
      <span ref={lineRef} className="i-divider-line">
        {line}
      </span>
      {open &&
        pos &&
        // Outside the editor's own element (like the bullet picker), so the editor
        // doesn't treat presses and typing in the panel as edits to the caption.
        createPortal(
          <div
            id="divider-menu"
            ref={menuRef}
            className="float-panel"
            role="dialog"
            aria-label="Divider"
            style={{ left: pos.left, top: pos.top, width: size.w, height: pos.height }}
          >
            <button type="button" className="float-panel-close" title="Close" aria-label="Close" onClick={() => setOpen(false)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="float-panel-body">
              <DividerPicker line={line} recipe={recipe} wrapper={wrapper} onApply={applyConfig} />
            </div>
            {grip}
          </div>,
          document.body,
        )}
    </div>
  );
}

export class DividerNode extends DecoratorNode<ReactNode> {
  __line: string;
  __recipe?: DividerRecipe;
  __wrapper?: DividerWrapper | null;

  constructor(
    line: string = DEFAULT_DIVIDER,
    recipe?: DividerRecipe,
    wrapper?: DividerWrapper | null,
    key?: NodeKey,
  ) {
    super(key);
    this.__line = line;
    this.__recipe = recipe;
    this.__wrapper = wrapper ?? null;
  }

  static getType(): string {
    return "divider";
  }

  static clone(node: DividerNode): DividerNode {
    return new DividerNode(node.__line, node.__recipe, node.__wrapper, node.__key);
  }

  getLine(): string {
    return this.getLatest().__line;
  }

  getRecipe(): DividerRecipe | undefined {
    return this.getLatest().__recipe;
  }

  getWrapper(): DividerWrapper | null | undefined {
    return this.getLatest().__wrapper;
  }

  setLine(line: string): this {
    const self = this.getWritable();
    self.__line = line;
    return self;
  }

  setConfig(config: DividerConfig): this {
    const self = this.getWritable();
    self.__line = config.line;
    self.__recipe = config.recipe;
    self.__wrapper = config.wrapper ?? null;
    return self;
  }

  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "i-divider-host";
    return el;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): false {
    return false;
  }

  getTextContent(): string {
    return this.__line;
  }

  exportJSON(): SerializedDividerNode {
    return {
      type: "divider",
      version: 1,
      line: this.__line,
      recipe: this.__recipe,
      wrapper: this.__wrapper,
    };
  }

  static importJSON(serialized: SerializedDividerNode): DividerNode {
    return $createDividerNode(serialized.line ?? DEFAULT_DIVIDER, serialized.recipe, serialized.wrapper);
  }

  decorate(): ReactNode {
    return (
      <DividerComponent
        nodeKey={this.getKey()}
        line={this.getLine()}
        recipe={this.getRecipe()}
        wrapper={this.getWrapper()}
      />
    );
  }
}

export function $createDividerNode(
  line: string = DEFAULT_DIVIDER,
  recipe?: DividerRecipe,
  wrapper?: DividerWrapper | null,
): DividerNode {
  const resolvedRecipe = recipe ?? (line === DEFAULT_DIVIDER ? DEFAULT_DIVIDER_RECIPE : undefined);
  return $applyNodeReplacement(new DividerNode(line, resolvedRecipe, wrapper));
}

export function $isDividerNode(node: LexicalNode | null | undefined): node is DividerNode {
  return node instanceof DividerNode;
}
