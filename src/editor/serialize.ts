/**
 * The projection: Lexical document model -> output Unicode string.
 *
 * This is the one-directional seam. Lexical's tree is the source of truth; the
 * output string is a throwaway derived view, regenerated on every change. We
 * walk the tree, turn each styled run into substituted Unicode, and join blocks
 * with newlines. We never parse the other direction — see the spec.
 *
 * A run's font comes from its style (see fontStyle.ts); bold/italic come from the
 * native format bitmask. Lists are structural while editing but collapse here to
 * plain Unicode: a bullet/number prefix is just inserted text, never a <ul>/<li>.
 */
import {
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type EditorState,
  type LexicalNode,
} from "lexical";
import { $isListNode, $isListItemNode, type ListNode } from "@lexical/list";
import { fontIdFromStyle } from "./fontStyle";
import { $isMarkedListNode, DEFAULT_BULLET } from "./nodes/MarkedListNode";
import { $isDividerNode } from "./nodes/DividerNode";
import { transformRun } from "../fonts/transform";

/** Indentation per nesting level, as plain spaces (not structural). */
const NEST_INDENT = "  ";

function listToString(list: ListNode, depth: number): string {
  const indent = NEST_INDENT.repeat(depth);
  const ordered = list.getListType() === "number";
  const marker = $isMarkedListNode(list) ? list.getMarker() : DEFAULT_BULLET;
  let counter = list.getStart();
  const lines: string[] = [];

  for (const item of list.getChildren()) {
    if (!$isListItemNode(item)) continue;
    // Lexical models nesting as a list item whose child is another list.
    const nested = item.getChildren().find($isListNode);
    if (nested && $isListNode(nested)) {
      lines.push(listToString(nested, depth + 1));
      continue;
    }
    const inline = item.getChildren().map(nodeToString).join("");
    const prefix = ordered ? `${counter}. ` : `${marker} `;
    if (ordered) counter++;
    lines.push(indent + prefix + inline);
  }
  return lines.join("\n");
}

function nodeToString(node: LexicalNode): string {
  if ($isLineBreakNode(node)) return "\n";
  if ($isTextNode(node)) {
    return transformRun({
      text: node.getTextContent(),
      fontId: fontIdFromStyle(node.getStyle()),
      bold: node.hasFormat("bold"),
      italic: node.hasFormat("italic"),
    });
  }
  if ($isListNode(node)) return listToString(node, 0);
  // A divider collapses to its stored line with one blank line above and below.
  // Top-level blocks are joined by a single "\n", so wrapping the line in "\n…\n"
  // yields the blank line on each side (e.g. "above\n\n━━━\n\nbelow").
  if ($isDividerNode(node)) return `\n${node.getLine()}\n`;
  if ($isElementNode(node)) {
    return node.getChildren().map(nodeToString).join("");
  }
  return node.getTextContent();
}

export function editorStateToOutput(editorState: EditorState): string {
  return editorState.read(() => {
    const blocks = $getRoot().getChildren();
    // Top-level blocks (paragraphs, lists) are separated by newlines; inline
    // content within a block is concatenated.
    return blocks.map(nodeToString).join("\n");
  });
}
