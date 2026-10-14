import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from "lexical";
import { $patchStyleText, $getSelectionStyleValueForProperty } from "@lexical/selection";
import { $getNearestNodeOfType, $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $createDividerNode } from "../nodes/DividerNode";
import { FONT_STYLE_PROP, fontIdFromStyle, isKnownFont } from "../fontStyle";
import { supportsBold, supportsItalic } from "../../fonts/mappings";
import { FontMenu } from "../../ui/FontMenu";
import { FontPanel } from "../../ui/FontPanel";
import { MoreMenu } from "./MoreMenu";

type ListState = "bullet" | "number" | null;
type Layout = "row" | "col";

/** A format axis (bold/italic) across the selection: all / none / some. */
type Tri = "on" | "off" | "mixed";
const MIXED_FONT = ""; // sentinel: selection spans more than one font

/** Reduce a format bit across selected text nodes to a tri-state value. */
function triState(nodes: { hasFormat: (f: TextFormatType) => boolean }[], fmt: TextFormatType): Tri {
  let on = 0;
  for (const n of nodes) if (n.hasFormat(fmt)) on++;
  return on === 0 ? "off" : on === nodes.length ? "on" : "mixed";
}

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
  divider: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><circle cx="6" cy="6" r="0.5" fill="currentColor" stroke="none" /><circle cx="12" cy="6" r="0.5" fill="currentColor" stroke="none" /><circle cx="18" cy="6" r="0.5" fill="currentColor" stroke="none" /><circle cx="6" cy="18" r="0.5" fill="currentColor" stroke="none" /><circle cx="12" cy="18" r="0.5" fill="currentColor" stroke="none" /><circle cx="18" cy="18" r="0.5" fill="currentColor" stroke="none" /></svg>
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
  onStripFormats,
}: {
  layout: Layout;
  onToggleLayout: () => void;
  onReset: () => void;
  onActiveFontChange: (fontId: string) => void;
  /** Fired when a font change drops bold/italic the new font can't render. */
  onStripFormats: (fontId: string, bold: boolean, italic: boolean) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [bold, setBold] = useState<Tri>("off");
  const [italic, setItalic] = useState<Tri>("off");
  const [boldAvail, setBoldAvail] = useState(true);
  const [italicAvail, setItalicAvail] = useState(true);
  const [fontId, setFontId] = useState("serif");
  const [listType, setListType] = useState<ListState>(null);
  const [fontPanelOpen, setFontPanelOpen] = useState(false);
  const closeFontPanel = useCallback(() => {
    setFontPanelOpen(false);
    editor.focus();
  }, [editor]);

  const readSelectionState = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const textNodes = selection.getNodes().filter($isTextNode);
    const collapsed = selection.isCollapsed() || textNodes.length === 0;

    // Fonts covered by the selection. Collapsed/empty → the caret's pending font.
    let fonts: string[];
    if (collapsed) {
      const raw = $getSelectionStyleValueForProperty(selection, FONT_STYLE_PROP, "serif");
      fonts = [isKnownFont(raw) ? raw : "serif"];
    } else {
      fonts = textNodes.map((n) => fontIdFromStyle(n.getStyle()));
    }
    const fontSet = new Set(fonts);
    setFontId(fontSet.size === 1 ? (fonts[0] as string) : MIXED_FONT);

    // Availability is gated by the whole selection: disable if ANY covered font
    // can't express the style (a single toggle couldn't produce a uniform result).
    setBoldAvail(fonts.every(supportsBold));
    setItalicAvail(fonts.every(supportsItalic));

    // Value is tri-state: collapsed uses the pending bit, ranges reduce per node.
    setBold(collapsed ? (selection.hasFormat("bold") ? "on" : "off") : triState(textNodes, "bold"));
    setItalic(
      collapsed ? (selection.hasFormat("italic") ? "on" : "off") : triState(textNodes, "italic"),
    );

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
    const stripBold = !supportsBold(nextFontId);
    const stripItalic = !supportsItalic(nextFontId);
    let strippedBold = false;
    let strippedItalic = false;

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $patchStyleText(selection, { [FONT_STYLE_PROP]: nextFontId === "serif" ? null : nextFontId });

      // The new font can't render bold/italic → force those bits off (decision:
      // strip, not keep-latent) so the toolbar never claims an inert style.
      const collapsed = selection.isCollapsed();
      const clear = (fmt: TextFormatType): boolean => {
        if (collapsed) {
          if (!selection.hasFormat(fmt)) return false;
          selection.toggleFormat(fmt); // clear the pending bit for next-typed chars
          return true;
        }
        const nodes = selection.getNodes().filter($isTextNode); // post-split, exactly the range
        let had = false;
        for (const n of nodes)
          if (n.hasFormat(fmt)) {
            had = true;
            n.toggleFormat(fmt);
          }
        return had;
      };
      if (stripBold) strippedBold = clear("bold");
      if (stripItalic) strippedItalic = clear("italic");
    });

    setFontId(nextFontId);
    editor.focus();
    if (strippedBold || strippedItalic) onStripFormats(nextFontId, strippedBold, strippedItalic);
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

  const insertDivider = () => {
    editor.update(() => $insertNodeToNearestRoot($createDividerNode()));
    editor.focus();
  };

  const noFocusSteal = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div id="toolbar" role="toolbar" aria-label="Formatting">
      <button className="tbtn" id="btn-undo" title="Undo" aria-label="Undo" onMouseDown={noFocusSteal} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        {I.undo}
      </button>
      <button className="tbtn" id="btn-redo" title="Redo" aria-label="Redo" onMouseDown={noFocusSteal} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        {I.redo}
      </button>
      <div className="sep" />

      <button
        className={`tbtn${bold === "on" ? " active" : ""}${bold === "mixed" ? " mixed" : ""}`}
        id="btn-bold"
        aria-label="Bold"
        title={boldAvail ? "Bold" : "Bold isn’t available in this font"}
        aria-pressed={bold === "on" ? true : bold === "mixed" ? "mixed" : false}
        disabled={!boldAvail}
        onMouseDown={noFocusSteal}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        {I.bold}
      </button>
      <button
        className={`tbtn${italic === "on" ? " active" : ""}${italic === "mixed" ? " mixed" : ""}`}
        id="btn-italic"
        aria-label="Italic"
        title={italicAvail ? "Italic" : "Italic isn’t available in this font"}
        aria-pressed={italic === "on" ? true : italic === "mixed" ? "mixed" : false}
        disabled={!italicAvail}
        onMouseDown={noFocusSteal}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        {I.italic}
      </button>
      <div className="sep" />

      <FontMenu
        fontId={fontId === MIXED_FONT ? null : fontId}
        onPick={applyFont}
        onMore={() => setFontPanelOpen(true)}
      />
      <FontPanel
        open={fontPanelOpen}
        fontId={fontId === MIXED_FONT ? null : fontId}
        onPick={(id) => {
          setFontPanelOpen(false);
          applyFont(id);
        }}
        onClose={closeFontPanel}
      />

      <MoreMenu
        listType={listType}
        ulIcon={I.ul}
        olIcon={I.ol}
        dividerIcon={I.divider}
        onToggleBullet={toggleBullet}
        onToggleNumber={toggleNumber}
        onInsertDivider={insertDivider}
        resetIcon={I.reset}
        onReset={onReset}
      />

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
        <button className="tbtn" id="btn-reset" title="Reset to start" aria-label="Reset to start" onClick={onReset}>
          {I.reset}
        </button>
      </div>
    </div>
  );
}
