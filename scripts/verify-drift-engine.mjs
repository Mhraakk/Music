#!/usr/bin/env node
/**
 * Drives the Sonic Drift cognitive core through /api/mcp exactly as the browser
 * client does, and asserts the properties the engine claims about itself.
 *
 * This exists because the interesting failures in this engine are behavioural
 * rather than type-level: an arc that reads as going backwards, a rejection rule
 * calibrated half a point too loose, or a feedback ledger in which older
 * positives out-vote a fresh abandonment. None of those are visible to tsc, and
 * all three were real defects caught by running this.
 *
 *   npm run dev
 *   node scripts/verify-drift-engine.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const ENDPOINT = `${BASE}/api/mcp`;

let failures = 0;
let checks = 0;

function check(ok, label, detail = "") {
  checks += 1;
  if (!ok) failures += 1;
  const mark = ok ? "  ok  " : " FAIL ";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
}

function section(title) {
  console.log(`\n${title}\n${"-".repeat(title.length)}`);
}

let rpcId = 0;

async function rpc(method, params) {
  rpcId += 1;
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId, method, params }),
  });
  if (!response.ok) throw new Error(`${method} → HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`${method} → ${payload.error.message}`);
  return payload.result;
}

async function callTool(name, args) {
  const result = await rpc("tools/call", { name, arguments: args });
  if (result.isError) throw new Error(`${name} → ${result.content?.[0]?.text}`);
  return result.structuredContent;
}

/* ─────────────────────────── protocol + capability ─────────────────────────── */

async function verifyProtocol() {
  section("MCP protocol");

  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    clientInfo: { name: "verify-drift-engine", version: "1.0.0" },
  });
  check(init.protocolVersion === "2025-06-18", "initialize negotiates the protocol version", init.protocolVersion);
  check(Boolean(init.capabilities?.tools), "server advertises tool capability");

  const { tools } = await rpc("tools/list", {});
  const names = tools.map((t) => t.name);
  check(names.includes("get_next_emotional_drift"), "get_next_emotional_drift is exposed");
  check(tools.every((t) => t.inputSchema?.type === "object"), "every tool carries a JSON Schema");

  // Notifications must be answered with silence and a 202, not a result object.
  const notified = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });
  check(notified.status === 202, "notification returns 202 with no body", `status ${notified.status}`);

  const unknown = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "does/not/exist" }),
  }).then((r) => r.json());
  check(unknown.error?.code === -32601, "unknown method returns METHOD_NOT_FOUND", String(unknown.error?.code));
}

async function verifyOntology() {
  section("Ontology and topography");

  const status = await fetch(ENDPOINT).then((r) => r.json()).then((d) => d.status);

  check(status.ontology.genreFields === 0, "zero genre fields in the catalog");
  check(status.ontology.admitted > 40, "admissible pool is large enough to drift in", `${status.ontology.admitted} positions`);
  check(status.ontology.axes.length === 7, "seven substrate axes");
  check(status.ontology.rejectionRules.length === 6, "six strict rejection rules");

  const failed = status.topography.audit.filter((a) => !a.ok);
  check(
    failed.length === 0,
    "every coordinate is a place the engine would play",
    failed.length ? failed.map((f) => `${f.id}:${f.worst}`).join(", ") : `${status.topography.coordinates} coordinates`
  );
}

/* ───────────────────────────── rejection calibration ───────────────────────────── */

