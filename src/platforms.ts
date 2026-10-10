/**
 * Target platforms for the word/character counter. The grapheme-counting itself
 * (see count.ts) is platform-independent — what changes per platform is only the
 * caption/description character *limit* the footer counts down against, plus the
 * labels shown in Settings (full name) and the footer (short tag).
 *
 * Limits are each platform's published caption/description ceiling. They drift
 * over time and aren't all officially fixed; this list is the single place to
 * edit them. Instagram reuses IG_CAPTION_LIMIT so there's one source of truth for
 * the default and the existing count.ts tests.
 */
import { IG_CAPTION_LIMIT } from "./count";

export type PlatformId =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "x"
  | "threads"
  | "facebook"
  | "linkedin";

export type Platform = {
  id: PlatformId;
  label: string; // full name (Settings)
  short: string; // compact tag (footer stat)
  limit: number; // caption/description character ceiling
};

export const PLATFORMS: Platform[] = [
  { id: "instagram", label: "Instagram", short: "IG", limit: IG_CAPTION_LIMIT },
  { id: "youtube", label: "YouTube", short: "YT", limit: 5000 },
  { id: "tiktok", label: "TikTok", short: "TikTok", limit: 2200 },
  { id: "x", label: "X (Twitter)", short: "X", limit: 280 },
  { id: "threads", label: "Threads", short: "Threads", limit: 500 },
  { id: "facebook", label: "Facebook", short: "FB", limit: 63206 },
  { id: "linkedin", label: "LinkedIn", short: "LinkedIn", limit: 3000 },
];

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id);
export const DEFAULT_PLATFORM: PlatformId = "instagram";

export function platformById(id: string): Platform {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
}

/**
 * Remaining-character threshold below which the counter turns amber. Relative to
 * the limit (10%, min 20) so it stays meaningful for both Instagram's 2,200 and
 * X's 280.
 */
export function warnThreshold(limit: number): number {
  return Math.max(20, Math.round(limit * 0.1));
}
