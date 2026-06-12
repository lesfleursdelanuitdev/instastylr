import { describe, it, expect } from "vitest";
import { instagramCount, IG_CAPTION_LIMIT } from "./count";
import { transformRun } from "./fonts/transform";

describe("instagramCount", () => {
  it("counts plain ASCII by character", () => {
    expect(instagramCount("hello")).toBe(5);
    expect(instagramCount("")).toBe(0);
  });

  it("counts styled (astral) glyphs as one each, not two", () => {
    const bold = transformRun({ text: "hello", fontId: "serif", bold: true, italic: false });
    expect(bold.length).toBe(10); // raw UTF-16 units — the trap
    expect(instagramCount(bold)).toBe(5); // what we report
  });

  it("counts a single emoji as one", () => {
    expect(instagramCount("🎉")).toBe(1);
  });

  it("folds a ZWJ emoji sequence into one grapheme", () => {
    expect(instagramCount("👨‍👩‍👧")).toBe(1);
  });

  it("counts newlines as characters", () => {
    expect(instagramCount("a\nb")).toBe(3);
  });

  it("exposes the caption limit", () => {
    expect(IG_CAPTION_LIMIT).toBe(2200);
  });
});
