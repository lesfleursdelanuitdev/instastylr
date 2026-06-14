import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addSave, updateSave, deleteSave, loadSaves, getSave } from "./saves";

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

const STATE_A = '{"root":{"children":[]}}';
const STATE_B = '{"root":{"children":[{"x":1}]}}';

describe("saves: update transition", () => {
  it("updateSave overwrites state in place, preserving id/name/createdAt", () => {
    const entry = addSave("My post", STATE_A);
    const ok = updateSave(entry.id, STATE_B);

    expect(ok).toBe(true);
    const after = getSave(entry.id);
    expect(after?.id).toBe(entry.id);
    expect(after?.name).toBe("My post");
    expect(after?.createdAt).toBe(entry.createdAt);
    expect(after?.state).toBe(STATE_B);
    expect(loadSaves()).toHaveLength(1); // updated in place, not appended
  });

  it("updateSave promotes a once-template entry to a real post", () => {
    // Simulate a template-kind entry living in the store.
    addSave("seed", STATE_A);
    const entry = loadSaves()[0];
    updateSave(entry.id, STATE_B);
    expect(getSave(entry.id)?.kind).toBe("post");
  });

  it("updateSave returns false for a missing id", () => {
    expect(updateSave("nope", STATE_B)).toBe(false);
  });

  it("addSave appends; deleteSave removes by id", () => {
    const a = addSave("a", STATE_A);
    const b = addSave("b", STATE_B);
    expect(loadSaves()).toHaveLength(2);
    deleteSave(a.id);
    const remaining = loadSaves();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });
});
