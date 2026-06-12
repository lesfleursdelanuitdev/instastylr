export type Layout = "side" | "stack";

/**
 * Desktop-only choice of where the output box sits relative to the input:
 * to the right ("side") or below ("stack"). Hidden on mobile, which is always
 * stacked. The chosen value is persisted by the parent.
 */
export function LayoutToggle({ value, onChange }: { value: Layout; onChange: (l: Layout) => void }) {
  return (
    <div className="layout-toggle" role="group" aria-label="Output position">
      <button
        type="button"
        className={value === "side" ? "is-active" : ""}
        aria-pressed={value === "side"}
        title="Output to the right of the input"
        onClick={() => onChange("side")}
      >
        ▥ Right
      </button>
      <button
        type="button"
        className={value === "stack" ? "is-active" : ""}
        aria-pressed={value === "stack"}
        title="Output below the input"
        onClick={() => onChange("stack")}
      >
        ▤ Below
      </button>
    </div>
  );
}
