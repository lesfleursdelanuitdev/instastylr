import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
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
import {
  FONT_STYLE_PROP,
  MARKS_STYLE_PROP,
  fontIdFromStyle,
  isKnownFont,
  marksFromStyle,
  marksStyleValue,
  parseMarks,
} from "../fontStyle";
import { MARKS, cleanMarks } from "../../fonts/marks";
import { stylePreset } from "../../fonts/uiFonts";
import { STYLE_PRESETS } from "../../fonts/scraped/presets";
import { MarksMenu, type MarkState } from "../../ui/MarksMenu";
import { supportsBold, supportsItalic } from "../../fonts/mappings";
import { FontMenu } from "../../ui/FontMenu";
import { FontPanel, type PanelSample } from "../../ui/FontPanel";
import { loadRecentFonts, recordFontUse } from "../../fonts/recent";
import { MoreMenu } from "./MoreMenu";

type ListState = "bullet" | "number" | null;
type Layout = "row" | "col";

/** A format axis (bold/italic) across the selection: all / none / some. */
type Tri = "on" | "off" | "mixed";
const MIXED_FONT = ""; // sentinel: selection spans more than one font
// Stands in for "no marks" inside a style patch function (which can't remove a
// property); cleared off the nodes straight after.
const NO_MARKS = "none";
const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The preset (font + bold/italic + marks) the text is in, if it is exactly one. */
function presetFor(fontId: string, bold: boolean, italic: boolean, marks: readonly string[]): string | null {
  if (!marks.length) return null;
  const p = STYLE_PRESETS.find(
    (x) => x.font === fontId && x.bold === bold && x.italic === italic && sameList(x.marks, marks),
  );
  return p?.id ?? null;
}

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
  const [markState, setMarkState] = useState<Record<string, MarkState>>({});
  /** The marks when the whole selection has the same ones (else null). */
  const [uniformMarks, setUniformMarks] = useState<string[] | null>([]);
  const [listType, setListType] = useState<ListState>(null);
  const [fontPanelOpen, setFontPanelOpen] = useState(false);
  const [panelSample, setPanelSample] = useState<PanelSample | null>(null);
  const [recent, setRecent] = useState<string[]>(() => loadRecentFonts());
  const openFontPanel = () => {
    // The panel previews whatever is selected (one line, kept short), else a stock sample.
    const raw = editor.getEditorState().read(() => {
      const sel = $getSelection();
      return $isRangeSelection(sel) && !sel.isCollapsed() ? sel.getTextContent() : "";
    });
    const text = raw.replace(/\s+/g, " ").trim();
    setPanelSample(
      text ? { text: text.length > 48 ? `${text.slice(0, 47)}…` : text, bold: bold === "on", italic: italic === "on" } : null,
    );
    setFontPanelOpen(true);
  };
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

    // Marks: each one on / off / mixed across the selection, like bold.
    const markSets = collapsed
      ? [parseMarks($getSelectionStyleValueForProperty(selection, MARKS_STYLE_PROP, ""))]
      : textNodes.map((n) => marksFromStyle(n.getStyle()));
    const next: Record<string, MarkState> = {};
    for (const m of MARKS) {
      const n = markSets.filter((set) => set.includes(m.id)).length;
      if (n) next[m.id] = n === markSets.length ? "on" : "mixed";
    }
    setMarkState(next);
    setUniformMarks(markSets.every((set) => sameList(set, markSets[0])) ? markSets[0] : null);

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
      // The B and I buttons go grey in a font with no bold/italic, but the keyboard
      // shortcuts send the same command. Swallow it there, or a hidden bold would be
      // stored and surface later when the text is switched to a font that has one.
      editor.registerCommand(
        FORMAT_TEXT_COMMAND,
        (format) => {
          if (format !== "bold" && format !== "italic") return false;
          return editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return false;
            const nodes = selection.getNodes().filter($isTextNode);
            const fonts =
              selection.isCollapsed() || nodes.length === 0
                ? [$getSelectionStyleValueForProperty(selection, FONT_STYLE_PROP, "serif") || "serif"]
                : nodes.map((n) => fontIdFromStyle(n.getStyle()));
            const has = format === "bold" ? supportsBold : supportsItalic;
            return !fonts.every((f) => has(isKnownFont(f) ? f : "serif")); // true = handled (ignored)
          });
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, readSelectionState]);

  useEffect(() => onActiveFontChange(fontId), [fontId, onActiveFontChange]);

  /**
   * Put the selection (or the caret's next typing) in a font. A preset also sets
   * bold/italic exactly and replaces the marks; a plain font leaves both alone.
   */
  const applyStyle = (id: string) => {
    const p = stylePreset(id);
    if (p) applyFont(p.font, { bold: p.bold, italic: p.italic, marks: p.marks, recordAs: p.id });
    else applyFont(id);
  };

  const applyFont = (
    nextFontId: string,
    opts: { bold?: boolean; italic?: boolean; marks?: string[]; recordAs?: string } = {},
  ) => {
    const stripBold = !supportsBold(nextFontId);
    const stripItalic = !supportsItalic(nextFontId);
    let strippedBold = false;
    let strippedItalic = false;

    editor.update(() => {
      let selection = $getSelection();
      // No caret yet (the editor was never focused, e.g. straight from the page
      // load to the font panel): put one at the end, where typing will start,
      // so the font takes effect instead of silently doing nothing.
      if (!$isRangeSelection(selection)) {
        $getRoot().selectEnd();
        selection = $getSelection();
      }
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

      // A preset's own bold/italic (only where the font has them).
      const set = (fmt: TextFormatType, want: boolean) => {
        if (collapsed) {
          if (selection.hasFormat(fmt) !== want) selection.toggleFormat(fmt);
          return;
        }
        for (const n of selection.getNodes().filter($isTextNode)) if (n.hasFormat(fmt) !== want) n.toggleFormat(fmt);
      };
      if (opts.bold !== undefined) set("bold", opts.bold && !stripBold);
      if (opts.italic !== undefined) set("italic", opts.italic && !stripItalic);
      if (opts.marks) $patchStyleText(selection, { [MARKS_STYLE_PROP]: marksStyleValue(opts.marks) });
    });

    setFontId(nextFontId);
    setRecent(recordFontUse(opts.recordAs ?? nextFontId));
    editor.focus();
    if (strippedBold || strippedItalic) onStripFormats(nextFontId, strippedBold, strippedItalic);
  };

  /** Turn a mark on for the whole selection, or off when all of it has it already. */
  const updateMarks = (change: (ids: string[], allHave: boolean) => string[], markId?: string) => {
    editor.update(() => {
      let selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        $getRoot().selectEnd();
        selection = $getSelection();
      }
      if (!$isRangeSelection(selection)) return;
      const nodes = selection.getNodes().filter($isTextNode);
      if (selection.isCollapsed() || nodes.length === 0) {
        const cur = parseMarks($getSelectionStyleValueForProperty(selection, MARKS_STYLE_PROP, ""));
        const allHave = markId ? cur.includes(markId) : false;
        $patchStyleText(selection, { [MARKS_STYLE_PROP]: marksStyleValue(change(cur, allHave)) });
        return;
      }
      const allHave = markId ? nodes.every((n) => marksFromStyle(n.getStyle()).includes(markId)) : false;
      $patchStyleText(selection, {
        [MARKS_STYLE_PROP]: (cur: string | null) => marksStyleValue(change(parseMarks(cur), allHave)) ?? NO_MARKS,
      });
      // Nodes left with no marks: drop the property, so they can merge with their neighbours again.
      const after = $getSelection();
      if (!$isRangeSelection(after)) return;
      for (const n of after.getNodes().filter($isTextNode)) {
        const style = n.getStyle();
        if (style.includes(`${MARKS_STYLE_PROP}: ${NO_MARKS}`))
          n.setStyle(style.replace(new RegExp(`\\s*${MARKS_STYLE_PROP}:\\s*${NO_MARKS};?`), ""));
      }
    });
    editor.focus();
  };
  const toggleMark = (markId: string) =>
    updateMarks((ids, allHave) => (allHave ? ids.filter((x) => x !== markId) : cleanMarks([...ids, markId])), markId);
  const clearMarks = () => updateMarks(() => []);

  // The font control shows a preset's name when the text is exactly in one.
  const currentStyleId =
    fontId === MIXED_FONT
      ? null
      : (uniformMarks && presetFor(fontId, bold === "on", italic === "on", uniformMarks)) || fontId;

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
      <MarksMenu
        state={markState}
        fontId={fontId === MIXED_FONT ? null : fontId}
        bold={bold === "on"}
        italic={italic === "on"}
        onToggle={toggleMark}
        onClear={clearMarks}
      />
      <div className="sep" />

      <FontMenu
        fontId={currentStyleId}
        recent={recent}
        onPick={applyStyle}
        onMore={openFontPanel}
      />
      <FontPanel
        open={fontPanelOpen}
        fontId={currentStyleId}
        sample={panelSample}
        recent={recent}
        onPick={(id) => {
          setFontPanelOpen(false);
          applyStyle(id);
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
