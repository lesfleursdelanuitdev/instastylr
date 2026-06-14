import { useEffect, useState } from "react";

const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const Arrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);

type Item = { key: string; icon: string; label: string; sub: string; onClick: () => void };

/**
 * Side-menu navigation drawer — the app's hub, opened from the navbar ☰. It is a
 * launcher: selecting an item closes the drawer and opens that surface (a
 * hand-off, not stacking). One overlay open at a time. See §7 of STATE_MODEL.md.
 */
export function SideMenu({
  open,
  onClose,
  onOpenSaves,
  onOpenSettings,
  onShowWelcome,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSaves: () => void;
  onOpenSettings: () => void;
  onShowWelcome: () => void;
}) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    setAboutOpen(false);
    const t = window.setTimeout(() => setRender(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  // Hand-off: run the action, then close the drawer.
  const go = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const items: Item[] = [
    { key: "saves", icon: "💾", label: "Saved posts", sub: "Open, save, and manage", onClick: go(onOpenSaves) },
    { key: "settings", icon: "⚙️", label: "Settings", sub: "Appearance and tips", onClick: go(onOpenSettings) },
    { key: "help", icon: "💡", label: "How it works", sub: "Replay the intro", onClick: go(onShowWelcome) },
  ];

  if (!render) return null;

  return (
    <>
      <div id="menu-overlay" className={`overlay-scrim${shown ? " visible" : ""}`} onClick={onClose} />
      <div id="side-menu" className={shown ? "open" : ""} role="dialog" aria-label="Menu">
        <div className="panel-header">
          <span className="panel-title">Menu</span>
          <button className="btn-close-panel" title="Close" onClick={onClose}>
            {CloseIcon}
          </button>
        </div>

        <nav className="menu-list">
          {items.map((it) => (
            <button className="menu-item" key={it.key} onClick={it.onClick}>
              <span className="menu-item-icon">{it.icon}</span>
              <span className="menu-item-text">
                <span className="menu-item-label">{it.label}</span>
                <span className="menu-item-sub">{it.sub}</span>
              </span>
              <span className="menu-item-arrow">{Arrow}</span>
            </button>
          ))}

          <button className="menu-item" onClick={() => setAboutOpen((v) => !v)}>
            <span className="menu-item-icon">ℹ️</span>
            <span className="menu-item-text">
              <span className="menu-item-label">About</span>
              <span className="menu-item-sub">What is instastylr?</span>
            </span>
            <span className={`menu-item-arrow${aboutOpen ? " down" : ""}`}>{Arrow}</span>
          </button>
          {aboutOpen && (
            <div className="menu-about">
              <p>
                <strong>instastylr</strong> turns formatted captions into Unicode look-alike
                characters that keep their style when pasted into Instagram, YouTube, and other
                plain-text platforms.
              </p>
              <p className="menu-about-by">by lesfleursdelanuit</p>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}
