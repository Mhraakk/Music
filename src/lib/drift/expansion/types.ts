/**
 * LIVING CATALOG — SHARED TYPES
 *
 * An external candidate is an Apple Music / iTunes recording that has not yet
 * been admitted to the substrate. It carries identity and media, never a genre
 * field. The engine projects it onto the seven axes; the rejection rules then
 * decide whether it exists here at all.
 */

import type { EmotionalVector } from "@/lib/drift/ontology";
import type { CoordinateId } from "@/lib/drift/topography";
import type { DriftTrack } from "@/lib/drift/catalog";
import type { TrackMedia } from "@/lib/media";

/**
 * A recording retrieved from Apple's catalog. `retrievalHint` is an iTunes
 * search leftover used only as a last-resort prior during projection and is
 * discarded before the track is materialised — it is never stored.
 */
export type ExternalCandidate = {
  appleTrackId: string;
  title: string;
  artist: string;
  album: string | null;
  durationMs: number;
  previewUrl: string | null;
  artworkUrl: string | null;
  thumbUrl: string | null;
  appleUrl: string | null;
  /** The artist we searched to find this recording. */
  probeArtist: string;
  /**
   * Anchor name or seed-track id that justified the probe, so an artist who
   * does not already sit in the authored catalog still has a neighborhood.
   */
  probeVia: string;
  retrievalHint?: string;
};

export type AudioFeatures = {
  /** Integrated loudness in LUFS. Typical music: −8 (hot) to −30 (quiet). */
  integratedLoudness: number;
  /** Loudness range in LU. */
  loudnessRange: number;
  /** Peak level in dBFS. */
  peak: number;
  /** RMS energy 0–1. */
  rms: number;
  /** Peak-to-RMS in dB — a cheap dynamic-range proxy. */
  dynamicRange: number;
  /** Fraction of the preview flagged as silence. */
  silenceRatio: number;
  /** Spectral centroid in Hz. */
  spectralCentroid: number;
  /** 0 = tonal, 1 = noise-like. */
  spectralFlatness: number;
  /** How much the spectrum changes over time. */
  spectralFlux: number;
  /** Share of energy below ~250 Hz. */
  bassRatio: number;
  /** Share of energy above ~4 kHz. */
  highRatio: number;
  /** Onsets per second. */
  onsetDensity: number;
  durationSec: number;
};

export type TasteProfile = {
  centroid: EmotionalVector;
  nearestAnchors: string[];
  nearestRegions: CoordinateId[];
  probeArtists: { artist: string; via: string }[];
  /** `history` once the listener has actually heard something. */
  source: "history" | "baseline";
  note: string;
};

export type Admission = {
  track: DriftTrack;
  media: TrackMedia;
  /** How the vector was produced — for traces, never shown as a genre. */
  projection: "neighborhood" | "features" | "blend" | "baseline";
};

export type ExpansionTrack = {
  track: DriftTrack;
  media: TrackMedia;
  distance: number;
  projection: Admission["projection"];
};

export type ExpansionResult = {
  taste: TasteProfile;
  tracks: ExpansionTrack[];
  considered: number;
  refused: number;
  probes: string[];
  note: string;
};

export type HarvestFile = {
  generatedAt: string;
  source: string;
  probes: string[];
  candidates: ExternalCandidate[];
};
