import { useCallback, useEffect, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListNode, ListItemNode } from "@lexical/list";
import { $createParagraphNode, $getRoot, type EditorState } from "lexical";
import { Editor } from "./editor/Editor";
import { ToolbarPlugin } from "./editor/plugins/ToolbarPlugin";
import { MarkedListNode } from "./editor/nodes/MarkedListNode";
import { editorStateToOutput } from "./editor/serialize";
import { $populatePhotoCaptionTemplate } from "./editor/template";
import { instagramCount, IG_CAPTION_LIMIT } from "./count";
import { fontLabel } from "./fonts/uiFonts";
import {
  loadSaves,
  addSave,
  deleteSave,
  seedTemplateOnce,
  isValidEditorStateJson,
  type SavedPost,
} from "./saves";
import { SavesPanel } from "./ui/SavesPanel";
import { WelcomeModal } from "./ui/WelcomeModal";

// Font lives in each TextNode's style (see fontStyle.ts), so no custom *text*
// node is needed — bold/italic ride the native format bitmask. Lists do use a
// custom node so each bulleted list can carry its own marker.
const initialConfig: InitialConfigType = {
  namespace: "instastylr",
  theme: {
    text: { bold: "i-bold", italic: "i-italic" },
    list: { ul: "i-ul", ol: "i-ol", listitem: "i-li" },
  },
  onError(error: Error) {
    throw error;
  },
  nodes: [
    ListNode,
    ListItemNode,
    MarkedListNode,
    {
      replace: ListNode,
      with: (node: ListNode) => new MarkedListNode(node.getListType(), node.getStart()),
      withKlass: MarkedListNode,
    },
  ],
};

type Theme = "light" | "dark";
type Layout = "row" | "col";

const THEME_KEY = "instastylr.theme.v1";
const LAYOUT_KEY = "instastylr.layout.v2";
const WELCOMED_KEY = "instastylr.welcomed.v1";

function readStored<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    if (v && (allowed as string[]).includes(v)) return v as T;
  } catch {
    // storage unavailable
  }
  return fallback;
}

export function App() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <AppInner />
    </LexicalComposer>
  );
}

