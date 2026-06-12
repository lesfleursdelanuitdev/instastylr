import { type SavedPost } from "../saves";

/** Pull a short text preview out of a saved post for the template card. */
function previewOf(post: SavedPost): string {
  if (post.kind === "template") return "Camera:  Lens:  Settings:";
  try {
    const text: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (typeof n.text === "string") text.push(n.text);
      if (Array.isArray(n.children)) n.children.forEach(walk);
    };
    const parsed = JSON.parse(post.state) as { root?: unknown };
    walk(parsed.root);
    return text.join(" ").replace(/\s+/g, " ").trim().slice(0, 60);
  } catch {
    return "";
  }
}

const LEADING_EMOJI = /^\p{Emoji}/u;

/**
 * First-run welcome modal: explains the tool and offers the saved posts /
 * templates as quick starting points. Shown once, then suppressed via the
 * parent's localStorage flag.
 */
export function WelcomeModal({
  open,
  templates,
  onStart,
  onSkip,
  onPick,
}: {
  open: boolean;
  templates: SavedPost[];
  onStart: () => void;
  onSkip: () => void;
  onPick: (post: SavedPost) => void;
}) {
  return (
    <div
      id="welcome-overlay"
      className={open ? "open" : ""}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-logo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip();
      }}
    >
      <div id="welcome-modal">
        <div id="welcome-header">
          <div id="welcome-logo">
            <span className="accent">i</span>nstastylr
          </div>
          <div id="welcome-byline-sm">by lesfleursdelanuit</div>
        </div>
        <div id="welcome-body">
          <p id="welcome-desc">
            Instagram, YouTube, and most social platforms strip out text formatting when you paste.{" "}
            <strong>instastylr</strong> gets around this by converting your styled text into special
            Unicode characters that <em>look</em> bold, italic, or decorative anywhere — no app
            support needed.
          </p>
          <div id="welcome-features">
            <div className="welcome-feature">
              <span className="welcome-feature-icon">✍️</span>
              <span>
                Write in the editor using <strong>bold</strong>, <em>italic</em>, lists, and font
                styles
              </span>
            </div>
            <div className="welcome-feature">
              <span className="welcome-feature-icon">👁️</span>
              <span>The Output panel shows how your text will look once pasted</span>
            </div>
            <div className="welcome-feature">
              <span className="welcome-feature-icon">📋</span>
              <span>
                Hit <strong>Copy</strong> and paste directly into Instagram, YouTube, or anywhere
              </span>
            </div>
            <div className="welcome-feature">
              <span className="welcome-feature-icon">💾</span>
              <span>Save and name your posts for quick reuse with the Save button</span>
            </div>
          </div>
          <div id="welcome-templates-title">Start from a template</div>
          <div id="welcome-templates">
            {templates.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ph-clr)" }}>
                No templates yet — save a post to see it here.
              </p>
            ) : (
              templates.map((item) => {
                const icon = item.name.match(LEADING_EMOJI)?.[0] ?? "📄";
                const label = item.name.replace(/^\p{Emoji}\s*/u, "");
                const preview = previewOf(item);
                return (
                  <button type="button" className="welcome-tpl" key={item.id} onClick={() => onPick(item)}>
                    <span className="welcome-tpl-icon">{icon}</span>
                    <div className="welcome-tpl-info">
                      <div className="welcome-tpl-name">{label}</div>
                      {preview && <div className="welcome-tpl-desc">{preview}…</div>}
                    </div>
                    <span className="welcome-tpl-arrow">→</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div id="welcome-footer">
          <button id="btn-welcome-start" onClick={onStart}>
            Start writing →
          </button>
          <button id="btn-welcome-skip" onClick={onSkip}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