const SHAPES = [
  ["festival EDM anthem", { depth: 0.2, narrative: 0.25, fragility: 0.1, cinema: 0.2, warmth: 0.5, imperfection: 0.1, insistence: 0.95 }, 0.9, false],
  ["loop-based minimal techno", { depth: 0.45, narrative: 0.15, fragility: 0.2, cinema: 0.4, warmth: 0.3, imperfection: 0.2, insistence: 0.7 }, 0.2, false],
  ["bright commercial house", { depth: 0.2, narrative: 0.5, fragility: 0.25, cinema: 0.35, warmth: 0.9, imperfection: 0.3, insistence: 0.6 }, 0.85, false],
  ["emotionless ambient", { depth: 0.3, narrative: 0.15, fragility: 0.1, cinema: 0.6, warmth: 0.2, imperfection: 0.15, insistence: 0.05 }, 0.1, false],
  ["rhythm-dominant experimental jazz", { depth: 0.35, narrative: 0.55, fragility: 0.3, cinema: 0.4, warmth: 0.45, imperfection: 0.85, insistence: 0.8 }, 0.15, false],
  ["Portishead-shaped", { depth: 0.9, narrative: 0.68, fragility: 0.92, cinema: 0.84, warmth: 0.4, imperfection: 0.74, insistence: 0.3 }, 0.2, true],
  ["Massive Attack-shaped", { depth: 0.88, narrative: 0.72, fragility: 0.66, cinema: 0.86, warmth: 0.44, imperfection: 0.58, insistence: 0.34 }, 0.35, true],
  ["St Germain-shaped", { depth: 0.56, narrative: 0.7, fragility: 0.44, cinema: 0.66, warmth: 0.88, imperfection: 0.8, insistence: 0.42 }, 0.3, true],
  ["16BL deep-room-shaped", { depth: 0.7, narrative: 0.6, fragility: 0.46, cinema: 0.78, warmth: 0.72, imperfection: 0.54, insistence: 0.44 }, 0.2, true],
];

async function verifyRejections() {
  section("Strict rejections");

  for (const [label, vector, chartGravity, shouldAdmit] of SHAPES) {
    const result = await callTool("evaluate_emotional_resonance", { vector, chartGravity });
    const top = result.violations[0];
    check(
      result.admitted === shouldAdmit,
      `${shouldAdmit ? "admits" : "refuses"} ${label}`,
      result.admitted
        ? `AVI ${result.acousticVulnerabilityIndex.toFixed(2)}, nearest ${result.baselineResonance.nearest}`
        : `${top?.id} ${top?.severity.toFixed(2)}`
    );
  }
}

/* ──────────────────────────────── arc geometry ──────────────────────────────── */

const SEAM_LIMIT = 0.34;

async function verifyArc() {
  section("Arc planning");

  const { arc, phases } = await callTool("plan_emotional_drift", {
    sessionId: "verify-arc",
    origin: "deep_melancholy",
    destination: "cinematic_warmth",
  });

  check(phases.length >= 5 && phases.length <= 7, "arc is 5–7 phases", `${phases.length} phases`);
  check(arc.origin === "deep_melancholy" && arc.destination === "cinematic_warmth", "arc honours both endpoints");

  const worstSeam = Math.max(...phases.map((p) => p.step));
  check(worstSeam <= SEAM_LIMIT, "no transition exceeds the seam cap", `worst step ${worstSeam.toFixed(3)}`);

  const artists = phases.map((p) => p.artist.toLowerCase());
  check(new Set(artists).size === artists.length, "no artist repeats within an arc");

  // Warmth should rise across a drift toward Cinematic Warmth. A dip mid-arc is
  // legal (the path bows), but the endpoints must be ordered.
  const first = phases[0].target.warmth;
  const last = phases[phases.length - 1].target.warmth;
  check(last > first, "warmth increases from departure to arrival", `${first.toFixed(2)} → ${last.toFixed(2)}`);

  // The bow: the deepest point should be strictly inside the arc, not at an end.
  const depths = phases.map((p) => p.target.depth);
  const deepestIndex = depths.indexOf(Math.max(...depths));
  check(
    deepestIndex > 0 && deepestIndex < phases.length - 1,
    "the path bows — deepest point is mid-arc",
    `deepest at phase ${deepestIndex + 1} of ${phases.length}`
  );

  console.log("");
  for (const p of phases) {
    console.log(
      `       ${String(p.index + 1).padStart(2)}. ${p.chapter.padEnd(8)} ` +
        `${p.region.padEnd(18)} step ${p.step.toFixed(3)}  field ${p.field.padEnd(12)} ` +
        `${p.artist} — ${p.title}`
    );
  }
}

/* ────────────────────────────── session behaviour ────────────────────────────── */

const SCRIPT = [
  ["volume_raise", 0.85, 0.35, "leans in on an exposed moment"],
  ["volume_raise", 0.8, 0.3, "leans in again"],
  ["dwell_complete", 0, 0, "listens to the end"],
  ["abandon", 0.2, 0, "walks out early"],
  ["volume_lower", 0.75, 0.4, "pulls back on an exposed moment"],
  ["stillness", 0, 0, "does nothing"],
  ["seek_back", 0.7, 0, "replays a moment"],
  ["dwell_complete", 0, 0, "listens to the end"],
];

