import { useEffect, useState } from "react";
import { TIP_CLASSES, type TipClassId, loadDismissed, reenableTip, dismissTip, resetTips } from "../tips";
import { PLATFORMS, type PlatformId, platformById } from "../platforms";

const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

type Theme = "light" | "dark";
type Layout = "row" | "col";

/**
 * Settings overlay (reached from the side-menu drawer, not its own navbar icon).
 * Today it owns: re-enabling silenced advisory tips (§5/§6 of docs/STATE_MODEL.md)
 * and a mirror of the theme/layout preferences that also have quick toggles
 * elsewhere — both views read/write the same source of truth, no duplicated state.
 */
export function SettingsPanel({
  open,
  onClose,
  theme,
  onTheme,
  layout,
  onLayout,
  platform,
  onPlatform,
}: {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onTheme: (t: Theme) => void;
  layout: Layout;
  onLayout: (l: Layout) => void;
  platform: PlatformId;
  onPlatform: (p: PlatformId) => void;
}) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  // Local mirror of the dismissed-tips set so toggles re-render immediately.
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (open) {
      setRender(true);
      setDismissed(loadDismissed());
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = window.setTimeout(() => setRender(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  const toggleTip = (id: TipClassId, silenced: boolean) => {
    if (silenced) reenableTip(id);
    else dismissTip(id);
    setDismissed(loadDismissed());
  };

  const allActive = dismissed.size === 0;

  if (!render) return null;

  return (
    <>
      <div
        id="settings-overlay"
        className={`overlay-scrim${shown ? " visible" : ""}`}
        onClick={onClose}
      />
      <div id="settings-panel" className={shown ? "open" : ""} role="dialog" aria-label="Settings">
        <div className="panel-header">
          <span className="panel-title">Settings</span>
          <button className="btn-close-panel" title="Close" aria-label="Close" onClick={onClose}>
            {CloseIcon}
          </button>
        </div>

        <div className="settings-body">
          <section className="settings-group">
            <div className="settings-group-title">Appearance</div>
            <div className="settings-row">
              <span className="settings-label">Theme</span>
              <div className="seg">
                <button className={theme === "light" ? "on" : ""} onClick={() => onTheme("light")}>
                  Light
                </button>
                <button className={theme === "dark" ? "on" : ""} onClick={() => onTheme("dark")}>
                  Dark
                </button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Layout</span>
              <div className="seg">
                <button className={layout === "row" ? "on" : ""} onClick={() => onLayout("row")}>
                  Row
                </button>
                <button className={layout === "col" ? "on" : ""} onClick={() => onLayout("col")}>
                  Column
                </button>
              </div>
            </div>
          </section>

          <section className="settings-group">
            <div className="settings-group-title">Word count</div>
            <div className="settings-row">
              <span className="settings-label">
                Platform
                <span className="tip-blurb">
                  Character limit the footer counts down against
                </span>
              </span>
              <select
                className="settings-select"
                value={platform}
                onChange={(e) => onPlatform(e.target.value as PlatformId)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <span className="settings-label">Limit</span>
              <span className="settings-value">
                {platformById(platform).limit.toLocaleString()} characters
              </span>
            </div>
          </section>

          <section className="settings-group">
            <div className="settings-group-title">Tips &amp; notifications</div>
            {TIP_CLASSES.map((tip) => {
              const silenced = dismissed.has(tip.id);
              return (
                <div className="settings-row tip-row" key={tip.id}>
                  <span className="settings-label">
                    {tip.label}
                    <span className="tip-blurb">{tip.blurb}</span>
                  </span>
                  <button
                    className={`tip-toggle${silenced ? "" : " on"}`}
                    role="switch"
                    aria-checked={!silenced}
                    title={silenced ? "Silenced — click to re-enable" : "Active — click to silence"}
                    onClick={() => toggleTip(tip.id, silenced)}
                  >
                    <span className="tip-knob" />
                  </button>
                </div>
              );
            })}
            <button
              className="settings-reset"
              disabled={allActive}
              onClick={() => {
                resetTips();
                setDismissed(loadDismissed());
              }}
            >
              {allActive ? "All tips are on" : "Reset all tips"}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
