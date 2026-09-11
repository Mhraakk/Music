"use client";

/**
 * Listening window. No skip/next — the engine owns what follows.
 * Minimize docks. Close stops and hides. Love teaches the next drift.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { usePlayer, usePlayerActions, usePlayerClock } from "@/context/PlayerContext";
import { TOPOGRAPHY } from "@/lib/drift/topography";
import { clock } from "@/lib/format";
import { isSoundcloudTrack, sourceLabel, youtubeVideoId } from "@/lib/converse/anywhere";
import { CloseGlyph, MinimizeGlyph, PauseIcon, PlayIcon, RestoreGlyph, SpinnerGlyph, VolumeGlyph } from "./icons";
import { Artwork } from "./Artwork";
import { LoveControl } from "./LoveControl";
import { DislikeControl } from "./DislikeControl";
import type { LyricLine } from "@/lib/lyrics/lrclib";

const NuclearStage = dynamic(() => import("./NuclearStage").then((mod) => ({ default: mod.NuclearStage })), {
  ssr: false,
});
const LyricsStage = dynamic(() => import("./LyricsStage").then((mod) => ({ default: mod.LyricsStage })), { ssr: false });

const MODE_LABEL: Record<string, string> = {
  deepen: "More like this",
  prune: "Moving away from this",
  explore: "Trying something adjacent",
};

export function MiniPlayer() {
  const { current, playing, volume, reading, cognition, destination, loading, error, fromEngine, fromAsk, queue, queueTitle, listenVia, nuclearDuration, nuclearSeekAt, likedIds, dislikedIds } =
    usePlayer();
  const { progress, fragilityNow } = usePlayerClock();
  const { toggle, setVolume, seek, stop, setDestination, nuclearTick, nuclearEnded, nuclearFailed, toggleLike, toggleDislike } = usePlayerActions();
  const [expanded, setExpanded] = useState(false);
  const [docked, setDocked] = useState(false);
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [lovedHint, setLovedHint] = useState<string | null>(null);
  const [refusedHint, setRefusedHint] = useState<string | null>(null);
  const prevLiked = useRef(false);
  const prevRefused = useRef(false);
  const liked = Boolean(current && likedIds.includes(current.id));
  const refused = Boolean(current && dislikedIds.includes(current.id));

  const minimize = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setDocked(true);
  };
  const restore = () => setDocked(false);
  const closeWindow = () => {
    setExpanded(false);
    setDocked(false);
    stop();
  };
  const yt = current ? youtubeVideoId(current) : null;
  const sc = current ? isSoundcloudTrack(current) : false;
  const via = current ? sourceLabel(current.foundVia) : null;
  const mode = !current ? "idle" : docked ? "dock" : expanded ? "stage" : "bar";

  const total = current
    ? listenVia === "youtube" && nuclearDuration
      ? nuclearDuration
      : current.previewUrl && listenVia !== "youtube"
        ? 30
        : current.duration
    : 0;
  const elapsed = progress * total;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Escape") {
        event.preventDefault();
        if (expanded) {
          setExpanded(false);
          return;
        }
        if (current && !docked) {
          setDocked(true);
          return;
        }
        if (current) stop();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
        return;
      }
      if (!current || !total) return;
      if (event.code === "ArrowLeft") {
        event.preventDefault();
        seek(Math.max(0, progressRef.current - 5 / total));
        return;
      }
      if (event.code === "ArrowRight") {
        event.preventDefault();
        seek(Math.min(1, progressRef.current + 5 / total));
        return;
      }
      if (event.code === "ArrowUp") {
        event.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
        return;
      }
      if (event.code === "ArrowDown") {
        event.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, docked, expanded, setVolume, seek, stop, toggle, total, volume]);

  useEffect(() => {
    if (!current) {
      setLyricLines([]);
      setLyricsStatus("idle");
      setExpanded(false);
      setDocked(false);
      setLovedHint(null);
      return;
    }
    let cancelled = false;
    setLyricLines([]);
    setLyricsStatus("loading");
    void fetch(`/api/lyrics?artist=${encodeURIComponent(current.artist)}&title=${encodeURIComponent(current.title)}`)
      .then((r) => r.json())
      .then((payload: { ok?: boolean; synced?: boolean; lines?: LyricLine[] }) => {
        if (cancelled) return;
        if (!payload.ok || !Array.isArray(payload.lines) || payload.lines.length === 0) {
          setLyricLines([]);
          setLyricsStatus("empty");
          return;
        }
        setLyricLines(payload.lines);
        setLyricsSynced(payload.synced === true);
        setLyricsStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setLyricLines([]);
          setLyricsStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.artist, current?.title]);

  useEffect(() => {
    prevLiked.current = Boolean(current && likedIds.includes(current.id));
    prevRefused.current = Boolean(current && dislikedIds.includes(current.id));
    setLovedHint(null);
    setRefusedHint(null);
    // Snapshot at track change only — a later like must still be able to whisper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    if (!current) return;
    if (liked && !prevLiked.current) {
      setLovedHint("Loved. The next drift leans this way.");
      setRefusedHint(null);
      prevLiked.current = true;
      const timer = window.setTimeout(() => setLovedHint(null), 3200);
      return () => window.clearTimeout(timer);
    }
    prevLiked.current = liked;
  }, [current, liked]);

  useEffect(() => {
    if (!current) return;
    if (refused && !prevRefused.current) {
      setRefusedHint("Won’t lean this way next.");
      setLovedHint(null);
      prevRefused.current = true;
      const timer = window.setTimeout(() => setRefusedHint(null), 3200);
      return () => window.clearTimeout(timer);
    }
    prevRefused.current = refused;
  }, [current, refused]);

  if (!current) return null;

  return (
    <section
      className="cx-mini"
      data-mode={mode}
      aria-label="Now playing"
      style={current.tint ? ({ ["--poster-tint"]: current.tint } as CSSProperties) : undefined}
    >
      <div className="cx-progress">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      {docked ? (
        <div className="cx-dock">
          <button type="button" className="cx-dock-main" aria-label="Restore" onClick={restore}>
            <span className="cx-mini-art" style={{ backgroundColor: current.tint ?? "var(--color-sand)" }}>
              {current.artworkUrl && <Artwork src={current.artworkUrl} sizes="40px" />}
            </span>
            <span className="min-w-0">
              <span className="cx-truncate block text-[13px] font-semibold leading-tight">{current.title}</span>
              <span className="cx-truncate block text-[12px] leading-tight text-[var(--ink-3)]">{current.artist}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={toggle}
            className="cx-icon-button"
            data-solid="true"
            aria-label={playing ? "Pause" : "Play"}
            disabled={loading}
          >
            {loading ? <SpinnerGlyph /> : playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div className="cx-window-chrome">
            <LoveControl track={current} />
            <DislikeControl track={current} />
            <button type="button" className="cx-window-ctrl" aria-label="Restore" onClick={restore}>
              <RestoreGlyph />
            </button>
            <button type="button" className="cx-window-ctrl" aria-label="Close" onClick={closeWindow}>
              <CloseGlyph />
            </button>
          </div>
        </div>
      ) : !expanded ? (
        <div className="cx-mini-bar">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label={expanded ? "Hide playing details" : "Show playing details"}
          >
            <span className="cx-mini-art" style={{ backgroundColor: current.tint ?? "var(--color-sand)" }}>
              {current.artworkUrl && <Artwork src={current.artworkUrl} sizes="48px" />}
            </span>
            <span className="min-w-0">
              <span className="cx-truncate block text-[13px] font-semibold leading-tight">{current.title}</span>
              <span className="cx-truncate block text-[12px] leading-tight text-[var(--ink-3)]">{current.artist}</span>
              <span className="mt-[2px] flex items-center gap-2 text-[11px] text-[var(--ink-3)]">
                <span className="tabular-nums">
                  {clock(elapsed)} / {clock(total)}
                </span>
                {via && listenVia !== "youtube" && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{via}</span>
                  </>
                )}
                {listenVia === "youtube" && (
                  <>
                    <span aria-hidden>·</span>
                    <span>YouTube full listen</span>
                  </>
                )}
                {fromAsk && !via && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{queueTitle ? queueTitle : "You asked for this"}</span>
                  </>
                )}
                {!fromAsk && fromEngine && (
                  <>
                    <span aria-hidden>·</span>
                    <span>Picked for you</span>
                  </>
                )}
                {queue.length > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {queue.length} more{queueTitle ? ` in ${queueTitle}` : ""}
                    </span>
                  </>
                )}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={toggle}
            className="cx-icon-button"
            data-solid="true"
            aria-label={playing ? "Pause" : "Play"}
            disabled={loading}
          >
            {loading ? <SpinnerGlyph /> : playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="hidden min-w-0 md:block">
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(e) => seek(Number(e.target.value) / 1000)}
              aria-label="Position"
            />
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <VolumeGlyph />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="Volume"
            />
          </div>

          <div className="cx-window-chrome">
            <LoveControl track={current} />
            <DislikeControl track={current} />
            <button type="button" className="cx-window-ctrl" aria-label="Minimize" onClick={minimize}>
              <MinimizeGlyph />
            </button>
            <button type="button" className="cx-window-ctrl" aria-label="Close" onClick={closeWindow}>
              <CloseGlyph />
            </button>
          </div>
        </div>
      ) : null}

      {listenVia === "youtube" && yt && (
        <NuclearStage
          videoId={yt}
          playing={playing}
          volume={volume}
          seekAt={nuclearSeekAt}
          onTick={nuclearTick}
          onEnded={nuclearEnded}
          onFailed={nuclearFailed}
        />
      )}
      {playing && listenVia === "soundcloud" && sc && current.openUrl && (
        <iframe
          className="cx-embed"
          title="SoundCloud"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(current.openUrl)}&auto_play=true&hide_related=true&show_comments=false&visual=false`}
          allow="autoplay"
        />
      )}

      {expanded && !docked && (
        <div className="cx-window-bar">
          <p className="cx-window-name">Now playing</p>
          <div className="cx-window-chrome">
            <LoveControl track={current} />
            <DislikeControl track={current} />
            <button type="button" className="cx-window-ctrl" aria-label="Minimize" onClick={minimize}>
              <MinimizeGlyph />
            </button>
            <button type="button" className="cx-window-ctrl" aria-label="Close" onClick={closeWindow}>
              <CloseGlyph />
            </button>
          </div>
        </div>
      )}

      {expanded && !docked && (
        <div className="cx-window-stage">
          <div className="cx-poster">
            <span className="cx-poster-glow" aria-hidden />
            <span className="cx-window-art" style={{ backgroundColor: current.tint ?? "var(--color-sand)" }}>
              {current.artworkUrl && <Artwork src={current.artworkUrl} sizes="400px" />}
            </span>
          </div>
          <div className="min-w-0 w-full">
            <p className="cx-window-track">{current.title}</p>
            <p className="mt-1 text-[15px] text-[var(--ink-3)]">{current.artist}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="cx-icon-button"
                data-solid="true"
                aria-label={playing ? "Pause" : "Play"}
                onClick={toggle}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                type="button"
                className={`cx-pill cx-pill-compact ${liked ? "cx-pill-dark" : "cx-pill-ghost"}`}
                aria-pressed={liked}
                aria-label={liked ? "Loved" : "Love this recording"}
                onClick={() => toggleLike()}
              >
                {liked ? "Loved" : "Love this"}
              </button>
              <button
                type="button"
                className={`cx-pill cx-pill-compact ${refused ? "cx-pill-dark" : "cx-pill-ghost"}`}
                aria-pressed={refused}
                aria-label={refused ? "Refused" : "Not this recording or mood"}
                onClick={() => toggleDislike()}
              >
                {refused ? "Refused" : "Not this"}
              </button>
            </div>
            {lovedHint && <p className="cx-meta mt-2">{lovedHint}</p>}
            {refusedHint && <p className="cx-meta mt-2">{refusedHint}</p>}
          </div>
        </div>
      )}

      {expanded && !docked && (
        <div className="cx-panel">
          <p className="cx-meta mb-1">Thicker marks are this track&apos;s most exposed moments</p>

          <div className="relative h-6">
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--hairline)]" />
            {windowsFor(current.vector).map((w, i) => (
              <div
                key={i}
                className="absolute top-1/2 h-[6px] -translate-y-1/2 bg-[var(--ink)]"
                style={{
                  left: `${w.start * 100}%`,
                  width: `${Math.max(1, (w.end - w.start) * 100)}%`,
                  opacity: 0.16 + w.intensity * 0.22,
                }}
              />
            ))}
            <div
              className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-[var(--ink)]"
              style={{ left: `${progress * 100}%` }}
              aria-hidden
            />
          </div>

          <div className="mt-3 md:hidden">
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(e) => seek(Number(e.target.value) / 1000)}
              aria-label="Position"
            />
            <div className="mt-2 flex items-center gap-3">
              <VolumeGlyph />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                aria-label="Volume. Turning it up during a track's most exposed moment tells us you like it."
              />
            </div>
          </div>

          <p className="cx-meta mt-2">
            {fragilityNow > 0.2
              ? "This is the most exposed moment in the track. Turn it up here and we’ll read it as a strong yes."
              : "Turn the volume up when a voice is at its most exposed. That is the signal we listen for."}
          </p>

          {lyricsStatus !== "idle" && (
            <div className="mt-4 border-t border-[var(--hairline)] pt-3">
              <p className="cx-meta mb-1">Lyrics</p>
              {lyricsStatus === "ready" && (
                <LyricsStage lines={lyricLines} elapsedMs={elapsed * 1000} synced={lyricsSynced} />
              )}
              {lyricsStatus === "loading" && <p className="cx-meta">Looking up published lyrics…</p>}
              {lyricsStatus === "empty" && <p className="cx-meta">No published lyrics for this recording yet.</p>}
              {lyricsStatus === "error" && <p className="cx-meta">Lyrics could not be reached just now.</p>}
            </div>
          )}

          <div className="mt-4 border-t border-[var(--hairline)] pt-3">
            <p className="cx-meta mb-2">Drift toward</p>
            <div className="flex flex-wrap gap-1.5">
              {TOPOGRAPHY.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  className={`cx-pill cx-pill-compact ${destination === region.id ? "cx-pill-dark" : "cx-pill-ghost"}`}
                  aria-pressed={destination === region.id}
                  onClick={() => setDestination(region.id)}
                >
                  <span className="cx-meta whitespace-nowrap">{region.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(reading || cognition) && (
            <div className="mt-4 border-t border-[var(--hairline)] pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="cx-heading">
                  {reading ? MODE_LABEL[reading.mode] ?? reading.mode : "Listening"}
                </p>
                <p className="cx-mono shrink-0">
                  {cognition?.source === "gemini-mcp"
                    ? "verified"
                    : reading
                      ? reading.confidence < 0.3
                        ? "still learning"
                        : reading.confidence < 0.6
                          ? "fairly sure"
                          : "confident"
                      : "local"}
                </p>
              </div>
              {reading && <p className="cx-meta mt-1">{reading.rationale}</p>}
              {cognition && <p className="cx-meta mt-1">{cognition.note}</p>}
            </div>
          )}

          <div className="mt-4 border-t border-[var(--hairline)] pt-3">
            <p className="cx-meta">
              {current.album ? `${current.album} · ` : ""}
              {current.shape}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(current.openUrl || current.appleUrl) && (
                <a
                  href={current.openUrl || current.appleUrl || "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost cx-pill-compact shrink-0"
                >
                  {via ? `Open on ${via}` : "Apple Music"}
                </a>
              )}
              {current.spotifyUrl && (
                <a
                  href={current.spotifyUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost cx-pill-compact shrink-0"
                >
                  Spotify
                </a>
              )}
              {current.youtubeMusicUrl && (
                <a
                  href={current.youtubeMusicUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost cx-pill-compact shrink-0"
                >
                  YouTube Music
                </a>
              )}
              {current.soundcloudUrl && (
                <a
                  href={current.soundcloudUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost cx-pill-compact shrink-0"
                >
                  SoundCloud
                </a>
              )}
              {current.metingUrl && (
                <a
                  href={current.metingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost cx-pill-compact shrink-0"
                >
                  {current.metingLabel ?? "Catalog"}
                </a>
              )}
              {(current.videoUrl || yt) && (
                <a
                  href={current.videoUrl || `https://www.youtube.com/watch?v=${yt}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost cx-pill-compact shrink-0"
                >
                  Official video
                </a>
              )}
            </div>
          </div>

          {error && <p className="cx-meta mt-2">{error}</p>}
        </div>
      )}
    </section>
  );
}

function windowsFor(vector: { fragility: number; narrative: number }) {
  const { fragility, narrative } = vector;
  if (fragility < 0.34) return [];
  const count = narrative > 0.66 ? 3 : narrative > 0.44 ? 2 : 1;
  const width = Math.min(1, 0.1 + fragility * 0.12);
  return Array.from({ length: count }, (_, i) => {
    const centre = 0.18 + ((i + 1) / (count + 1)) * 0.64;
    return {
      start: Math.max(0, centre - width / 2),
      end: Math.min(1, centre + width / 2),
      intensity: Math.min(1, fragility * (0.78 + (i / Math.max(1, count - 1 || 1)) * 0.22)),
    };
  });
}
