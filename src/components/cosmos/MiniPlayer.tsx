"use client";

/**
 * Full-width mini-player. No skip/next — the engine owns what follows.
 * Expand the bar for destination, volume, and the current reading.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { TOPOGRAPHY } from "@/lib/drift/topography";
import { clock } from "@/lib/format";
import { isSoundcloudTrack, sourceLabel, youtubeVideoId } from "@/lib/converse/anywhere";
import { PauseIcon, PlayIcon, SpinnerGlyph, VolumeGlyph } from "./icons";
import { NuclearStage } from "./NuclearStage";
import { LyricsStage } from "./LyricsStage";
import type { LyricLine } from "@/lib/lyrics/lrclib";

const MODE_LABEL: Record<string, string> = {
  deepen: "More like this",
  prune: "Moving away from this",
  explore: "Trying something adjacent",
};

export function MiniPlayer() {
  const { current, playing, progress, volume, fragilityNow, reading, cognition, destination, loading, error, fromEngine, fromAsk, queue, queueTitle, listenVia, nuclearDuration, nuclearSeekAt } =
    usePlayer();
  const { toggle, setVolume, seek, stop, setDestination, nuclearTick, nuclearEnded, nuclearFailed } = usePlayerActions();
  const [expanded, setExpanded] = useState(false);
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const yt = current ? youtubeVideoId(current) : null;
  const sc = current ? isSoundcloudTrack(current) : false;
  const via = current ? sourceLabel(current.foundVia) : null;

  const total = current
    ? listenVia === "youtube" && nuclearDuration
      ? nuclearDuration
      : current.previewUrl && listenVia !== "youtube"
        ? 30
        : current.duration
    : 0;
  const elapsed = progress * total;

  useEffect(() => {
    if (!current) {
      setLyricLines([]);
      setLyricsStatus("idle");
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

  return (
    <section className="cx-mini" aria-label="Now playing">
      <div className="cx-progress">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <div className="cx-mini-bar">
        <button
          type="button"
          onClick={() => current && setExpanded((v) => !v)}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label={current ? (expanded ? "Hide playing details" : "Show playing details") : "Not playing"}
        >
          <span
            className="relative h-12 w-12 shrink-0 overflow-hidden"
            style={{ borderRadius: 6, backgroundColor: current?.tint ?? "var(--paper-sunken)" }}
          >
            {current?.artworkUrl &&
              (current.foundVia ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.artworkUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <Image src={current.artworkUrl} alt="" fill sizes="48px" style={{ objectFit: "cover" }} />
              ))}
          </span>
          <span className="min-w-0">
            <span className="cx-truncate block text-[13px] font-semibold leading-tight">
              {current?.title ?? "Not Playing"}
            </span>
            <span className="cx-truncate block text-[12px] leading-tight text-[var(--ink-3)]">
              {current?.artist ?? "Choose a song to start"}
            </span>
            {current && (
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
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={toggle}
          className="cx-icon-button"
          data-solid="true"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!current || loading}
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
            disabled={!current}
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
            disabled={!current}
          />
        </div>
      </div>

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
      {playing && listenVia === "soundcloud" && sc && current?.openUrl && (
        <iframe
          className="cx-embed"
          title="SoundCloud"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(current.openUrl)}&auto_play=true&hide_related=true&show_comments=false&visual=false`}
          allow="autoplay"
        />
      )}

      {expanded && current && (
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
              : "Turn the volume up when a voice is at its most exposed — that’s the signal we listen for."}
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
                  className={`cx-pill h-8 px-2.5 ${destination === region.id ? "cx-pill-dark" : "cx-pill-ghost"}`}
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
                <p className="text-[13px] font-semibold leading-tight">
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
                  className="cx-pill cx-pill-ghost h-8 shrink-0 px-3"
                >
                  {via ? `Open on ${via}` : "Play the full track"}
                </a>
              )}
              {(current.videoUrl || yt) && (
                <a
                  href={current.videoUrl || `https://www.youtube.com/watch?v=${yt}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cx-pill cx-pill-ghost h-8 shrink-0 px-3"
                >
                  Official video
                </a>
              )}
              <button type="button" onClick={stop} className="cx-pill cx-pill-ghost h-8 shrink-0 px-3">
                Stop
              </button>
            </div>
          </div>

          {error && (
            <p className="cx-meta mt-2">
              {error}
            </p>
          )}
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
