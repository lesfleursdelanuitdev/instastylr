import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCENT_CHAR_PALETTE,
  DIVIDER_PRESETS,
  DIVIDER_WRAPPER_OPTIONS,
  LINE_CHAR_PALETTE,
} from "../divider/presets";
import { inferDividerConfig } from "../divider/parse";
import {
  configFromPreset,
  DEFAULT_BOOKEND_RECIPE,
  DEFAULT_FRAMED_RECIPE,
  DEFAULT_PATTERN_RECIPE,
  DEFAULT_REPEAT_RECIPE,
  normalizeDividerLine,
  renderDividerConfig,
} from "../divider/render";
import {
  DIVIDER_CATEGORY_LABELS,
  type BuilderTab,
  type DividerCategory,
  type DividerConfig,
  type DividerRecipe,
  type DividerWrapper,
  type GapMode,
  MAX_DIVIDER_LEN,
} from "../divider/types";
import { firstGrapheme } from "../grapheme";

type Props = {
  line: string;
  recipe?: DividerRecipe;
  wrapper?: DividerWrapper | null;
  onApply: (config: DividerConfig) => void;
};

const TABS: { id: BuilderTab; label: string }[] = [
  { id: "line", label: "Line" },
  { id: "framed", label: "Framed" },
  { id: "bookend", label: "Bookend" },
  { id: "pattern", label: "Pattern" },
  { id: "custom", label: "Custom" },
];

const CATEGORY_FILTERS: (DividerCategory | "all")[] = [
  "all",
  "simple",
  "spaced",
  "grouped",
  "unicode",
  "accent",
  "triple",
  "bookend",
  "motif",
  "frames",
  "borders",
  "patterns",
  "aesthetic",
];

function wrapperFromId(id: string): DividerWrapper | null {
  const opt = DIVIDER_WRAPPER_OPTIONS.find((w) => w.id === id);
  if (!opt || id === "none") return null;
  return { left: opt.left, right: opt.right };
}

function wrapperId(wrapper: DividerWrapper | null | undefined): string {
  if (!wrapper) return "none";
  const match = DIVIDER_WRAPPER_OPTIONS.find((w) => w.left === wrapper.left && w.right === wrapper.right);
  return match?.id ?? "none";
}

function syncBuilderFromConfig(config: DividerConfig) {
  const { line: configLine, recipe: configRecipe } = config;
  if (!configRecipe) return { tab: "custom" as BuilderTab, customText: configLine };

  switch (configRecipe.kind) {
    case "repeat":
      return { tab: "line" as BuilderTab, repeatRecipe: configRecipe };
    case "framed":
      return { tab: "framed" as BuilderTab, framedRecipe: configRecipe };
    case "bookend":
      return {
        tab: "bookend" as BuilderTab,
        bookendRecipe: configRecipe,
        matchRightCap: configRecipe.leftCap === configRecipe.rightCap,
      };
    case "pattern":
      return { tab: "pattern" as BuilderTab, patternRecipe: configRecipe };
    case "motif":
    case "raw":
      return { tab: "custom" as BuilderTab, customText: configRecipe.text };
  }
}

