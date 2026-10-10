/**
 * DividerNode — a horizontal rule for a plain-text world.
 *
 * Stores a rendered `line` for export plus optional `recipe` / `wrapper` so the
 * picker builder can reopen with the same settings.
 */
import { type ReactNode, useCallback, useEffect, useRef } from "react";
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

export const DEFAULT_DIVIDER = DEFAULT_DIVIDER_LINE;

const DEFAULT_DIVIDER_RECIPE: DividerRecipe = {
  kind: "repeat",
  char: "━",
  count: 10,
  mode: "solid",
};

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
              setSelected(!isSelected);
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
    <div className={`i-divider${isSelected ? " selected" : ""}`} role="separator" aria-label="Divider">
      <span ref={lineRef} className="i-divider-line">
        {line}
      </span>
      {isSelected && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DividerPicker line={line} recipe={recipe} wrapper={wrapper} onApply={applyConfig} />
        </div>
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
