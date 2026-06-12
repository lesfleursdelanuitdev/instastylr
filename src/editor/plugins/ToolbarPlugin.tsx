import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $patchStyleText, $getSelectionStyleValueForProperty } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { FONT_STYLE_PROP, isKnownFont } from "../fontStyle";
import { UI_FONTS } from "../../fonts/uiFonts";
import { EmojiPicker } from "./EmojiPicker";

type ListState = "bullet" | "number" | null;
type Layout = "row" | "col";

const I = {
  undo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
  ),
  redo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg>
  ),
  bold: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
  ),
  italic: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
  ),
  ul: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg>
  ),
  ol: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" strokeWidth="1.8" /><path d="M4 10h2" strokeWidth="1.8" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" strokeWidth="1.8" /></svg>
  ),
  rows: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="7" rx="1.5" /><rect x="3" y="14" width="18" height="7" rx="1.5" /></svg>
  ),
  cols: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1.5" /><rect x="14" y="3" width="7" height="18" rx="1.5" /></svg>
  ),
  reset: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" /></svg>
  ),
};

export function ToolbarPlugin({
  layout,
  onToggleLayout,
  onReset,
  onActiveFontChange,
}: {
  layout: Layout;
  onToggleLayout: () => void;
  onReset: () => void;
  onActiveFontChange: (fontId: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [fontId, setFontId] = useState("serif");
  const [listType, setListType] = useState<ListState>(null);

  const readSelectionState = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));

    const raw = $getSelectionStyleValueForProperty(selection, FONT_STYLE_PROP, "serif");
    setFontId(isKnownFont(raw) ? raw : "serif");

    const list = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);
    setListType(list ? (list.getListType() === "number" ? "number" : "bullet") : null);
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => editorState.read(readSelectionState)),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          readSelectionState();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, readSelectionState]);

  useEffect(() => onActiveFontChange(fontId), [fontId, onActiveFontChange]);

  const applyFont = (nextFontId: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $patchStyleText(selection, { [FONT_STYLE_PROP]: nextFontId === "serif" ? null : nextFontId });
    });
    setFontId(nextFontId);
    editor.focus();
  };

  const toggleBullet = () => {
    editor.dispatchCommand(
      listType === "bullet" ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
      undefined,
    );
    editor.focus();
  };

  const toggleNumber = () => {
    editor.dispatchCommand(
      listType === "number" ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
      undefined,
    );
    editor.focus();
  };

  const noFocusSteal = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div id="toolbar" role="toolbar" aria-label="Formatting">
      <button className="tbtn" id="btn-undo" title="Undo" onMouseDown={noFocusSteal} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        {I.undo}
      </button>
      <button className="tbtn" id="btn-redo" title="Redo" onMouseDown={noFocusSteal} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        {I.redo}
      </button>
      <div className="sep" />

      <button
        className={`tbtn${isBold ? " active" : ""}`}
        id="btn-bold"
        title="Bold"
        aria-pressed={isBold}
        onMouseDown={noFocusSteal}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        {I.bold}
      </button>
      <button
        className={`tbtn${isItalic ? " active" : ""}`}
        id="btn-italic"
        title="Italic"
        aria-pressed={isItalic}
        onMouseDown={noFocusSteal}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        {I.italic}
      </button>
      <div className="sep" />

      <button
        className={`tbtn${listType === "bullet" ? " active" : ""}`}
        id="btn-ul"
        title="Bulleted list"
        aria-pressed={listType === "bullet"}
        onMouseDown={noFocusSteal}
        onClick={toggleBullet}
      >
        {I.ul}
      </button>
      <button
        className={`tbtn${listType === "number" ? " active" : ""}`}
        id="btn-ol"
        title="Numbered list"
        aria-pressed={listType === "number"}
        onMouseDown={noFocusSteal}
        onClick={toggleNumber}
      >
        {I.ol}
      </button>
      <div className="sep" />

      <select
        id="font-select"
        title="Font style"
        value={fontId}
        onChange={(e) => applyFont(e.target.value)}
      >
        {UI_FONTS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.select}
          </option>
        ))}
      </select>

      <EmojiPicker />

      <div id="toolbar-right">
        <div className="sep" />
        <button
          className={`tbtn${layout === "col" ? " active" : ""}`}
          id="btn-layout"
          title={layout === "col" ? "Switch to row layout" : "Switch to column layout"}
          onClick={onToggleLayout}
        >
          {layout === "col" ? I.cols : I.rows}
        </button>
        <div className="sep" />
        <button className="tbtn" id="btn-reset" title="Reset to start" onClick={onReset}>
          {I.reset}
        </button>
      </div>
    </div>
  );
}
