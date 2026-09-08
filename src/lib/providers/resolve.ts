/**
 * PROVIDER RESOLUTION
 *
 * The cognitive core decides *what emotional position* comes next. This module
 * is the only thing that knows how to turn that decision into something a
 * browser can actually play.
 *
 * Order is intentional: Apple MusicKit first for high-fidelity catalog mapping,
 * SoundCloud second as the base audio fallback, and `unresolved` third — which
 * is a first-class outcome, not an error. An unresolved phase still drifts, still
 * colours the room and still collects implicit feedback; it simply has no
 * waveform. The emotional structure is the product, not the file.
 */

import type { DriftTrack } from "@/lib/drift/catalog";
import { musicKitConfig, resolveSong } from "./musickit";
import { resolveTrack, soundCloudConfig } from "./soundcloud";

export type AudioSource = "apple-musickit" | "soundcloud" | "unresolved";

export type ResolvedAudio = {
  appleMusicId: string | null;
  appleMusicUrl: string | null;
  soundcloudUrl: string | null;
  /** Directly playable URL, when a provider offered one. */
  streamUrl: string | null;
  source: AudioSource;
  note: string;
};

const UNRESOLVED: ResolvedAudio = {
  appleMusicId: null,
  appleMusicUrl: null,
  soundcloudUrl: null,
  streamUrl: null,
  source: "unresolved",
  note: "No provider configured — phase drifts silently.",
};

export async function resolveAudio(
  track: DriftTrack,
  soundCloudAccessToken?: string | null
): Promise<ResolvedAudio> {
  const query = track.resolution.query;
  const apple = musicKitConfig().configured;
  const cloud = soundCloudConfig().configured && Boolean(soundCloudAccessToken);

  if (!apple && !cloud) return UNRESOLVED;

  // Both providers are asked in parallel — the fallback is only useful if it is
  // already in hand when the primary comes back empty.
  const [song, scTrack] = await Promise.all([
    apple ? resolveSong(query).catch(() => null) : Promise.resolve(null),
    cloud ? resolveTrack(query, soundCloudAccessToken as string).catch(() => null) : Promise.resolve(null),
  ]);

  const appleMusicId = song?.appleMusicId ?? null;
  const soundcloudUrl = scTrack?.soundcloudUrl ?? null;

  // Apple previews win when present: they are consistent 30-second AAC and CORS
  // friendly, which the Web Audio analyser needs to read the waveform.
  if (song?.previewUrl) {
    return {
      appleMusicId,
      appleMusicUrl: song.url,
      soundcloudUrl,
      streamUrl: song.previewUrl,
      source: "apple-musickit",
      note: "Resolved through Apple MusicKit catalog search.",
    };
  }

  if (scTrack?.streamUrl) {
    return {
      appleMusicId,
      appleMusicUrl: song?.url ?? null,
      soundcloudUrl,
      streamUrl: `${scTrack.streamUrl}?oauth_token=${encodeURIComponent(soundCloudAccessToken as string)}`,
      source: "soundcloud",
      note: "Resolved through SoundCloud base audio.",
    };
  }

  if (appleMusicId || soundcloudUrl) {
    return {
      appleMusicId,
      appleMusicUrl: song?.url ?? null,
      soundcloudUrl,
      streamUrl: null,
      source: "unresolved",
      note: "Catalog identifiers found, but no playable stream was offered.",
    };
  }

  return { ...UNRESOLVED, note: "Neither provider could match this position." };
}
