import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { $patchStyleText, $getSelectionStyleValueForProperty } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { FONTS, supportsBold, supportsItalic } from "../../fonts/mappings";
import { FONT_STYLE_PROP, isKnownFont } from "../fontStyle";
import { $isMarkedListNode, DEFAULT_BULLET } from "../nodes/MarkedListNode";
import { EmojiPicker } from "./EmojiPicker";

const MARKER_PRESETS = ["•", "◦", "▪", "‣", "→", "·", "–", "★"];
const DEFAULT_RULE_CHAR = "━";

type ListState = "bullet" | "number" | null;

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [fontId, setActiveFontId] = useState("serif");
  const [listType, setListType] = useState<ListState>(null);
  const [bulletMarker, setBulletMarker] = useState(DEFAULT_BULLET);
  const [ruleChar, setRuleChar] = useState(DEFAULT_RULE_CHAR);
  const [ruleLen, setRuleLen] = useState(12);

  const readSelectionState = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));

    const raw = $getSelectionStyleValueForProperty(selection, FONT_STYLE_PROP, "serif");
    setActiveFontId(isKnownFont(raw) ? raw : "serif");

    const list = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);
    if (list) {
      setListType(list.getListType() === "number" ? "number" : "bullet");
      // Reflect the active list's own marker in the input.
      if ($isMarkedListNode(list) && list.getListType() === "bullet") setBulletMarker(list.getMarker());
    } else {
      setListType(null);
    }
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

  const applyFont = (nextFontId: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $patchStyleText(selection, { [FONT_STYLE_PROP]: nextFontId === "serif" ? null : nextFontId });
    });
    setActiveFontId(nextFontId);
    editor.focus();
  };

  // Stamp a marker onto whichever bullet list the caret currently sits in.
  const stampMarkerOnCurrentList = (marker: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const list = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);
      if (list && $isMarkedListNode(list) && list.getListType() === "bullet") list.setMarker(marker);
    });
  };

  const toggleBullet = () => {
    if (listType === "bullet") {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      stampMarkerOnCurrentList(bulletMarker); // new list adopts the chosen marker
    }
    editor.focus();
  };

  const toggleNumber = () => {
    if (listType === "number") editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    editor.focus();
  };

  const changeMarker = (marker: string) => {
    setBulletMarker(marker);
    if (listType === "bullet") stampMarkerOnCurrentList(marker);
    editor.focus();
  };

  const insertRule = () => {
    const rule = (ruleChar || DEFAULT_RULE_CHAR).repeat(Math.max(1, ruleLen));
    editor.update(() => {
      const para = $createParagraphNode();
      para.append($createTextNode(rule));
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.anchor.getNode().getTopLevelElementOrThrow().insertAfter(para);
      } else {
        $getRoot().append(para);
      }
      para.selectEnd();
    });
    editor.focus();
  };

  const canBold = supportsBold(fontId);
  const canItalic = supportsItalic(fontId);

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <button
        type="button"
        className={`tb-btn${isBold && canBold ? " is-active" : ""}`}
        aria-pressed={isBold && canBold}
        disabled={!canBold}
        title={canBold ? "Bold (Ctrl/Cmd+B)" : "This font has no bold variant"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className={`tb-btn${isItalic && canItalic ? " is-active" : ""}`}
        aria-pressed={isItalic && canItalic}
        disabled={!canItalic}
        title={canItalic ? "Italic (Ctrl/Cmd+I)" : "This font has no italic variant"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <em>I</em>
      </button>

      <span className="tb-sep" aria-hidden="true" />

      <label className="tb-font">
        <span className="sr-only">Font</span>
        <select value={fontId} onChange={(e) => applyFont(e.target.value)} title="Apply font">
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <span className="tb-sep" aria-hidden="true" />

      <button
        type="button"
        className={`tb-btn${listType === "bullet" ? " is-active" : ""}`}
        aria-pressed={listType === "bullet"}
        title="Bulleted list"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleBullet}
      >
        ☰
      </button>
      <button
        type="button"
        className={`tb-btn${listType === "number" ? " is-active" : ""}`}
        aria-pressed={listType === "number"}
        title="Numbered list"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleNumber}
      >
        1.
      </button>

      <label className="tb-marker" title="Bullet marker">
        <span className="sr-only">Bullet marker</span>
        <input
          value={bulletMarker}
          onChange={(e) => changeMarker(e.target.value)}
          maxLength={4}
          aria-label="Bullet marker"
        />
      </label>
      <div className="tb-presets">
        {MARKER_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            className="tb-preset"
            title={`Use ${m}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => changeMarker(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <span className="tb-sep" aria-hidden="true" />

      <label className="tb-rule" title="Horizontal rule character">
        <span className="sr-only">Rule character</span>
        <input value={ruleChar} onChange={(e) => setRuleChar(e.target.value)} maxLength={4} aria-label="Rule character" />
      </label>
      <label className="tb-rule-len" title="Rule length">
        <span className="sr-only">Rule length</span>
        <input
          type="number"
          min={1}
          max={80}
          value={ruleLen}
          onChange={(e) => setRuleLen(Number(e.target.value) || 1)}
          aria-label="Rule length"
        />
      </label>
      <button type="button" className="tb-btn" title="Insert horizontal rule" onClick={insertRule}>
        ―
      </button>

      <span className="tb-sep" aria-hidden="true" />

      <EmojiPicker />
    </div>
  );
}
