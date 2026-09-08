"use client";

/**
 * DRIFT ARC RAIL
 *
 * Two columns: the path the engine projected when the drift was entered, and the
 * path the listener's behaviour actually produced. Divergence is the product, so
 * it is shown rather than hidden — when a phase is marked diverged, the engine
 * rewrote its own plan because of something the listener did, and that is the
 * single most important thing this application can tell you about itself.
 *
 * Deliberately not a queue. Only the projection is visible ahead of time, and
 * the projection is explicitly labelled as a forecast the engine expects to
 * break, so there is nothing here to pre-judge or reorder.
 */

import { useDrift } from "@/context/DriftContext";

export function DriftArcRail() {
  const state = useDrift();

  if (state.status === "idle") return null;

  return (
    <section className="sd-box">
      <div className="sd-rule-b p-8">
        <p className="sd-label">The drift</p>
        {state.projectionNarrative && (
          <p className="sd-body mt-4 max-w-2xl">{state.projectionNarrative}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* ── Projected ── */}
        <div className="sd-rule-b md:sd-rule-r md:sd-rule-b p-8">
          <p className="sd-label">Projected arc</p>
          <p className="sd-meta mt-2">Computed on departure. Expected to break.</p>

          <ol className="mt-6 flex flex-col gap-4">
            {state.projection.map((phase) => {
              const actual = state.arc[phase.index];
              const held = actual && actual.trackId === phase.trackId;
              return (
                <li key={phase.index} className="flex items-baseline gap-4">
                  <span className="sd-numeral w-8 shrink-0">
                    {String(phase.index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="sd-meta block" style={{ color: "var(--ink-2)" }}>
                      {phase.region.replace(/_/g, " ")}
                    </span>
                    <span className="sd-meta block" style={{ color: "var(--ink-3)" }}>
                      {phase.artist} — {phase.title}
                    </span>
                  </span>
                  <span
                    className="sd-numeral shrink-0"
                    style={{
                      color: actual
                        ? held
                          ? "var(--deepen)"
                          : "var(--prune)"
                        : "var(--ink-3)",
                    }}
                  >
                    {actual ? (held ? "HELD" : "REWRITTEN") : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── Travelled ── */}
        <div className="p-8">
          <p className="sd-label">Travelled</p>
          <p className="sd-meta mt-2">
            {state.arc.length} position{state.arc.length === 1 ? "" : "s"} occupied.
          </p>

          <ol className="mt-6 flex flex-col gap-4">
            {state.arc.map((phase) => {
              const sounding = phase.index === state.phaseIndex;
              return (
                <li key={phase.index} className="flex items-baseline gap-4">
                  <span
                    className="sd-box block h-4 w-4 shrink-0"
                    style={{ backgroundColor: `rgb(${phase.field})` }}
                    aria-hidden
                  />
                  <span className="flex-1">
                    <span
                      className="sd-meta block"
                      style={{ color: sounding ? "var(--ink)" : "var(--ink-2)" }}
                    >
                      {phase.artist} — {phase.title}
                    </span>
                    <span className="sd-meta block" style={{ color: "var(--ink-3)" }}>
                      {phase.region.replace(/_/g, " ")} · step {phase.step.toFixed(2)} · AVI{" "}
                      {phase.keys.avi.toFixed(2)}
                    </span>
                  </span>
                  <span
                    className="sd-numeral shrink-0"
                    style={{ color: phase.diverged ? "var(--prune)" : "var(--ink-3)" }}
                  >
                    {sounding ? "SOUNDING" : phase.diverged ? "DIVERGED" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
