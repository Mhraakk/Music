"use client";

/**
 * SEARCH
 *
 * Two modes in one pill.
 *
 * TEXT searches what the ontology actually holds — artist, title, album, region
 * name, and the engine's own description of the emotional shape. There is no
 * genre index, so "fragile", "warm" and "wide room" are first-class queries in
 * a way that "deep house" deliberately is not.
 *
 * COLOUR is the signature interaction. Pick a swatch and the catalog is ranked
 * by how close each sleeve's dominant colour is to it, while the whole room
 * takes on that colour. It works because the dominant colour of every sleeve is
 * extracted at build time, so ranking 64 positions is instant and needs no
 * image decoding in the browser.
 *
 * Ranked, never filtered: a hard threshold on an unusual hue returns an empty
 * grid, which reads as a broken feature rather than an honest "nothing is quite
 * this colour, here is what is closest".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { COLOR_SWATCHES } from "@/lib/media";

export type SearchMode = { kind: "none" } | { kind: "text"; query: string } | { kind: "color"; hex: string };

export function SearchBar({
  mode,
  onChange,
  resultCount,
}: {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  resultCount: number | null;
}) {
  const [draft, setDraft] = useState(mode.kind === "text" ? mode.query : "");
  const [pickerOpen, setPickerOpen] = useState(mode.kind === "color");
  const debounce = useRef<number | null>(null);

  // Debounced so every keystroke does not re-rank and re-render the grid.
  const commitText = useCallback(
    (value: string) => {
      if (debounce.current !== null) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => {
        onChange(value.trim() ? { kind: "text", query: value } : { kind: "none" });
      }, 180);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (debounce.current !== null) window.clearTimeout(debounce.current);
    };
  }, []);

  const activeHex = mode.kind === "color" ? mode.hex : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="cx-pill flex-1">
          {activeHex ? (
            <span
              className="cx-swatch"
              style={{ width: 22, height: 22, backgroundColor: activeHex }}
              aria-hidden
            />
          ) : (
            <SearchIcon />
          )}

          {activeHex ? (
            <span className="flex-1 font-medium tracking-tight">{activeHex.toUpperCase()}</span>
          ) : (
            <input
              type="search"
              value={draft}
              placeholder="Search a feeling, an artist, a room"
              onChange={(e) => {
                setDraft(e.target.value);
                commitText(e.target.value);
              }}
              aria-label="Search the catalog"
            />
          )}

          {(activeHex || draft) && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                onChange({ kind: "none" });
              }}
              aria-label="Clear search"
              className="opacity-45 transition-opacity hover:opacity-100"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        <button
          type="button"
          className="cx-icon-button"
          aria-label="Search by colour"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
        >
          <ColorWheel />
        </button>
      </div>

      {pickerOpen && (
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.hex}
              type="button"
              className="cx-swatch"
              style={{ backgroundColor: swatch.hex }}
              aria-label={`Search by ${swatch.label}`}
              aria-pressed={activeHex?.toLowerCase() === swatch.hex.toLowerCase()}
              onClick={() =>
                onChange(
                  activeHex?.toLowerCase() === swatch.hex.toLowerCase()
                    ? { kind: "none" }
                    : { kind: "color", hex: swatch.hex }
                )
              }
            />
          ))}

          {/*
            The native colour input covers everything the ten swatches do not.
            Wrapped in a label because the input itself is visually hidden —
            styling the OS colour well consistently is not possible.
          */}
          <label className="cx-pill cx-pill-ghost h-9 cursor-pointer px-3">
            <span className="cx-meta">Any colour</span>
            <input
              type="color"
              className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              value={activeHex ?? "#688559"}
              onChange={(e) => onChange({ kind: "color", hex: e.target.value })}
              aria-label="Pick any colour"
            />
          </label>
        </div>
      )}

      {mode.kind !== "none" && resultCount !== null && (
        <p className="cx-meta">
          {mode.kind === "color"
            ? `${resultCount} sleeves ranked by closeness to this colour`
            : `${resultCount} ${resultCount === 1 ? "position" : "positions"} matching “${mode.query}”`}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────── icons ─────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 opacity-45">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Six dots in a ring — the affordance for "search by colour". */
function ColorWheel() {
  const dots = [
    { x: 12, y: 5, c: "#e0483c" },
    { x: 18, y: 8.5, c: "#e8a13a" },
    { x: 18, y: 15.5, c: "#4aa85c" },
    { x: 12, y: 19, c: "#3a86c8" },
    { x: 6, y: 15.5, c: "#7a5ac8" },
    { x: 6, y: 8.5, c: "#d4568f" },
  ];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      {dots.map((d) => (
        <circle key={d.c} cx={d.x} cy={d.y} r="2.7" fill={d.c} />
      ))}
    </svg>
  );
}
