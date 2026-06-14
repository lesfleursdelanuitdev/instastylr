import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadDismissed, isDismissed, dismissTip, reenableTip, resetTips } from "./tips";

// tips.ts reads window.localStorage at call time, so a tiny in-memory stub on
// globalThis.window is enough (vitest runs in node, no DOM, no extra deps).
function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: mockStorage() };
});
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("tips suppression", () => {
  it("starts with nothing dismissed", () => {
    expect(isDismissed("format-stripped")).toBe(false);
    expect(loadDismissed().size).toBe(0);
  });

  it("dismiss then re-enable round-trips", () => {
    dismissTip("format-stripped");
    expect(isDismissed("format-stripped")).toBe(true);
    reenableTip("format-stripped");
    expect(isDismissed("format-stripped")).toBe(false);
  });

  it("dismiss is idempotent and persists as a flat array", () => {
    dismissTip("format-stripped");
    dismissTip("format-stripped");
    expect([...loadDismissed()]).toEqual(["format-stripped"]);
  });

  it("resetTips clears every dismissal", () => {
    dismissTip("format-stripped");
    resetTips();
    expect(loadDismissed().size).toBe(0);
  });

  it("tolerates corrupt storage without throwing", () => {
    window.localStorage.setItem("instastylr.tips.dismissed.v1", "{ not json");
    expect(loadDismissed().size).toBe(0);
    expect(isDismissed("format-stripped")).toBe(false);
  });
});
