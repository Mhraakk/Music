/**
 * SONIC DRIFT — SERVER COMPONENT
 *
 * The page is a React Server Component. It reads the SoundCloud session from
 * httpOnly cookies, derives the emotional topography and the engine's capability
 * report on the server, and streams all of that as HTML.
 *
 * Only three things below are client components, and each has a reason:
 *   - `DriftProvider`, which owns an AudioContext.
 *   - `EmotionalTopography` / `CognitivePlayer` / `DriftArcRail`, which respond
 *     to gestures and to the drift's own state.
 *   - `RoomField`, which writes one CSS custom property.
 *
 * The ontology manifest, the integration status and every word of static copy
 * are server-rendered and ship no JavaScript at all.
 */

import Link from "next/link";
import { randomUUID } from "node:crypto";
import { DriftProvider } from "@/context/DriftContext";
import { CognitivePlayer } from "@/components/drift/CognitivePlayer";
import { EmotionalTopography } from "@/components/drift/EmotionalTopography";
import { DriftArcRail } from "@/components/drift/DriftArcRail";
import { OntologyManifest } from "@/components/drift/OntologyManifest";
import { RoomField } from "@/components/drift/RoomField";
import { engineStatus } from "@/lib/mcp/server";
import { topographySnapshot } from "@/lib/mcp/cognition";
import { readSession } from "@/lib/providers/session";

export const dynamic = "force-dynamic";

const AUTH_ERRORS: Record<string, string> = {
  not_configured: "SoundCloud OAuth is not configured on this deployment.",
  state_mismatch: "The sign-in response did not match this browser's handshake. Nothing was stored.",
  handshake_expired: "That sign-in attempt expired. Start again.",
  missing_code: "SoundCloud did not return an authorization code.",
  exchange_failed: "The token exchange with SoundCloud failed.",
  access_denied: "Sign-in was declined.",
};

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-8">
      <span className="sd-meta w-56 shrink-0" style={{ color: "var(--ink)" }}>
        {label}
      </span>
      <span className="sd-numeral w-24 shrink-0" style={{ color: ok ? "var(--deepen)" : "var(--ink-3)" }}>
        {ok ? "ACTIVE" : "ABSENT"}
      </span>
      <span className="sd-meta flex-1">{detail}</span>
    </div>
  );
}

export default async function SonicDriftPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const [{ auth_error }, session] = await Promise.all([searchParams, readSession()]);

  const status = engineStatus();
  const nodes = topographySnapshot();

  // One session id per page load. Seeds deterministic tie-breaking in the drift
  // algorithm, so a reload reproduces an arc but two listeners do not share one.
  const sessionId = randomUUID();

  const authError = auth_error ? (AUTH_ERRORS[auth_error] ?? `Sign-in failed: ${auth_error}`) : null;

  return (
    <DriftProvider sessionId={sessionId}>
      <RoomField />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-16">
        {/* ── Masthead ── */}
        <header className="sd-box p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="sd-label">Sonic Drift</p>
            <Link href="/" className="sd-press sd-meta">
              ← Resonant
            </Link>
          </div>

          <h1 className="sd-display mt-6 max-w-3xl">
            Music as emotional structure, not as a catalog of genres.
          </h1>

          <p className="sd-body mt-6 max-w-2xl">
            There are no playlists, no genre tags, no BPM and no popularity ranking anywhere in this
            system. You choose two coordinates on an emotional map; the engine computes the drift
            between them and then rewrites its own plan based on how you behave — a volume change
            during an exposed vocal moment says more than any rating widget could collect.
          </p>

          <p className="sd-body mt-4 max-w-2xl">
            There is no next button and no shuffle. Those actions do not exist in the model.
          </p>
        </header>

        {authError && (
          <div className="sd-box p-8" style={{ borderColor: "var(--prune)" }}>
            <p className="sd-label" style={{ color: "var(--prune)" }}>
              Sign-in
            </p>
            <p className="sd-body mt-4">{authError}</p>
          </div>
        )}

        {/* ── The map replaces the library ── */}
        <EmotionalTopography nodes={nodes} />

        {/* ── The player ── */}
        <CognitivePlayer />

        {/* ── Projection against reality ── */}
        <DriftArcRail />

        {/* ── Server-rendered: the engine's own rules ── */}
        <OntologyManifest />

        {/* ── Integrations ── */}
        <section className="sd-box">
          <div className="sd-rule-b p-8">
            <p className="sd-label">Cognitive core and providers</p>
            <p className="sd-body mt-4 max-w-2xl">
              Every integration degrades rather than fails. Without Gemini the engine runs
              deterministic local cognition; without a resolver a phase drifts silently but still
              colours the room, still collects implicit feedback and still advances the arc.
            </p>
          </div>

          <div className="sd-rule-b flex flex-col gap-4 p-8">
            <StatusRow
              label="Gemini MCP"
              ok={status.cognition.gemini}
              detail={
                status.cognition.gemini
                  ? `${status.cognition.model} — shown anonymous coordinates only; every proposal is verified against the ontology before acceptance.`
                  : "Set GEMINI_API_KEY to enable model cognition. Local cognition owns the drift until then."
              }
            />
            <StatusRow
              label="Apple MusicKit"
              ok={status.providers.appleMusicKit.configured}
              detail={
                status.providers.appleMusicKit.configured
                  ? "ES256 developer token active. Used strictly for catalog resolution, never for recommendations."
                  : `Missing ${status.providers.appleMusicKit.missing.join(", ")}.`
              }
            />
            <StatusRow
              label="SoundCloud OAuth"
              ok={status.providers.soundCloud.configured}
              detail={
                status.providers.soundCloud.configured
                  ? session.authenticated
                    ? `Signed in as ${session.identity?.displayName}.`
                    : "Configured. Sign in to resolve base audio."
                  : `Missing ${status.providers.soundCloud.missing.join(", ")}.`
              }
            />

            {status.providers.soundCloud.configured && (
              <div className="mt-4">
                {session.authenticated ? (
                  <form action="/api/auth/soundcloud/session" method="post">
                    <button type="submit" className="sd-press sd-box px-4 py-2 sd-meta">
                      Sign out of SoundCloud
                    </button>
                  </form>
                ) : (
                  <a href="/api/auth/soundcloud/authorize" className="sd-press sd-box inline-block px-4 py-2 sd-meta">
                    Sign in with SoundCloud
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="p-8">
            <p className="sd-label">Model Context Protocol</p>
            <p className="sd-body mt-4 max-w-2xl">
              The engine is exposed as a real MCP server, and this interface is simply one of its
              clients — it holds no privileged access. Point any MCP host at{" "}
              <span className="sd-numeral">/api/mcp</span> and the same tools are available.
            </p>
            <ul className="mt-6 flex flex-col gap-2">
              {status.tools.map((tool) => (
                <li key={tool} className="sd-numeral">
                  {tool}
                </li>
              ))}
            </ul>
            <p className="sd-meta mt-6">
              Protocol {status.protocolVersion} · {status.topography.coordinates} coordinates ·{" "}
              {status.ontology.admitted} admissible positions
            </p>
          </div>
        </section>
      </main>
    </DriftProvider>
  );
}
