import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from "lexical";
import { $getNearestNodeOfType } from "@lexical/utils";
import { ListItemNode, ListNode } from "@lexical/list";
import { BULLET_PRESETS } from "../bullet/presets";
import { $isMarkedListNode, DEFAULT_BULLET } from "../nodes/MarkedListNode";

/** For a list's marker, the marker its sub-lists should use (the bullet picker's nested pairs). */
const SUB_MARKER = new Map<string, string>();
for (const p of BULLET_PRESETS) if (p.kind === "nested" && !SUB_MARKER.has(p.main)) SUB_MARKER.set(p.main, p.sub);

/**
 * Tab nests the list item the caret is in under the one above it; Shift+Tab
 * brings it back out. Outside a list, Tab keeps its usual job (moving focus),
 * so keyboard users are never trapped in the editor.
 *
 * A new sub-list takes the second marker of its parent's nested pair (• then ◦,
 * ❀ then ✿…); after that it's an ordinary list with its own bullet picker.
 */
export function ListIndentPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event: KeyboardEvent) => {
          const inList = editor.getEditorState().read(() => {
            const selection = $getSelection();
            return $isRangeSelection(selection) && $getNearestNodeOfType(selection.anchor.getNode(), ListItemNode) !== null;
          });
          if (!inList) return false;
          event.preventDefault();
          editor.dispatchCommand(event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND, undefined);
          if (!event.shiftKey) {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              const list = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);
              const parentList = list?.getParent()?.getParent();
              if (!list || !$isMarkedListNode(list) || !$isMarkedListNode(parentList) || list.getListType() !== "bullet") return;
              if (list.getMarker() !== DEFAULT_BULLET && list.getMarker() !== parentList.getMarker()) return; // already chosen
              const sub = SUB_MARKER.get(parentList.getMarker());
              if (sub) list.setMarker(sub);
            });
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor],
  );
  return null;
}
