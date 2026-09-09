/**
 * GENERATE TEN
 *
 * The listener-facing move: take the current taste position, search Apple
 * Music for recordings near the artists who already occupy that neighbourhood,
 * project each hit onto the substrate, refuse what the ontology refuses, and
 * return ten new admissible positions.
 *
 * Apple is a retrieval index. The cognitive core still owns admission.
 */

import { emotionalDistance } from "@/lib/drift/ontology";
import {
  ingestTracks,
  livingCatalog,
  materializeTrack,
  type DriftTrack,
} from "@/lib/drift/catalog";
import { overlayMedia } from "@/lib/media";
import { refreshLibrary } from "@/lib/library";
import { extractAudioFeatures, hasFfmpeg } from "./features";
import { searchAppleSongs } from "./itunes";
import { admitCandidate, alreadyKnown, pickDiverse } from "./admit";
import { profileTaste, tasteFit } from "./taste";
import type { Admission, ExpansionResult, ExternalCandidate, TasteProfile } from "./types";

const DEFAULT_LIMIT = 10;
const SEARCH_PER_PROBE = 18;
const ANALYZE_SHORTLIST = 16;

function applyProbeMeta(candidate: ExternalCandidate, probeArtist: string, probeVia: string): ExternalCandidate {
  return { ...candidate, probeArtist, probeVia };
}

async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

export async function collectCandidates(
  taste: TasteProfile,
  known: { id: string; title: string; artist: string }[],
  extraProbes: { artist: string; via: string }[] = []
): Promise<{ candidates: ExternalCandidate[]; probes: string[] }> {
  const probes = [...taste.probeArtists, ...extraProbes].slice(0, 10);
  const seen = new Set<string>();
  const candidates: ExternalCandidate[] = [];
  const usedProbes: string[] = [];

  for (const probe of probes) {
    usedProbes.push(probe.artist);
    let hits: ExternalCandidate[] = [];
    try {
      hits = await searchAppleSongs(probe.artist, SEARCH_PER_PROBE);
    } catch {
      continue;
    }
    for (const hit of hits) {
      const tagged = applyProbeMeta(hit, probe.artist, probe.via);
      if (seen.has(tagged.appleTrackId)) continue;
      if (alreadyKnown(tagged, known)) continue;
      seen.add(tagged.appleTrackId);
      candidates.push(tagged);
    }
    const uniqueArtists = new Set(candidates.map((c) => c.artist.toLowerCase()));
    if (usedProbes.length >= 8 && uniqueArtists.size >= 12) break;
  }

  return { candidates, probes: usedProbes };
}

export function expandFromCandidates(
  candidates: ExternalCandidate[],
  ctx: {
    pool: readonly DriftTrack[];
    taste: TasteProfile;
    limit?: number;
    featuresById?: Map<string, import("./types").AudioFeatures>;
    idPrefix?: "h" | "x";
  }
): { picked: Admission[]; considered: number; refused: number } {
  const admitted: Admission[] = [];
  let refused = 0;

  for (const candidate of candidates) {
    const features = ctx.featuresById?.get(candidate.appleTrackId) ?? null;
    const admission = admitCandidate(candidate, {
      pool: ctx.pool,
      build: materializeTrack,
      features,
      idPrefix: ctx.idPrefix ?? "x",
    });
    if (!admission) {
      refused += 1;
      continue;
    }
    admitted.push(admission);
  }

  const ranked = admitted
    .map((item) => ({
      item,
      score:
        tasteFit(item.track.vector, ctx.taste) * 3.2 +
        item.track.resonance * 1.6 +
        item.track.avi * 1.1 -
        emotionalDistance(item.track.vector, ctx.taste.centroid) * 0.4,
    }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);

  return {
    picked: pickDiverse(ranked, ctx.limit ?? DEFAULT_LIMIT),
    considered: candidates.length,
    refused,
  };
}

function commitAdmissions(admitted: Admission[]) {
  ingestTracks(admitted.map((a) => a.track));
  for (const a of admitted) overlayMedia(a.track.id, a.media);
  refreshLibrary();
}

export async function generateTasteExpansion(input: {
  historyIds?: string[];
  tasteVectors?: import("@/lib/drift/ontology").EmotionalVector[];
  excludeIds?: string[];
  limit?: number;
  analyze?: boolean;
}): Promise<ExpansionResult> {
  const limit = Math.min(10, Math.max(1, input.limit ?? DEFAULT_LIMIT));
  const pool = livingCatalog();
  const taste = profileTaste({
    historyIds: input.historyIds,
    tasteVectors: input.tasteVectors,
    pool,
  });

  const known = [
    ...pool.map((t) => ({ id: t.id, title: t.title, artist: t.artist })),
    ...(input.excludeIds ?? []).map((id) => ({ id, title: "", artist: "" })),
  ];

  const { candidates, probes } = await collectCandidates(taste, known);

  let featuresById: Map<string, import("./types").AudioFeatures> | undefined;
  const shouldAnalyze = input.analyze !== false && (await hasFfmpeg());
  if (shouldAnalyze && candidates.length) {
    const shortlist = candidates.slice(0, ANALYZE_SHORTLIST);
    featuresById = new Map();
    const analysed = await mapLimit(shortlist, 3, async (candidate) => {
      if (!candidate.previewUrl) return null;
      const features = await extractAudioFeatures(
        candidate.previewUrl,
        candidate.durationMs > 0 ? candidate.durationMs / 1000 : 30
      );
      return features ? { id: candidate.appleTrackId, features } : null;
    });
    for (const row of analysed) {
      if (row) featuresById.set(row.id, row.features);
    }
  }

  const { picked, considered, refused } = expandFromCandidates(candidates, {
    pool,
    taste,
    limit,
    featuresById,
    idPrefix: "x",
  });

  commitAdmissions(picked);

  const note = picked.length
    ? `Admitted ${picked.length} new positions near ${taste.nearestAnchors[0]}, from ${considered} Apple recordings (${refused} refused).`
    : considered === 0
      ? "Apple Music returned nothing for the current taste probes. Try again in a moment."
      : `Every retrieved recording was refused by the rejection rules (${refused} of ${considered}).`;

  return {
    taste,
    tracks: picked.map((item) => ({
      track: item.track,
      media: item.media,
      distance: emotionalDistance(item.track.vector, taste.centroid),
      projection: item.projection,
    })),
    considered,
    refused,
    probes,
    note,
  };
}