function SequenceEditor({
  chars,
  gap,
  onChange,
}: {
  chars: string[];
  gap: GapMode;
  onChange: (chars: string[], gap: GapMode) => void;
}) {
  const slots = chars.length > 0 ? chars : ["✦"];

  const updateSlot = (index: number, value: string) => {
    const g = firstGrapheme(value);
    if (!g) return;
    const next = [...slots];
    next[index] = g;
    onChange(next, gap);
  };

  const addSlot = () => {
    if (slots.length >= 5) return;
    onChange([...slots, "✦"], gap);
  };

  const removeSlot = (index: number) => {
    if (slots.length <= 1) return;
    onChange(
      slots.filter((_, i) => i !== index),
      gap,
    );
  };

  return (
    <div className="divider-sequence">
      <div className="divider-sequence-label">Sequence ({slots.length}/5)</div>
      <div className="divider-sequence-slots">
        {slots.map((char, index) => (
          <div key={index} className="divider-sequence-slot">
            <input
              type="text"
              value={char}
              aria-label={`Sequence character ${index + 1}`}
              onChange={(e) => updateSlot(index, e.target.value)}
            />
            <button
              type="button"
              className="divider-sequence-remove"
              aria-label={`Remove character ${index + 1}`}
              disabled={slots.length <= 1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => removeSlot(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <CharPalette
        chars={ACCENT_CHAR_PALETTE}
        value={slots[slots.length - 1] ?? "✦"}
        onPick={(c) => updateSlot(slots.length - 1, c)}
      />
      <button
        type="button"
        className="divider-sequence-add"
        disabled={slots.length >= 5}
        onMouseDown={(e) => e.preventDefault()}
        onClick={addSlot}
      >
        Add symbol
      </button>
      <label className="divider-check">
        <input
          type="checkbox"
          checked={gap === "space"}
          onChange={(e) => onChange(slots, e.target.checked ? "space" : "none")}
        />
        Space between symbols
      </label>
    </div>
  );
}

function CharPalette({
  chars,
  value,
  onPick,
}: {
  chars: string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="divider-palette">
      {chars.map((c) => (
        <button
          key={c}
          type="button"
          className={`divider-palette-btn${value === c ? " active" : ""}`}
          title={`Use “${c}”`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export function DividerPicker({ line, recipe, wrapper, onApply }: Props) {
  const [tab, setTab] = useState<BuilderTab>("line");
  const [category, setCategory] = useState<DividerCategory | "all">("all");

  const [repeatRecipe, setRepeatRecipe] = useState(DEFAULT_REPEAT_RECIPE);
  const [framedRecipe, setFramedRecipe] = useState(DEFAULT_FRAMED_RECIPE);
  const [bookendRecipe, setBookendRecipe] = useState(DEFAULT_BOOKEND_RECIPE);
  const [patternRecipe, setPatternRecipe] = useState(DEFAULT_PATTERN_RECIPE);
  const [customText, setCustomText] = useState(line);
  const [wrapperChoice, setWrapperChoice] = useState(wrapperId(wrapper));
  const [matchRightCap, setMatchRightCap] = useState(bookendRecipe.leftCap === bookendRecipe.rightCap);

  useEffect(() => {
    const resolved = recipe ? { line, recipe, wrapper: wrapper ?? null } : inferDividerConfig(line);
    const synced = syncBuilderFromConfig(resolved);
    setTab(synced.tab);
    if ("repeatRecipe" in synced && synced.repeatRecipe) setRepeatRecipe(synced.repeatRecipe);
    if ("framedRecipe" in synced && synced.framedRecipe) setFramedRecipe(synced.framedRecipe);
    if ("bookendRecipe" in synced && synced.bookendRecipe) {
      setBookendRecipe(synced.bookendRecipe);
      setMatchRightCap(synced.matchRightCap ?? true);
    }
    if ("patternRecipe" in synced && synced.patternRecipe) setPatternRecipe(synced.patternRecipe);
    if ("customText" in synced && synced.customText !== undefined) setCustomText(synced.customText);
    else setCustomText(resolved.line);
    setWrapperChoice(wrapperId(resolved.wrapper));
  }, [line, recipe, wrapper]);

  const activeWrapper = useMemo(() => wrapperFromId(wrapperChoice), [wrapperChoice]);

  const builderPreview = useMemo(() => {
    if (tab === "custom") return normalizeDividerLine(customText);
    const activeRecipe =
      tab === "line"
        ? repeatRecipe
        : tab === "framed"
          ? framedRecipe
          : tab === "bookend"
            ? bookendRecipe
            : patternRecipe;
    return renderDividerConfig({ recipe: activeRecipe, wrapper: activeWrapper });
  }, [tab, repeatRecipe, framedRecipe, bookendRecipe, patternRecipe, customText, activeWrapper]);

  const filteredPresets = useMemo(
    () => (category === "all" ? DIVIDER_PRESETS : DIVIDER_PRESETS.filter((p) => p.category === category)),
    [category],
  );

  const applyBuilder = useCallback(() => {
    if (tab === "custom") {
      const text = normalizeDividerLine(customText);
      if (!text) return;
      onApply({ line: text, recipe: { kind: "raw", text }, wrapper: null });
      return;
    }
    const activeRecipe =
      tab === "line"
        ? repeatRecipe
        : tab === "framed"
          ? framedRecipe
          : tab === "bookend"
            ? bookendRecipe
            : patternRecipe;
    const rendered = renderDividerConfig({ recipe: activeRecipe, wrapper: activeWrapper });
    if (!rendered) return;
    onApply({ line: rendered, recipe: activeRecipe, wrapper: activeWrapper });
  }, [tab, customText, repeatRecipe, framedRecipe, bookendRecipe, patternRecipe, activeWrapper, onApply]);

  const applyPreset = useCallback(
    (preset: (typeof DIVIDER_PRESETS)[number]) => {
      const config = configFromPreset(preset);
      onApply(config);
    },
    [onApply],
  );

  const setFramedCenterChar = (char: string) => {
    setFramedRecipe((r) => {
      if (r.center.mode === "single") return { ...r, center: { mode: "single", char } };
      if (r.center.mode === "repeat") return { ...r, center: { ...r.center, char } };
      return r;
    });
  };

  return (
    <div className="i-divider-picker">
      <div className="i-divider-title">Divider</div>

      <div className="divider-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`divider-tab${tab === t.id ? " active" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="divider-builder">
        {tab === "line" && (
          <>
            <label className="divider-field">
              <span>Character</span>
              <input
                type="text"
                value={repeatRecipe.char}
                onChange={(e) => {
                  const g = firstGrapheme(e.target.value);
                  if (g) setRepeatRecipe((r) => ({ ...r, char: g }));
                }}
              />
            </label>
            <CharPalette
              chars={LINE_CHAR_PALETTE}
              value={repeatRecipe.char}
              onPick={(c) => setRepeatRecipe((r) => ({ ...r, char: c }))}
            />
            <label className="divider-field">
              <span>Length</span>
              <input
                type="range"
                min={4}
                max={40}
                value={repeatRecipe.count}
                onChange={(e) => setRepeatRecipe((r) => ({ ...r, count: Number(e.target.value) }))}
              />
              <span className="divider-field-value">{repeatRecipe.count}</span>
            </label>
            <label className="divider-field">
              <span>Mode</span>
              <select
                value={repeatRecipe.mode}
                onChange={(e) =>
                  setRepeatRecipe((r) => ({
                    ...r,
                    mode: e.target.value as "solid" | "spaced" | "grouped",
                  }))
                }
              >
                <option value="solid">Solid</option>
                <option value="spaced">Spaced</option>
                <option value="grouped">Grouped</option>
              </select>
            </label>
            {repeatRecipe.mode === "grouped" && (
              <label className="divider-field">
                <span>Group size</span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={repeatRecipe.groupSize ?? 2}
                  onChange={(e) =>
                    setRepeatRecipe((r) => ({ ...r, groupSize: Math.max(1, Math.min(4, Number(e.target.value))) }))
                  }
                />
              </label>
            )}
          </>
        )}

        {tab === "framed" && (
          <>
            <label className="divider-field">
              <span>Flank char</span>
              <input
                type="text"
                value={framedRecipe.flankChar}
                onChange={(e) => {
                  const g = firstGrapheme(e.target.value);
                  if (g) setFramedRecipe((r) => ({ ...r, flankChar: g }));
                }}
              />
            </label>
            <label className="divider-field">
              <span>Flank length</span>
              <input
                type="range"
                min={0}
                max={12}
                value={framedRecipe.flankLen}
                onChange={(e) => setFramedRecipe((r) => ({ ...r, flankLen: Number(e.target.value) }))}
              />
              <span className="divider-field-value">{framedRecipe.flankLen}</span>
            </label>
            <label className="divider-field">
              <span>Center</span>
              <select
                value={framedRecipe.center.mode}
                onChange={(e) => {
                  const mode = e.target.value as "single" | "repeat" | "sequence" | "motif";
                  if (mode === "single") setFramedRecipe((r) => ({ ...r, center: { mode, char: "✦" } }));
                  if (mode === "repeat")
                    setFramedRecipe((r) => ({ ...r, center: { mode, char: "✦", count: 3, gap: "space" } }));
                  if (mode === "sequence")
                    setFramedRecipe((r) => ({ ...r, center: { mode, chars: ["✦", "❀", "✦"], gap: "space" } }));
                  if (mode === "motif") setFramedRecipe((r) => ({ ...r, center: { mode, text: "⋆⋅☆⋅⋆" } }));
                }}
              >
                <option value="single">Single</option>
                <option value="repeat">Repeat</option>
                <option value="sequence">Sequence</option>
                <option value="motif">Motif</option>
              </select>
            </label>
            {framedRecipe.center.mode === "single" && (
              <>
                <CharPalette
                  chars={ACCENT_CHAR_PALETTE}
                  value={framedRecipe.center.char}
                  onPick={setFramedCenterChar}
                />
              </>
            )}
            {framedRecipe.center.mode === "repeat" && (
              <>
                <CharPalette
                  chars={ACCENT_CHAR_PALETTE}
                  value={framedRecipe.center.char}
                  onPick={setFramedCenterChar}
                />
                <label className="divider-field">
                  <span>Count</span>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    value={framedRecipe.center.count}
                    onChange={(e) =>
                      setFramedRecipe((r) =>
                        r.center.mode === "repeat"
                          ? { ...r, center: { ...r.center, count: Number(e.target.value) } }
                          : r,
                      )
                    }
                  />
                </label>
              </>
            )}
            {framedRecipe.center.mode === "sequence" && (
              <SequenceEditor
                chars={framedRecipe.center.chars}
                gap={framedRecipe.center.gap}
                onChange={(chars, gap) =>
                  setFramedRecipe((r) =>
                    r.center.mode === "sequence" ? { ...r, center: { mode: "sequence", chars, gap } } : r,
                  )
                }
              />
            )}
            {framedRecipe.center.mode === "motif" && (
              <label className="divider-field">
                <span>Motif</span>
                <input
                  type="text"
                  value={framedRecipe.center.text}
                  onChange={(e) =>
                    setFramedRecipe((r) =>
                      r.center.mode === "motif" ? { ...r, center: { ...r.center, text: e.target.value } } : r,
                    )
                  }
                />
              </label>
            )}
            <label className="divider-check">
              <input
                type="checkbox"
                checked={framedRecipe.gap === "space"}
                onChange={(e) =>
                  setFramedRecipe((r) => ({ ...r, gap: (e.target.checked ? "space" : "none") as GapMode }))
                }
              />
              Gap around center
            </label>
          </>
        )}

        {tab === "bookend" && (
          <>
            <CharPalette
              chars={ACCENT_CHAR_PALETTE}
              value={bookendRecipe.leftCap}
              onPick={(c) =>
                setBookendRecipe((r) => ({
                  ...r,
                  leftCap: c,
                  rightCap: matchRightCap ? c : r.rightCap,
                }))
              }
            />
            <label className="divider-check">
              <input
                type="checkbox"
                checked={matchRightCap}
                onChange={(e) => {
                  setMatchRightCap(e.target.checked);
                  if (e.target.checked) setBookendRecipe((r) => ({ ...r, rightCap: r.leftCap }));
                }}
              />
              Match right cap
            </label>
            {!matchRightCap && (
              <label className="divider-field">
                <span>Right cap</span>
                <input
                  type="text"
                  value={bookendRecipe.rightCap}
                  onChange={(e) => {
                    const g = firstGrapheme(e.target.value);
                    if (g) setBookendRecipe((r) => ({ ...r, rightCap: g }));
                  }}
                />
              </label>
            )}
            <label className="divider-field">
              <span>Span length</span>
              <input
                type="range"
                min={4}
                max={30}
                value={bookendRecipe.spanLen}
                onChange={(e) => setBookendRecipe((r) => ({ ...r, spanLen: Number(e.target.value) }))}
              />
              <span className="divider-field-value">{bookendRecipe.spanLen}</span>
            </label>
          </>
        )}

        {tab === "pattern" && (
          <>
            <label className="divider-field">
              <span>Token A</span>
              <input
                type="text"
                value={patternRecipe.tokens[0] ?? ""}
                onChange={(e) =>
                  setPatternRecipe((r) => ({
                    ...r,
                    tokens: [e.target.value, r.tokens[1] ?? ""],
                  }))
                }
              />
            </label>
            <label className="divider-field">
              <span>Token B</span>
              <input
                type="text"
                value={patternRecipe.tokens[1] ?? ""}
                onChange={(e) =>
                  setPatternRecipe((r) => ({
                    ...r,
                    tokens: [r.tokens[0] ?? "", e.target.value],
                  }))
                }
              />
            </label>
            <label className="divider-field">
              <span>Joiner</span>
              <input
                type="text"
                value={patternRecipe.joiner}
                onChange={(e) => setPatternRecipe((r) => ({ ...r, joiner: e.target.value }))}
              />
            </label>
            <label className="divider-field">
              <span>Cycles</span>
              <input
                type="range"
                min={3}
                max={20}
                value={patternRecipe.cycles}
                onChange={(e) => setPatternRecipe((r) => ({ ...r, cycles: Number(e.target.value) }))}
              />
              <span className="divider-field-value">{patternRecipe.cycles}</span>
            </label>
          </>
        )}

        {tab === "custom" && (
          <label className="divider-field">
            <span>Full line</span>
            <input
              type="text"
              value={customText}
              placeholder="Paste or type divider…"
              aria-label="Custom divider line"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              onChange={(e) => setCustomText(e.target.value.slice(0, MAX_DIVIDER_LEN))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyBuilder();
                }
              }}
            />
          </label>
        )}

        {tab !== "custom" && (
          <label className="divider-field">
            <span>Wrapper</span>
            <select value={wrapperChoice} onChange={(e) => setWrapperChoice(e.target.value)}>
              {DIVIDER_WRAPPER_OPTIONS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="divider-preview">
          <span className="divider-preview-label">Preview</span>
          <span className="divider-preview-line">{builderPreview || "…"}</span>
        </div>
        <button
          type="button"
          className="divider-apply"
          disabled={!builderPreview}
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyBuilder}
        >
          Apply
        </button>
      </div>

      <div className="divider-categories">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            type="button"
            className={`divider-category${category === c ? " active" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCategory(c)}
          >
            {DIVIDER_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="i-divider-grid divider-preset-grid">
        {filteredPresets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`i-divider-swatch${p.line === line ? " active" : ""}`}
            title={p.line}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyPreset(p)}
          >
            {p.line}
          </button>
        ))}
      </div>
    </div>
  );
}