async function verifySession() {
  section("Session behaviour under implicit feedback");

  let history = [];
  let branches = {};
  let signals = [];
  const modes = [];

  // Each row is the engine's decision followed by what the listener then did in
  // response to it, so the mode on any row reflects the rows above it.
  console.log("\n       behaviour that follows each decision → the decision it produced next\n");
  for (const [kind, fragility, magnitude, label] of SCRIPT) {
    const decision = await callTool("get_next_emotional_drift", {
      sessionId: "verify-session",
      origin: "deep_melancholy",
      destination: "cinematic_warmth",
      history,
      signals,
      branches,
    });

    const { phase, reading } = decision;
    branches = decision.branches;
    history.push(phase.trackId);
    modes.push(reading.mode);

    console.log(
      `       ${label.padEnd(34)} ${reading.mode.padEnd(8)} ` +
        `val ${reading.valence >= 0 ? "+" : ""}${reading.valence.toFixed(2)} ` +
        `conf ${reading.confidence.toFixed(2)} step ${phase.step.toFixed(3)} ` +
        `${phase.region.padEnd(18)} ${phase.artist} — ${phase.title}`
    );

    signals = [
      ...signals,
      {
        kind,
        trackId: phase.trackId,
        progress: kind === "abandon" ? 0.15 : kind === "dwell_complete" ? 1 : 0.5,
        fragility,
        magnitude,
        at: Date.now(),
      },
    ];
  }

  console.log("");
  check(new Set(history).size === history.length, "no track repeats across the session", `${history.length} phases`);
  check(modes.includes("deepen"), "positive gestures produce deepening");
  check(modes.includes("prune"), "negative gestures produce pruning");
  check(
    Object.values(branches).some((b) => b.status === "pruned"),
    "a branch is recorded as pruned in branch memory",
    JSON.stringify(branches)
  );
}

async function verifyDeepenIntensifies() {
  section("Deepen semantics");

  // A deliberately cold, heavy starting position, so progress toward the warm
  // destination is unambiguous in a single axis.
  const here = {
    depth: 0.9,
    narrative: 0.5,
    fragility: 0.7,
    cinema: 0.85,
    warmth: 0.25,
    imperfection: 0.6,
    insistence: 0.2,
  };
  const shared = {
    sessionId: "verify-deepen",
    origin: "deep_melancholy",
    destination: "cinematic_warmth",
    history: ["l-3", "l-19"],
    trajectory: [here, here],
    branches: {},
  };
  const at = Date.now();

  const weak = await callTool("get_next_emotional_drift", {
    ...shared,
    signals: [{ kind: "volume_raise", trackId: "l-19", progress: 0.5, fragility: 0.85, magnitude: 0.3, at }],
  });
  const strong = await callTool("get_next_emotional_drift", {
    ...shared,
    signals: [
      { kind: "volume_raise", trackId: "l-19", progress: 0.5, fragility: 0.85, magnitude: 0.35, at },
      { kind: "volume_raise", trackId: "l-3", progress: 0.55, fragility: 0.8, magnitude: 0.3, at: at - 1000 },
      { kind: "dwell_complete", trackId: "l-3", progress: 1, fragility: 0, magnitude: 0, at: at - 2000 },
    ],
  });

  check(weak.reading.mode === "deepen" && strong.reading.mode === "deepen", "both readings deepen");
  check(
    strong.reading.confidence > weak.reading.confidence,
    "more evidence raises confidence",
    `${weak.reading.confidence.toFixed(2)} → ${strong.reading.confidence.toFixed(2)}`
  );

  /**
   * Regression guard for the freeze. `deepen` once combined a step that shrank
   * with confidence and an aim that dropped the destination entirely, so the
   * strongest resonance produced the least movement and a session could stall
   * on one position forever.
   *
   * Note this asserts *progress*, not step length. A smaller step at higher
   * confidence is now correct: the aim retains a destination component, and
   * strong resonance legitimately means staying nearer to what is working. What
   * must never happen again is the drift ceasing to advance.
   */
  for (const [label, result] of [["low", weak], ["high", strong]]) {
    check(
      result.phase.target.warmth > here.warmth,
      `deepen still advances toward the destination at ${label} confidence`,
      `warmth ${here.warmth.toFixed(2)} → ${result.phase.target.warmth.toFixed(2)}`
    );
    check(
      result.phase.step > 0.004,
      `deepen produces a non-zero step at ${label} confidence`,
      `step ${result.phase.step.toFixed(4)}`
    );
  }
}

