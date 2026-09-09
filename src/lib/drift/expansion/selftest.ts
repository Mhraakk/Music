/**
 * EXPANSION ENGINE SELF-TEST
 *
 * Pure, no network. The verify script calls this through the MCP so a broken
 * projection or a diversity collapse fails the same way a broken drift does.
 */

import { evaluateRejections, resonanceScore } from "@/lib/drift/ontology";
import { DRIFT_CATALOG } from "@/lib/drift/catalog";
import {
  artistAgrees,
  baselinePrior,
  hash01,
  projectFromFeatures,
  wander,
} from "./project";
import { expandFromCandidates } from "./generate";
import { profileTaste } from "./taste";
import type { AudioFeatures, ExternalCandidate } from "./types";
import { circulateFavorites } from "@/lib/apple/circulation";
import { materializeFavoriteOverlay, parseFavoriteOverlay } from "@/lib/apple/overlay";
import type { LibraryTrack } from "@/lib/library";

function features(partial: Partial<AudioFeatures>): AudioFeatures {
  return {
    integratedLoudness: -14,
    loudnessRange: 6,
    peak: -1,
    rms: 0.2,
    dynamicRange: 10,
    silenceRatio: 0.08,
    spectralCentroid: 1400,
    spectralFlatness: 0.2,
    spectralFlux: 0.35,
    bassRatio: 0.35,
    highRatio: 0.18,
    onsetDensity: 2,
    durationSec: 240,
    ...partial,
  };
}

function candidate(id: string, artist: string, title: string, via: string): ExternalCandidate {
  return {
    appleTrackId: id,
    title,
    artist,
    album: "Fixture",
    durationMs: 280000,
    previewUrl: "https://example.com/preview.m4a",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/fixture/1000x1000bb.jpg",
    thumbUrl: "https://is1-ssl.mzstatic.com/image/thumb/fixture/200x200bb.jpg",
    appleUrl: "https://music.apple.com/us/song/fixture",
    probeArtist: artist,
    probeVia: via,
  };
}

export type InspectionCheck = { ok: boolean; label: string; detail: string };

