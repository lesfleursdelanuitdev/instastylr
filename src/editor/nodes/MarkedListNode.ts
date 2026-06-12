/**
 * MarkedListNode — a ListNode that remembers its bullet marker.
 *
 * Lists are structural *only while editing*; on output they collapse to plain
 * Unicode (see serialize.ts). The marker is therefore not a rendering concern —
 * it's data the projection reads. Storing it per-list (rather than as one global
 * setting) is what makes the marker "inline customizable": each bulleted list
 * remembers its own bullet, so changing the bullet while the caret is in one
 * list doesn't touch the others.
 *
 * For numbered lists the marker is unused (we emit 1. 2. 3.).
 */
import {
  $applyNodeReplacement,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { ListNode, type ListType, type SerializedListNode } from "@lexical/list";
import type { Spread } from "lexical";

export const DEFAULT_BULLET = "•";

export type SerializedMarkedListNode = Spread<{ marker: string }, SerializedListNode>;

export class MarkedListNode extends ListNode {
  __marker: string;

  constructor(listType: ListType, start: number, marker: string = DEFAULT_BULLET, key?: string) {
    super(listType, start, key);
    this.__marker = marker;
  }

  static getType(): string {
    return "marked-list";
  }

  static clone(node: MarkedListNode): MarkedListNode {
    return new MarkedListNode(node.getListType(), node.getStart(), node.__marker, node.__key);
  }

  getMarker(): string {
    return this.getLatest().__marker;
  }

  setMarker(marker: string): this {
    const self = this.getWritable();
    self.__marker = marker;
    return self;
  }

  /** Mirror the marker into the editor DOM so the input preview matches output. */
  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const dom = super.createDOM(config, editor);
    this.applyMarkerVar(dom);
    return dom;
  }

  updateDOM(prevNode: MarkedListNode, dom: HTMLElement, config: EditorConfig): boolean {
    const recreate = super.updateDOM(prevNode, dom, config);
    if (recreate) return true;
    if (prevNode.__marker !== this.__marker) this.applyMarkerVar(dom);
    return false;
  }

  private applyMarkerVar(dom: HTMLElement): void {
    if (this.getListType() === "bullet") {
      // JSON.stringify quotes the value so CSS `content` accepts it verbatim.
      dom.style.setProperty("--ist-marker", JSON.stringify(this.__marker));
    } else {
      dom.style.removeProperty("--ist-marker");
    }
  }

  exportJSON(): SerializedMarkedListNode {
    return { ...super.exportJSON(), type: "marked-list", version: 1, marker: this.__marker };
  }

  static importJSON(serialized: SerializedMarkedListNode): MarkedListNode {
    const node = $createMarkedListNode(serialized.listType, serialized.start, serialized.marker ?? DEFAULT_BULLET);
    node.setFormat(serialized.format);
    node.setIndent(serialized.indent);
    node.setDirection(serialized.direction);
    return node;
  }
}

export function $createMarkedListNode(
  listType: ListType,
  start = 1,
  marker: string = DEFAULT_BULLET,
): MarkedListNode {
  return $applyNodeReplacement(new MarkedListNode(listType, start, marker));
}

export function $isMarkedListNode(node: LexicalNode | null | undefined): node is MarkedListNode {
  return node instanceof MarkedListNode;
}
