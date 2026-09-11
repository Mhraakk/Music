/**
 * OS media keys and lock-screen chrome. Play and pause only — the engine owns
 * what follows, so next/previous are never registered.
 */

export type MediaSessionMeta = {
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl?: string | null;
  playing: boolean;
  duration: number;
  position: number;
};

function session(): MediaSession | null {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return null;
  return navigator.mediaSession;
}

export function bindMediaSession(handlers: {
  play: () => void;
  pause: () => void;
  seekToSeconds?: (seconds: number) => void;
}): () => void {
  const media = session();
  if (!media) return () => undefined;

  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      media.setActionHandler(action, handler);
    } catch {
      /* unsupported on this engine */
    }
  };

  set("play", () => handlers.play());
  set("pause", () => handlers.pause());
  set(
    "seekto",
    handlers.seekToSeconds
      ? (details) => {
          if (details.seekTime == null || !Number.isFinite(details.seekTime)) return;
          handlers.seekToSeconds?.(details.seekTime);
        }
      : null
  );
  set("nexttrack", null);
  set("previoustrack", null);

  return () => {
    set("play", null);
    set("pause", null);
    set("seekto", null);
    set("nexttrack", null);
    set("previoustrack", null);
  };
}

export function updateMediaSession(meta: MediaSessionMeta): void {
  const media = session();
  if (!media) return;
  try {
    media.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album ?? "",
      artwork: meta.artworkUrl ? [{ src: meta.artworkUrl, sizes: "512x512", type: "image/jpeg" }] : [],
    });
    media.playbackState = meta.playing ? "playing" : "paused";
  } catch {
    /* Media Session is best-effort */
  }
  if (meta.duration > 0 && Number.isFinite(meta.position)) {
    try {
      media.setPositionState({
        duration: meta.duration,
        position: Math.max(0, Math.min(meta.duration, meta.position)),
        playbackRate: 1,
      });
    } catch {
      /* some engines reject position > duration during seeks */
    }
  }
}

export function clearMediaSession(): void {
  const media = session();
  if (!media) return;
  try {
    media.metadata = null;
    media.playbackState = "none";
  } catch {
    /* ignore */
  }
}