export function inspectExpansionEngine(): {
  passed: number;
  failed: number;
  checks: InspectionCheck[];
  living: { seed: number; admitted: number };
} {
  const checks: InspectionCheck[] = [];
  const check = (ok: boolean, label: string, detail = "") => {
    checks.push({ ok, label, detail });
  };

  const edm = projectFromFeatures(
    features({
      integratedLoudness: -7,
      loudnessRange: 2.2,
      dynamicRange: 3,
      silenceRatio: 0.01,
      spectralCentroid: 2800,
      onsetDensity: 8.5,
      bassRatio: 0.55,
      highRatio: 0.4,
      rms: 0.55,
    })
  );
  const edmVerdict = evaluateRejections(edm, 0.85);
  check(edmVerdict.rejected, "festival-hot preview is refused", edmVerdict.violations[0]?.id ?? "none");

  const noir = projectFromFeatures(
    features({
      integratedLoudness: -22,
      loudnessRange: 9,
      dynamicRange: 14,
      silenceRatio: 0.22,
      spectralCentroid: 700,
      onsetDensity: 0.8,
      bassRatio: 0.5,
      highRatio: 0.12,
      spectralFlux: 0.4,
      durationSec: 320,
    })
  );
  check(resonanceScore(noir, 0.15) > 0, "quiet, spacious preview is admitted", `resonance ${resonanceScore(noir, 0.15).toFixed(2)}`);
  check(noir.insistence < edm.insistence, "onset-dense preview reads as more insistent", `${noir.insistence.toFixed(2)} < ${edm.insistence.toFixed(2)}`);
  check(noir.cinema > edm.cinema, "silence and range read as more cinematic", `${noir.cinema.toFixed(2)} > ${edm.cinema.toFixed(2)}`);

  const a = wander(baselinePrior(), "seed-a", 0.08);
  const b = wander(baselinePrior(), "seed-a", 0.08);
  const c = wander(baselinePrior(), "seed-b", 0.08);
  check(
    AXIS_EQUAL(a, b),
    "wander is deterministic for the same seed",
    ""
  );
  check(!AXIS_EQUAL(a, c), "wander differs across seeds", "");

  check(hash01("alpha") === hash01("alpha"), "hash01 is stable");
  check(hash01("alpha") !== hash01("beta"), "hash01 distinguishes inputs");
  check(artistAgrees("Tricky", "Tricky"), "artistAgrees accepts the probed artist");
  check(!artistAgrees("Tricky", "Crazy Frog"), "artistAgrees rejects a title-collision artist");
  check(artistAgrees("Massive Attack", "Massive Attack & Tricky"), "artistAgrees keeps a collaboration");
  check(!artistAgrees("Air", "Air Supply"), "short artist names require an exact match");

  const taste = profileTaste({ historyIds: ["l-11", "l-57", "l-60"], pool: DRIFT_CATALOG });
  check(taste.source === "history", "history produces a history taste profile");
  check(
    taste.probeArtists.every((p) => !/house|techno|hop|jazz|ambient|rock|pop/i.test(p.artist)),
    "taste probes are artist names, not genre words",
    taste.probeArtists.map((p) => p.artist).join(", ")
  );
  check(taste.nearestAnchors.length >= 1, "taste names at least one anchor", taste.nearestAnchors.join(", "));

  const baseline = profileTaste({ pool: DRIFT_CATALOG });
  check(baseline.source === "baseline", "empty history falls back to the engine baseline");

  const libraryTaste = profileTaste({
    libraryVectors: [taste.centroid],
    libraryArtists: [{ artist: "Portishead", via: "f-1" }],
    pool: DRIFT_CATALOG,
  });
  check(libraryTaste.source === "library", "Favorite Songs sample produces a library taste profile");
  check(
    libraryTaste.probeArtists[0]?.artist === "Portishead",
    "library artists lead the Apple probes",
    libraryTaste.probeArtists.map((p) => p.artist).join(", ")
  );

  const favs = Array.from({ length: 80 }, (_, i) =>
    fakeFavorite(`f-${880000 + i}`, `Artist ${i % 11}`, i)
  );
  const windowA = circulateFavorites(favs, 72, 0);
  const windowB = circulateFavorites(favs, 72, 15 * 60 * 1000);
  check(windowA.length === 72, "circulation window is capped", `${windowA.length}`);
  check(
    windowA[0].id !== windowB[0].id,
    "circulation rotates across the 15-minute slice",
    `${windowA[0].id} → ${windowB[0].id}`
  );

  const overlay = parseFavoriteOverlay([
    {
      id: "f-inspect-overlay",
      title: "Overlay Fixture",
      artist: "Overlay Artist",
      duration: 240,
      vector: baselinePrior(),
    },
    { id: "x-not-a-favorite", title: "Nope", artist: "X", duration: 200, vector: baselinePrior() },
  ]);
  check(overlay.length === 1 && overlay[0].id === "f-inspect-overlay", "overlay parser keeps only favorite ids");
  const materialised = materializeFavoriteOverlay(overlay);
  check(
    materialised.length === 1 && materialised[0].id === "f-inspect-overlay" && materialised[0].resonance > 0,
    "overlay materialises as a per-request pool, not a shared catalog write"
  );

  const via = "l-11";
  const fixtures: ExternalCandidate[] = [];
  const artists = [
    "Fixture Noir",
    "Fixture Warm",
    "Fixture Fragile",
    "Fixture Cinema",
    "Fixture Dust",
    "Fixture Room",
    "Fixture Valve",
    "Fixture Tape",
    "Fixture Breath",
    "Fixture Weight",
    "Fixture Ember",
    "Fixture Dusk",
    "Karaoke Tribute Band",
  ];
  artists.forEach((artist, i) => {
    fixtures.push(
      candidate(
        String(900000 + i),
        artist,
        artist === "Karaoke Tribute Band" ? "Glory Box (Karaoke)" : `Position ${i + 1}`,
        via
      )
    );
  });

  const { picked, considered, refused } = expandFromCandidates(fixtures, {
    pool: DRIFT_CATALOG,
    taste,
    limit: 10,
    idPrefix: "x",
  });

  check(considered === fixtures.length, "every fixture is considered", `${considered}`);
  check(refused >= 1, "unprojectable karaoke is refused", `${refused} refused`);
  check(picked.length === 10, "ten positions are admitted from a rich fixture set", `${picked.length}`);
  check(
    new Set(picked.map((p) => p.track.artist)).size === picked.length,
    "no artist repeats in the generated ten",
    picked.map((p) => p.track.artist).join(", ")
  );
  check(
    picked.every((p) => p.track.resonance > 0),
    "every generated position is admissible"
  );
  check(
    picked.every((p) => p.track.id.startsWith("x-")),
    "generated ids use the expansion prefix"
  );
  check(
    picked.every((p) => !("genre" in p.track)),
    "admitted tracks carry no genre field"
  );

  const seed = DRIFT_CATALOG.length;
  const admitted = DRIFT_CATALOG.filter((t) => t.resonance > 0).length + picked.length;

  return {
    passed: checks.filter((c) => c.ok).length,
    failed: checks.filter((c) => !c.ok).length,
    checks,
    living: { seed, admitted },
  };
}

function AXIS_EQUAL(a: ReturnType<typeof wander>, b: ReturnType<typeof wander>): boolean {
  return (Object.keys(a) as (keyof typeof a)[]).every((k) => Math.abs(a[k] - b[k]) < 1e-9);
}

function fakeFavorite(id: string, artist: string, i: number): LibraryTrack {
  return {
    id,
    title: `Loved ${i}`,
    artist,
    album: null,
    duration: 240,
    artworkUrl: "https://example.com/art.jpg",
    thumbUrl: null,
    previewUrl: "https://example.com/p.m4a",
    appleUrl: null,
    tint: "#141210",
    searchColor: "#141210",
    searchHsl: { h: 20, s: 0.2, l: 0.12 },
    isDark: true,
    region: "deep_melancholy",
    vector: baselinePrior(),
    avi: 0.5,
    cinematic: 0.5,
    shape: "fixture",
    note: "fixture",
    aspect: 1,
    origin: "favorite",
  };
}
