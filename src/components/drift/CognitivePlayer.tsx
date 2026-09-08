"use client";

/**
 * COGNITIVE PLAYER
 *
 * The transport for an application that has no transport controls. There is no
 * next, no previous, no shuffle and no repeat, because none of those actions
 * exist in the model — a session is a trajectory, and the only way to change it
 * is to change where you are going or to let the engine read how you are
 * behaving.
 *
 * What replaces them:
 *   - a volume control, which is the primary *input* to the engine rather than
 *     an output setting, and which reports what it landed on;
 *   - a fragility meter, so the listener can see when the engine is watching
 *     most closely;
 *   - a readout of the engine's own reasoning, because an engine that reroutes
 *     itself silently is indistinguishable from one that is broken.
 *
 * Layout is on the 8px grid throughout: every padding, gap and fixed dimension
 * is a multiple of 8, and every line box in `drift.css` is too.
 */

import { useMemo } from "react";
import { useDrift, useDriftActions, useCurrentPhase } from "@/context/DriftContext";
import { AXES } from "@/lib/drift/ontology";

function pct(n: number): string {
  return `${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`;
}

const MODE_COLOR: Record<string, string> = {
  deepen: "var(--deepen)",
  prune: "var(--prune)",
  explore: "var(--explore)",
};

/** Flat horizontal bar. No gradient fill, no rounded cap, no inner shadow. */
function Meter({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="sd-label w-32 shrink-0">{label}</span>
      <span className="sd-bar flex-1">
        <span style={{ width: pct(value), backgroundColor: tint ?? "var(--ink)" }} />
      </span>
      <span className="sd-numeral w-8 shrink-0 text-right">{Math.round(value * 100)}</span>
    </div>
  );
}