async function verifySilentSessionRestraint() {
  section("Silent-session restraint");

  // A phase with no resolved audio still advances, but its completion is
  // recorded as `stillness` rather than `dwell_complete`. Crediting an inaudible
  // phase as a full dwell manufactures strong positives and pins the engine in
  // `deepen` for an entire session, which is what this guards against.
  const run = async (kind) => {
    let history = [];
    let branches = {};
    let signals = [];
    let last = null;
    for (let i = 0; i < 6; i++) {
      const decision = await callTool("get_next_emotional_drift", {
        sessionId: `verify-silent-${kind}`,
        origin: "deep_melancholy",
        destination: "cinematic_warmth",
        history,
        signals,
        branches,
      });
      branches = decision.branches;
      history.push(decision.phase.trackId);
      last = decision.reading;
      signals.push({
        kind,
        trackId: decision.phase.trackId,
        progress: 1,
        fragility: 0,
        magnitude: 0,
        at: Date.now(),
      });
    }
    return last;
  };

  const still = await run("stillness");
  const dwelt = await run("dwell_complete");

  check(
    still.confidence < dwelt.confidence,
    "stillness builds less confidence than a real dwell",
    `${still.confidence.toFixed(2)} vs ${dwelt.confidence.toFixed(2)}`
  );
  check(
    still.confidence < 0.7,
    "a silent session does not reach high conviction",
    `confidence ${still.confidence.toFixed(2)} after 6 phases`
  );
}

async function verifyArrival() {
  section("Long-session arrival");

  // A listener who names a destination must reach it, whether they engage or
  // sit still. Two defects used to prevent that: `deepen` dropped the
  // destination from its aim entirely, and the engine treated the served
  // track's position as "where the session is", so once a region ran thin the
  // compromise occupant dragged the whole trajectory back the way it came.
  const run = async (kind) => {
    const arc = [];
    let branches = {};
    let signals = [];
    for (let i = 0; i < 18; i++) {
      const recent = arc.slice(-24);
      const decision = await callTool("get_next_emotional_drift", {
        sessionId: `verify-arrival-${kind}`,
        origin: "deep_melancholy",
        destination: "cinematic_warmth",
        history: recent.map((p) => p.trackId),
        trajectory: recent.map((p) => p.target),
        signals: signals.slice(-12),
        branches,
      });
      branches = decision.branches;
      arc.push(decision.phase);
      signals.push({
        kind,
        trackId: decision.phase.trackId,
        progress: 1,
        fragility: 0,
        magnitude: 0,
        at: Date.now(),
      });
    }
    return arc;
  };

  for (const [kind, label] of [
    ["stillness", "passive listener"],
    ["dwell_complete", "engaged listener"],
  ]) {
    const arc = await run(kind);
    const final = arc[arc.length - 1];
    const tailWarmth = arc.slice(-6).map((p) => p.target.warmth);

    check(
      final.region === "cinematic_warmth",
      `${label} arrives at the named destination`,
      `${final.region}, warmth ${final.target.warmth.toFixed(2)}`
    );
    check(
      Math.min(...tailWarmth) > 0.6,
      `${label} holds the destination once reached`,
      `min warmth over last 6 phases ${Math.min(...tailWarmth).toFixed(2)}`
    );
    check(
      final.target.warmth > arc[0].target.warmth,
      `${label} ends warmer than it began`,
      `${arc[0].target.warmth.toFixed(2)} → ${final.target.warmth.toFixed(2)}`
    );
  }
}

/* ──────────────────────────────────── main ──────────────────────────────────── */

try {
  await verifyProtocol();
  await verifyOntology();
  await verifyRejections();
  await verifyArc();
  await verifySession();
  await verifyDeepenIntensifies();
  await verifySilentSessionRestraint();
  await verifyArrival();
} catch (error) {
  console.error(`\nAborted: ${error.message}`);
  console.error(`Is the dev server running at ${BASE}?`);
  process.exit(1);
}

console.log(`\n${checks - failures}/${checks} checks passed.`);
process.exit(failures === 0 ? 0 : 1);
