"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COLOR_SWATCHES } from "@/lib/media";
import { songsLabel } from "@/lib/format";
import { CloseGlyph, SearchGlyph } from "./icons";

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
    <div className="flex min-w-0 flex-col items-stretch gap-2">
      <div className="flex items-center gap-2">
        <div className="cx-search" id="search">
          {activeHex ? (
            <span className="cx-swatch" style={{ width: 18, height: 18, backgroundColor: activeHex }} aria-hidden />
          ) : (
            <SearchGlyph />
          )}

          {activeHex ? (
            <span className="flex-1 text-[13px] font-medium">{activeHex.toUpperCase()}</span>
          ) : (
            <input
              type="search"
              value={draft}
              placeholder="Search"
              onChange={(e) => {
                setDraft(e.target.value);
                commitText(e.target.value);
              }}
              aria-label="Search songs, artists, albums"
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
            >
              <CloseGlyph />
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
          <label className="cx-pill cx-pill-ghost cx-pill-compact cursor-pointer">
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
            ? `${songsLabel(resultCount)} ranked by this colour`
            : `${songsLabel(resultCount)} matching “${mode.query}”`}
        </p>
      )}
    </div>
  );
}

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
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      {dots.map((d) => (
        <circle key={d.c} cx={d.x} cy={d.y} r="2.7" fill={d.c} />
      ))}
    </svg>
  );
}
