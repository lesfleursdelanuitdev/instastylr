/**
 * The landing page's mock of the app is driven by plain data: a State says
 * what the editor holds, what the toolbar shows, which popover is open, where
 * the pointer is, and so on. Demos are sequences of States; mock.ts draws one
 * and animates the change from the last. Output text comes from the real font
 * engine, so what visitors see is what the app would produce.
 */
import { transformRun } from "../fonts/transform";
import { instagramCount } from "../count";
import { platformById, type PlatformId } from "../platforms";

export type Seg = { text: string; bold?: boolean; italic?: boolean; font?: string; selected?: boolean };
export type Line = { segs: Seg[]; bullet?: string } | { divider: string; selected?: boolean };

export type Popover =
  | { kind: "fonts"; items: { id: string; label: string }[]; active: number }
  | { kind: "bullets"; items: string[]; active: number }
  | { kind: "dividers"; items: string[]; active: number }
  | { kind: "save"; name: string };

/**
 * Where the demo's pointer rests: a toolbar control, a popover item ("pop:2"),
 * a piece of text ("seg:<line>:<segment>"), a list bullet ("bullet:<line>"),
 * or the divider. Omitted = pointer hidden.
 */
export type CursorTarget = string;

export type State = {
  lines: Line[];
  /** Blinking caret at the end of the last text line. */
  caret?: boolean;
  bold?: boolean;
  italic?: boolean;
  /** Font id the toolbar button shows. */
  font: string;
  popover?: Popover | null;
  cursor?: CursorTarget;
  /** The pointer is clicking right now (the hero film sets this on the frame where the effect lands). */
  press?: boolean;
  /** The app's theme in the picture. Dark unless set to "light". */
  theme?: "light" | "dark";
  platform?: PlatformId;
  toast?: string;
  copied?: boolean;
};

export function lineText(line: Line): string {
  return "divider" in line ? line.divider : line.segs.map((s) => s.text).join("");
}

/**
 * What the app's output panel would show, one entry per line. Like the app
 * (editor/serialize.ts), a divider gets a blank line above and below it; blank
 * lines never double up and never start or end the text.
 */
export function outputLines(lines: Line[]): string[] {
  const out: string[] = [];
  const blank = () => out.length && out[out.length - 1] !== "" && out.push("");
  for (const line of lines) {
    if ("divider" in line) {
      blank();
      out.push(line.divider);
      out.push("");
      continue;
    }
    out.push(renderLine(line));
  }
  while (out[out.length - 1] === "") out.pop();
  return out;
}

function renderLine(line: Extract<Line, { segs: Seg[] }>): string {
  const text = line.segs
    .map((s) => transformRun({ text: s.text, fontId: s.font ?? "serif", bold: Boolean(s.bold), italic: Boolean(s.italic) }))
    .join("");
  return line.bullet ? `${line.bullet} ${text}` : text;
}

export function outputOf(lines: Line[]): string {
  return outputLines(lines).join("\n");
}

export function statsOf(state: State): { words: number; chars: number; left: string } {
  const out = outputOf(state.lines);
  const plain = state.lines.map(lineText).join("\n").trim();
  const words = plain ? plain.split(/\s+/).length : 0;
  const chars = out ? instagramCount(out) : 0;
  const platform = platformById(state.platform ?? "instagram");
  return { words, chars, left: `${(platform.limit - chars).toLocaleString()} left for ${platform.short}` };
}