export function CognitivePlayer() {
  const state = useDrift();
  const actions = useDriftActions();
  const phase = useCurrentPhase();

  const axes = useMemo(() => {
    if (!phase) return [];
    return AXES.map((axis) => ({
      key: axis.key,
      label: axis.label,
      value: phase.target[axis.key],
      // The axis the engine pushes against rather than toward.
      adversarial: axis.key === "insistence",
    }));
  }, [phase]);

  if (state.status === "idle") {
    return (
      <section className="sd-box p-8">
        <p className="sd-label">Cognitive player</p>
        <p className="sd-body mt-4 max-w-xl">
          Nothing is sounding. Choose an origin and a destination on the emotional map — the engine
          computes the drift between them. There is no play button because there is nothing to
          press play on until a direction exists.
        </p>
      </section>
    );
  }

  if (state.status === "planning") {
    return (
      <section className="sd-box p-8">
        <p className="sd-label">Computing drift</p>
        <p className="sd-body mt-4">
          Interpolating a bowed path between two emotional coordinates, then filtering every
          candidate through the rejection rules.
        </p>
      </section>
    );
  }

  if (state.status === "refused" || !phase) {
    return (
      <section className="sd-box p-8" style={{ borderColor: "var(--prune)" }}>
        <p className="sd-label" style={{ color: "var(--prune)" }}>
          Drift refused
        </p>
        <p className="sd-body mt-4">{state.error ?? "No admissible position remains."}</p>
        <button className="sd-press sd-box mt-6 px-4 py-2 sd-meta" onClick={actions.reset}>
          Return to the map
        </button>
      </section>
    );
  }

  const reading = state.reading;
  const modeTint = reading ? MODE_COLOR[reading.mode] : "var(--ink-3)";

  return (
    <section className="sd-box">
      {/* ── Sounding position ── */}
      <div className="sd-rule-b p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="sd-label">
            Phase {phase.index + 1} · {phase.chapter}
          </p>
          <p className="sd-label" style={{ color: modeTint }}>
            {reading ? `${reading.mode} · valence ${reading.valence.toFixed(2)}` : "reading you"}
          </p>
        </div>

        <h2 className="sd-display mt-4">{phase.title}</h2>
        <p className="sd-title mt-2" style={{ color: "var(--ink-2)" }}>
          {phase.artist}
        </p>

        <p className="sd-body mt-6 max-w-2xl">{phase.intent}</p>

        {/*
          No artwork. Album packaging is exactly the skeuomorphic metadata the
          ontology exists to strip, and a photographic cover would smuggle a
          gradient onto a surface that forbids them. The room's colour is the
          artwork: it is derived from this position's warmth and depth.
        */}
        <div className="mt-8 flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-4">
            <span
              className="sd-box block h-8 w-8"
              style={{ backgroundColor: `rgb(${phase.field})` }}
              aria-hidden
            />
            <span className="sd-meta">emotional field · drives the room</span>
          </div>
          <span className="sd-numeral">
            AVI {phase.keys.avi.toFixed(2)} · CINEMATIC SPACE {phase.keys.cinematicMagnitude.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Progress. Scrubbing is allowed; skipping is not. ── */}
      <div className="sd-rule-b p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="sd-label">Position</p>
          <p className="sd-numeral">
            {pct(state.progress)}
            {phase.audio.streamUrl ? "" : " · silent drift"}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="sd-bar flex-1">
            <span style={{ width: pct(state.progress) }} />
          </span>
        </div>

        {/*
          Fragility windows drawn onto the timeline. This is the engine showing
          its hand: these are the moments where a volume gesture counts for up
          to 2.3x, and the listener is entitled to know that.
        */}
        <div className="relative mt-4 h-8">
          <div className="sd-rule-t absolute inset-x-0 top-0" />
          {phase.fragilityWindows.map((w, i) => (
            <div
              key={i}
              className="absolute top-0 h-8"
              style={{
                left: pct(w.start),
                width: pct(Math.max(0.01, w.end - w.start)),
                backgroundColor: "var(--rule-strong)",
                opacity: 0.35 + w.intensity * 0.5,
              }}
              title={`Vocal fragility window · intensity ${w.intensity.toFixed(2)}`}
            />
          ))}
          <div
            className="absolute top-0 h-8 w-px"
            style={{ left: pct(state.progress), backgroundColor: "var(--ink)" }}
            aria-hidden
          />
          {phase.fragilityWindows.length === 0 && (
            <p className="sd-meta absolute inset-x-0 top-2">
              No exposed moments in this position — gestures here are read as environmental.
            </p>
          )}
        </div>

        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(state.progress * 1000)}
          onChange={(e) => actions.seek(Number(e.target.value) / 1000)}
          aria-label="Position within the current phase"
        />
      </div>

      {/* ── Volume: an input to the engine, not a setting ── */}
      <div className="sd-rule-b p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="sd-label">Level · read as feedback</p>
          <p className="sd-numeral" style={{ color: state.fragilityNow > 0.2 ? "var(--deepen)" : undefined }}>
            {state.fragilityNow > 0.2
              ? `EXPOSED MOMENT · FRAGILITY ${state.fragilityNow.toFixed(2)}`
              : "STRUCTURALLY ANONYMOUS"}
          </p>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(state.volume * 100)}
          onChange={(e) => actions.setVolume(Number(e.target.value) / 100)}
          aria-label="Level. Changes during exposed moments are read as emotional feedback."
        />

        <div className="flex items-center justify-between gap-4">
          <p className="sd-meta">
            {state.fragilityNow > 0.2
              ? "Move this now and the engine will treat it as a statement about the voice."
              : "Move this and the engine will mostly discount it as room noise."}
          </p>
          <p className="sd-numeral">{Math.round(state.volume * 100)}</p>
        </div>

        {state.intensity !== null && (
          <div className="mt-6">
            <Meter label="Live intensity" value={state.intensity} />
          </div>
        )}
      </div>

      {/* ── The position's substrate, exposed ── */}
      <div className="sd-rule-b p-8">
        <p className="sd-label">Substrate · this position has no genre</p>
        <div className="mt-6 flex flex-col gap-2">
          {axes.map((axis) => (
            <Meter
              key={axis.key}
              label={axis.label}
              value={axis.value}
              tint={axis.adversarial ? "var(--prune)" : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── What the engine thinks it is doing ── */}
      <div className="p-8">
        <p className="sd-label">Cognition</p>

        {phase.cognition && (
          <p className="sd-body mt-4">
            <span className="sd-numeral">{phase.cognition.source.toUpperCase()}</span>
            {phase.cognition.model ? ` · ${phase.cognition.model}` : ""} — {phase.cognition.note}
          </p>
        )}

        {phase.cognition?.verification && (
          <p className="sd-meta mt-2">
            Proposal {phase.cognition.verification.proposed ?? "—"}:{" "}
            {phase.cognition.verification.accepted ? "verified" : "refused"} —{" "}
            {phase.cognition.verification.reason}
          </p>
        )}

        {reading && (
          <>
            <p className="sd-body mt-6">{reading.rationale}</p>
            <div className="mt-4 flex flex-col gap-2">
              {reading.contributions.map((c, i) => (
                <div key={i} className="flex items-baseline justify-between gap-4">
                  <span className="sd-meta">{c.note}</span>
                  <span
                    className="sd-numeral"
                    style={{ color: c.weight >= 0 ? "var(--deepen)" : "var(--prune)" }}
                  >
                    {c.weight >= 0 ? "+" : ""}
                    {c.weight.toFixed(2)}
                  </span>
                </div>
              ))}
              {reading.contributions.length === 0 && (
                <p className="sd-meta">No behaviour observed yet.</p>
              )}
            </div>
          </>
        )}

        <p className="sd-meta mt-6">
          {phase.audio.note}
          {state.audioMode.graph
            ? " Web Audio graph active — equal-power crossfade."
            : " Element-level fade — no analyser available."}
        </p>
      </div>
    </section>
  );
}