function AppInner() {
  const [editor] = useLexicalComposerContext();

  // ── Derived output + stats ──────────────────────────────
  const [output, setOutput] = useState("");
  const [words, setWords] = useState(0);
  const [lines, setLines] = useState(1);
  const [chars, setChars] = useState(0);
  const [activeFont, setActiveFont] = useState("serif");

  // ── Shell state ─────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>(() => readStored(THEME_KEY, ["light", "dark"], "light"));
  const [layout, setLayout] = useState<Layout>(() => readStored(LAYOUT_KEY, ["row", "col"], "row"));
  const [outputOpen, setOutputOpen] = useState(true);
  const [outputHeight, setOutputHeight] = useState(220);
  const [editorWidthPct, setEditorWidthPct] = useState(55);
  const [handleDragging, setHandleDragging] = useState(false);
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Saves / modals / toast ──────────────────────────────
  const [saves, setSaves] = useState<SavedPost[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const contentRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, h: 220, pct: 55 });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastShow(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastShow(false), 2200);
  }, []);

  // ── Compute output + stats on every editor change ───────
  useEffect(() => {
    const compute = (state: EditorState) => {
      const out = editorStateToOutput(state);
      setOutput(out);
      setChars(out ? instagramCount(out) : 0);
      const el = editor.getRootElement();
      const raw = el ? el.innerText : "";
      const trimmed = raw.replace(/[\n\s]+$/, "");
      setWords(trimmed ? trimmed.trim().split(/\s+/).length : 0);
      setLines(
        trimmed ? raw.split("\n").filter((l, i, a) => i < a.length - 1 || l.trim() !== "").length : 1,
      );
    };
    compute(editor.getEditorState());
    return editor.registerUpdateListener(({ editorState }) => compute(editorState));
  }, [editor]);

  // ── First-run: seed template, load saves, maybe welcome ─
  useEffect(() => {
    seedTemplateOnce();
    setSaves(loadSaves());
    try {
      if (!window.localStorage.getItem(WELCOMED_KEY)) setWelcomeOpen(true);
    } catch {
      // ignore
    }
  }, []);

  // ── Reflect theme / layout / collapse onto <html> ───────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("col-layout", layout === "col");
    try {
      window.localStorage.setItem(LAYOUT_KEY, layout);
    } catch {
      // ignore
    }
  }, [layout]);

  useEffect(() => {
    document.documentElement.classList.toggle("panel-collapsed", layout === "col" && !outputOpen);
  }, [layout, outputOpen]);

  // ── Drop to row layout when the viewport gets narrow ────
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 769 && layout === "col") setLayout("row");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [layout]);

  // ── Drag handle (resize output height / editor width) ───
  const startDrag = (clientX: number, clientY: number) => {
    draggingRef.current = true;
    dragStart.current = { x: clientX, y: clientY, h: outputHeight, pct: editorWidthPct };
    setHandleDragging(true);
    document.body.style.cursor = layout === "col" ? "ew-resize" : "ns-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const move = (clientX: number, clientY: number) => {
      if (!draggingRef.current) return;
      if (layout === "col") {
        const node = contentRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const pct = Math.max(20, Math.min(80, ((clientX - rect.left) / node.offsetWidth) * 100));
        setEditorWidthPct(pct);
      } else {
        const dy = dragStart.current.y - clientY;
        setOutputHeight(Math.max(60, Math.min(window.innerHeight * 0.75, dragStart.current.h + dy)));
      }
    };
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current) {
        const t = e.touches[0];
        move(t.clientX, t.clientY);
        e.preventDefault();
      }
    };
    const end = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setHandleDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", end);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", end);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", end);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", end);
    };
  }, [layout]);

  // ── Editor-touching actions ─────────────────────────────
  // Returns false if the stored state was missing/corrupt (editor left as-is).
  const openPost = useCallback(
    (post: SavedPost): boolean => {
      if (post.kind === "template") {
        editor.update(() => $populatePhotoCaptionTemplate());
        editor.focus();
        return true;
      }
      if (!isValidEditorStateJson(post.state)) return false;
      try {
        editor.setEditorState(editor.parseEditorState(post.state));
      } catch {
        return false;
      }
      editor.focus();
      return true;
    },
    [editor],
  );

  const handleSave = (name: string) => {
    const state = JSON.stringify(editor.getEditorState().toJSON());
    addSave(name, state);
    setSaves(loadSaves());
    showToast(`Saved "${name}"`);
  };

  const handleOpen = (post: SavedPost) => {
    const ok = openPost(post);
    setPanelOpen(false);
    showToast(ok ? `Opened "${post.name}"` : "Couldn’t open — saved post is corrupt");
  };

  const handleDelete = (id: string) => {
    deleteSave(id);
    setSaves(loadSaves());
    showToast("Post deleted");
  };

  const handleReset = () => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode());
    });
    setActiveFont("serif");
    setFlash(false);
    requestAnimationFrame(() => {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 450);
    });
    editor.focus();
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const closeWelcome = () => {
    setWelcomeOpen(false);
    try {
      window.localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      // ignore
    }
  };

  // ── Derived display values ──────────────────────────────
  const igLeft = IG_CAPTION_LIMIT - chars;
  const igClass = igLeft < 0 ? "over" : igLeft <= 300 ? "warn" : "ok";
  const igText =
    igLeft < 0
      ? `${Math.abs(igLeft).toLocaleString()} over IG limit`
      : `${igLeft.toLocaleString()} left for IG`;

  const chevronTransform =
    layout === "col"
      ? outputOpen
        ? "rotate(-90deg)"
        : "rotate(90deg)"
      : outputOpen
        ? "rotate(0deg)"
        : "rotate(-180deg)";

  const editorWrapStyle =
    layout === "col" ? { width: `${editorWidthPct}%`, flex: "none" as const } : undefined;
  const outputPanelStyle =
    layout === "col"
      ? outputOpen
        ? { width: `${100 - editorWidthPct}%`, flex: "none" as const }
        : { flex: "none" as const }
      : undefined;
  const outputBodyStyle =
    layout === "row" && outputOpen ? { height: `${outputHeight}px` } : undefined;
  const outputBodyCollapsed = layout === "row" && !outputOpen;

  const dark = theme === "dark";

  return (
    <div id="app">
      {/* ── App header ── */}
      <header id="app-header">
        <div id="brand-wrap">
          <span id="brand">
            <span className="accent">i</span>nstastylr
          </span>
          <span id="byline">by lesfleursdelanuit</span>
        </div>
        <div id="header-right">
          <button id="btn-save-hdr" title="Save current post" onClick={() => setPanelOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            Save
          </button>
          <button id="btn-load-hdr" title="Open saved posts" onClick={() => setPanelOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            Open
          </button>
          <button
            id="btn-theme"
            title="Toggle dark / light mode"
            aria-label="Toggle theme"
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            <span id="theme-knob">
              {dark ? (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>
              ) : (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              )}
            </span>
          </button>
          <button id="btn-menu" title="All saved posts" onClick={() => setPanelOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <ToolbarPlugin
        layout={layout}
        onToggleLayout={() => setLayout(layout === "col" ? "row" : "col")}
        onReset={handleReset}
        onActiveFontChange={setActiveFont}
      />

      {/* ── Content: editor + handle + output ── */}
      <div id="content" ref={contentRef}>
        <div id="editor-wrap" className={flash ? "flash" : ""} style={editorWrapStyle}>
          <Editor />
        </div>

        <div
          id="main-handle"
          className={handleDragging ? "dragging" : ""}
          aria-hidden="true"
          onMouseDown={(e) => {
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
          }}
        >
          <div id="handle-grip">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div id="output-panel" style={outputPanelStyle}>
          <div id="output-header">
            <button id="toggle-btn" onClick={() => setOutputOpen((o) => !o)}>
              <svg id="chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: chevronTransform }}><polyline points="6 9 12 15 18 9" /></svg>
              <span className="output-label">Output</span>
            </button>
            <button id="copy-btn" className={copied ? "copied" : ""} onClick={copy}>
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              )}
              <span id="copy-text">{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <div
            id="output-body"
            className={outputBodyCollapsed ? "collapsed" : ""}
            style={outputBodyStyle}
            aria-live="polite"
          >
            {output ? output : <span className="out-ph">Your styled text will appear here…</span>}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div id="footer">
        <span className="stat" id="word-stat">
          {words} {words === 1 ? "word" : "words"}
        </span>
        <span className="stat" id="line-stat">
          {lines} {lines === 1 ? "line" : "lines"}
        </span>
        <span className="stat" id="char-stat">
          {chars} {chars === 1 ? "char" : "chars"}
        </span>
        <span className={`stat ${igClass}`} id="ig-stat">
          {igText}
        </span>
        <span id="font-stat">{fontLabel(activeFont)}</span>
      </div>

      {/* ── Modals / panels / toast ── */}
      <WelcomeModal
        open={welcomeOpen}
        templates={saves}
        onStart={closeWelcome}
        onSkip={closeWelcome}
        onPick={(post) => {
          const ok = openPost(post);
          closeWelcome();
          showToast(ok ? `Opened "${post.name}"` : "Couldn’t open — saved post is corrupt");
        }}
      />
      <SavesPanel
        open={panelOpen}
        saves={saves}
        onClose={() => setPanelOpen(false)}
        onSave={handleSave}
        onOpen={handleOpen}
        onDelete={handleDelete}
      />
      <div id="toast" className={toastShow ? "show" : ""}>
        {toast}
      </div>
    </div>
  );
}
