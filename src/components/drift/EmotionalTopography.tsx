"use client";

/**
 * EMOTIONAL TOPOGRAPHY
 *
 * The replacement for a playlist library. The listener does not choose a list;
 * they choose a coordinate pair, and the engine computes the drift between them.
 *
 * The plot is an honest projection rather than a decoration: x is warmth, y is
 * emotional gravity, and both are read straight off each coordinate's substrate
 * vector. Two regions sitting close together on screen really are close in the
 * music. The full 7-axis position is what the engine reasons about; this is the
 * two axes a hand can point at.
 *
 * Drawn with flat 1px rules and 8px squares — no radial gradients, no glow, no
 * rounded nodes. A coordinate is a square because a square is what a flat
 * surface can honestly render.
 */

import { useState } from "react";
import { useDrift, useDriftActions } from "@/context/DriftContext";

export type TopographyNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  description: string;
  shape: string;
  avi: number;
  cinematicMagnitude: number;
};

/** 8px node on an 8px grid, offset by half its own size to centre it. */
const NODE = 8;

export function EmotionalTopography({ nodes }: { nodes: TopographyNode[] }) {
  const state = useDrift();
  const actions = useDriftActions();

  const [origin, setOrigin] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const active = state.arc[state.phaseIndex] ?? null;
  const focus = hovered ?? origin ?? active?.region ?? null;
  const focusNode = nodes.find((n) => n.id === focus) ?? null;

  const select = (id: string) => {
    if (!origin) {
      setOrigin(id);
      return;
    }
    if (origin === id) {
      setOrigin(null);
      return;
    }
    const from = origin;
    setOrigin(null);
    // A destination chosen mid-drift is a redirect, and the engine reads the
    // abandonment of the sounding phase as feedback.
    if (state.status === "sounding") void actions.redirect(id);
    else void actions.enterDrift(from, id);
  };

  return (
    <section className="sd-box">
      <div className="sd-rule-b flex flex-wrap items-baseline justify-between gap-4 p-8">
        <div>
          <p className="sd-label">Emotional topography</p>
          <p className="sd-body mt-2 max-w-xl">
            {origin
              ? `Departing ${nodes.find((n) => n.id === origin)?.label}. Choose where to arrive.`
              : "Choose where to depart from. There are no playlists here — only coordinates and the drift between them."}
          </p>
        </div>
        <p className="sd-numeral">
          X → WARMTH · Y → EMOTIONAL GRAVITY
        </p>
      </div>

      <div className="p-8">
        <div className="sd-map">
          {/* Grid: flat hairlines on eighths, so position is readable rather than decorative. */}
          {[0.25, 0.5, 0.75].map((t) => (
            <div
              key={`v${t}`}
              className="absolute inset-y-0 w-px"
              style={{ left: `${t * 100}%`, backgroundColor: "var(--rule)" }}
              aria-hidden
            />
          ))}
          {[0.25, 0.5, 0.75].map((t) => (
            <div
              key={`h${t}`}
              className="absolute inset-x-0 h-px"
              style={{ top: `${t * 100}%`, backgroundColor: "var(--rule)" }}
              aria-hidden
            />
          ))}

          {/*
            The trajectory actually travelled, plotted as straight segments
            between successive positions. This is the drift made visible: it will
            not match the projection wherever the listener's behaviour redirected
            it, and that mismatch is the point.
          */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {state.arc.slice(1).map((phase, i) => {
              const from = state.arc[i];
              return (
                <line
                  key={phase.index}
                  x1={`${from.target.warmth * 100}%`}
                  y1={`${from.target.depth * 100}%`}
                  x2={`${phase.target.warmth * 100}%`}
                  y2={`${phase.target.depth * 100}%`}
                  stroke={phase.diverged ? "var(--prune)" : "var(--rule-strong)"}
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          {/* Positions the session has actually occupied. */}
          {state.arc.map((phase) => (
            <span
              key={`t-${phase.index}`}
              className="absolute"
              style={{
                left: `calc(${phase.target.warmth * 100}% - 2px)`,
                top: `calc(${phase.target.depth * 100}% - 2px)`,
                width: 4,
                height: 4,
                backgroundColor: phase.index === state.phaseIndex ? "var(--ink)" : "var(--ink-3)",
              }}
              aria-hidden
            />
          ))}

          {/* The nine named coordinates. */}
          {nodes.map((node) => {
            const isOrigin = origin === node.id;
            const isActive = active?.region === node.id;
            const branch = state.branches[node.id as keyof typeof state.branches];
            const pruned = branch?.status === "pruned";
            const deepened = branch?.status === "deepened";

            const tint = pruned
              ? "var(--prune)"
              : deepened
                ? "var(--deepen)"
                : isOrigin || isActive
                  ? "var(--ink)"
                  : "var(--ink-3)";

            return (
              <button
                key={node.id}
                className="sd-press absolute"
                onClick={() => select(node.id)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
                aria-pressed={isOrigin}
                aria-label={`${node.label}. ${node.description}${pruned ? " Pruned this session." : ""}`}
                style={{
                  left: `calc(${node.x * 100}% - ${NODE / 2}px)`,
                  top: `calc(${node.y * 100}% - ${NODE / 2}px)`,
                  width: NODE,
                  height: NODE,
                  backgroundColor: tint,
                  padding: 0,
                }}
              />
            );
          })}

          {/* Labels sit outside the node so the node stays a clean 8px square. */}
          {nodes.map((node) => {
            const branch = state.branches[node.id as keyof typeof state.branches];
            const flipped = node.x > 0.72;
            return (
              <span
                key={`l-${node.id}`}
                className="sd-meta pointer-events-none absolute whitespace-nowrap"
                style={{
                  left: flipped ? undefined : `calc(${node.x * 100}% + 16px)`,
                  right: flipped ? `calc(${(1 - node.x) * 100}% + 16px)` : undefined,
                  top: `calc(${node.y * 100}% - 8px)`,
                  color:
                    branch?.status === "pruned"
                      ? "var(--prune)"
                      : active?.region === node.id
                        ? "var(--ink)"
                        : "var(--ink-3)",
                }}
              >
                {node.label}
                {branch?.status === "pruned" ? " · pruned" : ""}
                {branch?.status === "deepened" ? " · deepened" : ""}
              </span>
            );
          })}
        </div>
      </div>

      {/* Readout for whichever coordinate the hand is on. */}
      <div className="sd-rule-t p-8" style={{ minHeight: 152 }}>
        {focusNode ? (
          <>
            <p className="sd-title">{focusNode.label}</p>
            <p className="sd-body mt-2 max-w-2xl">{focusNode.description}</p>
            <p className="sd-numeral mt-4">
              {focusNode.shape.toUpperCase()}
            </p>
            <p className="sd-numeral mt-2">
              AVI {focusNode.avi.toFixed(2)} · CINEMATIC SPACE {focusNode.cinematicMagnitude.toFixed(2)}
            </p>
          </>
        ) : (
          <p className="sd-body">
            Hover a coordinate to read its emotional shape.
          </p>
        )}
      </div>

      {state.status === "sounding" && (
        <div className="sd-rule-t p-8">
          <p className="sd-label">Reset</p>
          <button className="sd-press sd-box mt-4 px-4 py-2 sd-meta" onClick={actions.reset}>
            End this drift
          </button>
        </div>
      )}
    </section>
  );
}
