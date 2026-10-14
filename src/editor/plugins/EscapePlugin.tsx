import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_LOW, KEY_ESCAPE_COMMAND } from "lexical";

/** The app's popovers that close on Escape (each listens for it itself). */
const OPEN_POPOVERS = "#more-menu.open, #emoji-picker.open, #bullet-menu, #divider-menu, #font-menu";

/**
 * Lexical's rich-text plugin treats Escape as "leave the editor" and blurs it,
 * which is a useful way out for keyboard users. But when Escape is closing one
 * of our menus, the caret should stay put so typing carries on where it was.
 */
export function EscapePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () => editor.registerCommand(KEY_ESCAPE_COMMAND, () => document.querySelector(OPEN_POPOVERS) !== null, COMMAND_PRIORITY_LOW),
    [editor],
  );
  return null;
}
