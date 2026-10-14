/**
 * The before/after on the landing page, in four places: an Instagram post (the
 * default), an Instagram bio, a YouTube video and a LinkedIn post. Each scene
 * fills a card twice: once as a platform would show a plain paste (the words,
 * nothing else), once as InstaStylr hands it over (real engine output).
 * The cards are plain look-alikes: no logos, no platform names in them.
 */
import { lineText, outputLines, type Line, type Seg } from "./state";
import pinkDahlias from "./photos/dahlias-pink.jpg";
import dahlia from "./photos/dahlia.jpg";
import lily from "./photos/turks-cap-lily.jpg";

export type SceneId = "post" | "bio" | "video" | "linkedin";
export const SCENE_ORDER: SceneId[] = ["post", "bio", "video", "linkedin"];
export const SCENE_LABELS: Record<SceneId, string> = {
  post: "Instagram post",
  bio: "Instagram bio",
  video: "YouTube video",
  linkedin: "LinkedIn post",
};

const t = (text: string, extra: Partial<Seg> = {}): Seg => ({ text, ...extra });
const HANDLE = "lesfleursdelanuit";

/** What a platform keeps of a formatted paste: the words; no bullets, no rules, no styling. */
export function plainLines(lines: Line[]): string[] {
  return lines.filter((l): l is Extract<Line, { segs: Seg[] }> => "segs" in l).map((l) => lineText(l));
}
const text = (lines: Line[], styled: boolean) => (styled ? outputLines(lines) : plainLines(lines)).join("\n");

/** A horizontal rule used above and below a block (the EXIF details, the gear list). */
const RULE = "──────  ✦  ──────";

export const SCENE_TEXT: Record<string, Line[]> = {
  // A photographer's post: a quote (serif italic), its author (plain), then the camera
  // details between two matching rules, one bulleted line each, labels in bold.
  caption: [
    { segs: [t("“Nobody sees a flower really; it is so small. We haven’t time, and to see takes time.”", { italic: true })] },
    { segs: [t("— Georgia O’Keeffe")] },
    { divider: RULE },
    { segs: [t("Camera", { bold: true }), t("  Sony α7 IV")], bullet: "•" },
    { segs: [t("Lens", { bold: true }), t("  90mm f/2.8 Macro")], bullet: "•" },
    { segs: [t("Focal length", { bold: true }), t("  90mm")], bullet: "•" },
    { segs: [t("Aperture", { bold: true }), t("  f/2.8")], bullet: "•" },
    { segs: [t("Shutter", { bold: true }), t("  1/200s")], bullet: "•" },
    { segs: [t("ISO", { bold: true }), t("  400")], bullet: "•" },
    { divider: RULE },
  ],
  // A bio: name in bold, a line in serif italic, two short points, a pointer to the link.
  bio: [
    { segs: [t("Les Fleurs de la Nuit", { bold: true })] },
    { segs: [t("Flowers, photographed after dark", { italic: true })] },
    { segs: [t("Fine-art prints")], bullet: "✦" },
    { segs: [t("Tutorials every Friday")], bullet: "✦" },
    { segs: [t("↓ The night garden shop")] },
  ],
  title: [{ segs: [t("Photographing lilies at dusk", { bold: true })] }],
  // YouTube turns timestamps at the start of a line into chapters, so those lines stay bare.
  description: [
    { segs: [t("Chapters", { bold: true })] },
    { segs: [t("0:00  Finding the light")] },
    { segs: [t("2:10  Camera settings")] },
    { segs: [t("5:45  Editing the colour")] },
    { divider: RULE },
    { segs: [t("Gear", { bold: true })] },
    { segs: [t("Sony α7 IV")], bullet: "•" },
    { segs: [t("90mm f/2.8 Macro")], bullet: "•" },
    { segs: [t("A tripod, and patience")], bullet: "•" },
    { divider: RULE },
  ],
  // LinkedIn's own type is sans-serif, so the styling here is the sans family throughout.
  headline: [{ segs: [t("Flower photographer", { font: "sans", bold: true }), t("  ·  Educator", { font: "sans" })] }],
  linkedin: [
    { segs: [t("Three things low light taught me", { font: "sans", bold: true })] },
    { segs: [t("Slow down. The light won’t wait, but the flower will.")], bullet: "1." },
    { segs: [t("Underexpose, then lift the colour.")], bullet: "2." },
    { segs: [t("A dark background is a frame.")], bullet: "3." },
    { segs: [t("")] },
    { segs: [t("Workshops open next month.", { font: "sans", italic: true })] },
  ],
};

const el = (tag: string, cls: string, content?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (content !== undefined) e.textContent = content;
  return e;
};
const photo = (src: string, cls: string, w: number, h: number, alt: string) => {
  const i = document.createElement("img");
  Object.assign(i, { src, className: cls, width: w, height: h, alt, decoding: "async" });
  return i;
};

/**
 * Replace a card's contents with `scene`. Only the styled card describes its
 * photo; the plain one shows the same picture, so it stays silent (alt="").
 */
export function fillCard(card: HTMLElement, scene: SceneId, styled: boolean): void {
  const alt = (a: string) => (styled ? a : "");
  card.className = `post-card scene-${scene}`;
  const parts: Node[] = [];
  if (scene === "post") {
    const top = el("div", "post-top");
    top.append(el("span", "post-avatar"), el("b", "", HANDLE));
    parts.push(top, photo(pinkDahlias, "post-photo", 512, 640, alt("Two layered pink dahlias lit from behind by warm golden light")), el("p", "post-caption scene-text", text(SCENE_TEXT.caption, styled)));
  } else if (scene === "bio") {
    const top = el("div", "bio-top");
    const who = el("div", "");
    who.append(el("b", "", HANDLE), el("span", "fake-btn", "Follow"));
    top.append(photo(dahlia, "bio-avatar", 512, 640, alt("A single magenta dahlia with a golden centre")), who);
    parts.push(top, el("p", "scene-text", text(SCENE_TEXT.bio, styled)));
  } else if (scene === "video") {
    const thumb = el("div", "video-thumb");
    thumb.append(photo(lily, "", 512, 640, alt("Spotted orange Turk's cap lilies against a deep night-blue background")), el("span", "video-play"));
    const body = el("div", "video-body");
    body.append(el("b", "scene-text video-title", text(SCENE_TEXT.title, styled)), el("p", "scene-text video-desc", text(SCENE_TEXT.description, styled)));
    parts.push(thumb, body);
  } else {
    const top = el("div", "li-top");
    const who = el("div", "");
    who.append(el("b", "", "Your Name"), el("span", "scene-text li-headline", text(SCENE_TEXT.headline, styled)));
    top.append(el("span", "post-avatar li-avatar"), who);
    parts.push(top, el("p", "scene-text li-body", text(SCENE_TEXT.linkedin, styled)));
  }
  card.replaceChildren(...parts);
}
