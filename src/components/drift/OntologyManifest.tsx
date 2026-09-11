/**
 * ONTOLOGY MANIFEST — SERVER COMPONENT
 *
 * Deliberately not a client component. Every value here is a pure function of
 * modules that already live on the server: the axis table, the rejection rules,
 * the anchor set and the catalog audit. Shipping a runtime to re-derive them in
 * the browser would be pointless, so this whole section costs zero client
 * JavaScript and streams as HTML.
 *
 * It also serves a design purpose. An engine that claims to refuse things should
 * be willing to show you what it refused and why, with the arithmetic attached.
 */

import { AESTHETIC_ANCHORS, AXES, REJECTION_RULES } from "@/lib/drift/ontology";
import { catalogStats, admissiblePool, rejectedPool } from "@/lib/drift/catalog";

export function OntologyManifest() {
  const admitted = admissiblePool();
  const refused = rejectedPool();

  return (
    <section className="sd-box">
      <div className="sd-rule-b p-8">
        <p className="sd-label">Zero-genre ontology</p>
        <p className="sd-body mt-4 max-w-2xl">
          Nothing in this engine stores a genre, a tempo or a popularity rank. A position is seven
          emotional axes, from which two retrieval keys are derived — an Acoustic Vulnerability Index
          and a Cinematic Space Vector. Those keys are the only things the cognitive core is allowed
          to query on.
        </p>
        <p className="sd-numeral mt-6">
          {catalogStats().living} POSITIONS · {admitted.length} ADMITTED · {refused.length} REFUSED ·
          0 GENRE FIELDS
        </p>
      </div>

      {/* ── The substrate ── */}
      <div className="sd-rule-b p-8">
        <p className="sd-label">Substrate axes</p>
        <div className="mt-6 flex flex-col gap-4">
          {AXES.map((axis) => (
            <div key={axis.key} className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-8">
              <span className="sd-meta w-56 shrink-0" style={{ color: "var(--ink)" }}>
                {axis.label}
              </span>
              <span className="sd-meta flex-1">
                1.0 — {axis.high}
                <br />
                0.0 — {axis.low}
              </span>
              <span className="sd-numeral shrink-0">
                {axis.key === "insistence" ? "ADVERSARIAL" : `WEIGHT ${axis.weight.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── What is refused, and why ── */}
      <div className="sd-rule-b p-8">
        <p className="sd-label">Strict rejections</p>
        <p className="sd-body mt-4 max-w-2xl">
          These are not tag blocklists — there are no tags to block. Each rule is a predicate over
          acoustics, so a track nobody has ever heard is filtered on its emotional structure alone.
        </p>
        <ul className="mt-6 flex flex-col gap-2">
          {REJECTION_RULES.map((rule) => (
            <li key={rule.id} className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-8">
              <span className="sd-numeral w-56 shrink-0" style={{ color: "var(--prune)" }}>
                {rule.id.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="sd-meta flex-1">{rule.statement}</span>
            </li>
          ))}
        </ul>

        {refused.length > 0 && (
          <div className="mt-8">
            <p className="sd-label">Removed from this catalog</p>
            <ul className="mt-4 flex flex-col gap-2">
              {refused.map(({ track, reason, severity }) => (
                <li key={track.id} className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-8">
                  <span className="sd-meta w-56 shrink-0" style={{ color: "var(--ink-2)" }}>
                    {track.artist} — {track.title}
                  </span>
                  <span className="sd-meta flex-1">{reason}</span>
                  <span className="sd-numeral shrink-0" style={{ color: "var(--prune)" }}>
                    SEVERITY {severity.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Calibration, not a recommendation quota ── */}
      <div className="p-8">
        <p className="sd-label">Baseline resonance</p>
        <p className="sd-body mt-4 max-w-2xl">
          The substrate is calibrated against these positions. They are reference points the engine
          measures distance from — not artists it is trying to serve you.
        </p>
        <ul className="mt-6 flex flex-col gap-2">
          {AESTHETIC_ANCHORS.map((anchor) => (
            <li key={anchor.name} className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-8">
              <span className="sd-meta w-56 shrink-0" style={{ color: "var(--ink)" }}>
                {anchor.name}
              </span>
              <span className="sd-meta flex-1">{anchor.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
