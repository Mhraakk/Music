"use client";

/**
 * NOW PLAYING
 *
 * A docked sheet that expands. Collapsed it is artwork, title, artist and a
 * hairline of progress; expanded it adds the level control and what the engine
 * is currently reading from the listener's behaviour.
 *
 * There is no next or previous button, and that is not an omission. The engine
 * decides what follows from implicit feedback, so a skip control would be a
 * second, contradictory input path. What the sheet offers instead is the level
 * slider — which is a genuine input to the engine — and an honest readout of
 * how the last gesture was interpreted.
 */

import Image from "next/image";
import { useState } from "react";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";

const MODE_LABEL: Record<string, string> = {
  deepen: "Going deeper into this",
  prune: "Leaving this room",
  explore: "Looking sideways",
};

export function NowPlayingSheet() {
  const { current, playing, progress, volume, fragilityNow, reading, loading, error, fromEngine } = usePlayer();
  const { toggle, setVolume, seek, stop } = usePlayerActions();
  const [expanded, setExpanded] = useState(false);

  if (!current) return null;

  return (
    <section className="cx-sheet" aria-label="Now playing">
      <div className="cx-progress">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="relative h-12 w-12 shrink-0 overflow-hidden"
          style={{ borderRadius: 8, backgroundColor: current.tint }}
          aria-label={expanded ? "Collapse now playing" : "Expand now playing"}
        >
          {current.artworkUrl && (
            <Image src={current.artworkUrl} alt="" fill sizes="48px" style={{ objectFit: "cover" }} />
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
          aria-label="Expand now playing"
        >
          <p className="cx-truncate text-[14px] font-medium leading-tight">{current.title}</p>
          <p className="cx-truncate text-[12px] leading-tight text-[var(--ink-3)]">
            {current.artist}
            {fromEngine && " · chosen by the engine"}
          </p>
        </button>

        <button
          type="button"
          onClick={toggle}
          className="cx-icon-button"
          style={{ backgroundColor: "var(--ink)", color: "var(--ink-inverse)", boxShadow: "none" }}
          aria-label={playing ? "Pause" : "Play"}
          disabled={loading}
        >
          {loading ? <Spinner /> : playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--hairline)] px-4 pb-4 pt-3">
          {/*
            Fragility windows drawn onto the timeline. The engine weights a
            volume change on an exposed moment far more heavily, so the listener
            is shown where those moments are rather than being measured in
            secret.
          */}
          <div className="relative h-6">
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--hairline)]" />
            {windowsFor(current.vector).map((w, i) => (
              <div
                key={i}
                className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[var(--ink)]"
                style={{
                  left: `${w.start * 100}%`,
                  width: `${Math.max(1, (w.end - w.start) * 100)}%`,
                  opacity: 0.16 + w.intensity * 0.22,
                }}
                title={`Exposed moment · intensity ${w.intensity.toFixed(2)}`}
              />
            ))}
            <div
              className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-[var(--ink)]"
              style={{ left: `${progress * 100}%` }}
              aria-hidden
            />
          </div>

          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(e) => seek(Number(e.target.value) / 1000)}
            aria-label="Position"
          />

          <div className="mt-2 flex items-center gap-3">
            <span className="cx-label shrink-0">Level</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="Level. Changes during exposed moments are read as emotional feedback."
            />
            <span className="cx-mono shrink-0">{Math.round(volume * 100)}</span>
          </div>

          <p className="cx-meta mt-1">
            {fragilityNow > 0.2
              ? `Exposed moment — a level change now reads as a statement about the voice (${fragilityNow.toFixed(2)}).`
              : "Structurally anonymous — a level change here is mostly discounted as room noise."}
          </p>

          {reading && (
            <div className="mt-3 border-t border-[var(--hairline)] pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="cx-label">{MODE_LABEL[reading.mode] ?? reading.mode}</p>
                <p className="cx-mono">
                  {reading.valence >= 0 ? "+" : ""}
                  {reading.valence.toFixed(2)} · {Math.round(reading.confidence * 100)}% sure
                </p>
              </div>
              <p className="cx-meta mt-1">{reading.rationale}</p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="cx-meta">
              {current.album ? `${current.album} · ` : ""}
              {current.shape}
            </p>
            <div className="flex items-center gap-2">
              {current.appleUrl && (
                <a
                  href={current.appleUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost h-8 px-3"
                >
                  <span className="cx-meta">Full track</span>
                </a>
              )}
              <button type="button" onClick={stop} className="cx-pill cx-pill-ghost h-8 px-3">
                <span className="cx-meta">Stop</span>
              </button>
            </div>
          </div>

          {error && (
            <p className="cx-meta mt-2" style={{ color: "#b4524a" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Mirrors the server's window derivation; see `lib/drift/catalog.ts`. */
function windowsFor(vector: { fragility: number; narrative: number }) {
  const { fragility, narrative } = vector;
  if (fragility < 0.34) return [];
  const count = narrative > 0.66 ? 3 : narrative > 0.44 ? 2 : 1;
  const width = Math.min(1, 0.1 + fragility * 0.12);
  return Array.from({ length: count }, (_, i) => {
    const centre = 0.18 + ((i + 1) / (count + 1)) * 0.64;
    return {
      start: Math.max(0, centre - width / 2),
      end: Math.min(1, centre + width / 2),
      intensity: Math.min(1, fragility * (0.78 + (i / Math.max(1, count - 1 || 1)) * 0.22)),
    };
  });
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="5" width="3.5" height="14" rx="0.5" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="0.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
