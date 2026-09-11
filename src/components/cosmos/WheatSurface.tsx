"use client";

import { useEffect, useRef, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { durationLabel, type ListenMinutes } from "@/lib/listen/duration";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { DurationChips } from "./AtlasPlay";
import { Artwork } from "./Artwork";
import { DislikeControl } from "./DislikeControl";
import { LoveControl } from "./LoveControl";
import { OutboundLinks, outboundFromTrack } from "./OutboundLinks";

const CACHE = "resonant-wheat-night";

type Harvest = {
  ok: boolean;
  url: string;
  publicPreview: boolean;
  tracks: LibraryTrack[];
  hints: string[];
  note?: string;
  count: number;
  title?: string;
};

export function WheatSurface() {
  const { ingest, playQueue } = usePlayerActions();
  const { current, playing, dislikedIds, refusedRooms } = usePlayer();
  const [minutes, setMinutes] = useState<ListenMinutes>(30);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const liveRef = useRef({ tracks, dislikedIds, refusedRooms });
  liveRef.current = { tracks, dislikedIds, refusedRooms };

  function persist(next: LibraryTrack[]) {
    setTracks(next);
    try {
      sessionStorage.setItem(CACHE, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }

  async function harvest(text: string | undefined, autoplay: boolean) {
    setBusy(true);
    setNote(null);
    const { tracks: currentTracks, dislikedIds: refusedIds, refusedRooms: rooms } = liveRef.current;
    const seed = Date.now();
    const exclude = [...new Set([...currentTracks.map((track) => track.id), ...refusedIds])];
    const excludeQueries = currentTracks.map((track) => `${track.artist} ${track.title}`);
    try {
      const response = await fetch("/api/wheat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text?.trim() || undefined,
          durationMinutes: minutes,
          limit: 5,
          seed,
          exclude,
          excludeQueries,
          refuseRooms: rooms,
        }),
      });
      const payload = (await response.json()) as Harvest;
      if (payload.tracks?.length) {
        const next = payload.tracks.filter((track) => !refusedIds.includes(track.id));
        ingest(next);
        persist(next);
        if (autoplay) playQueue(next, payload.title || "wheat1");
        setNote(`${next.length} new recordings · ${durationLabel(minutes)}`);
        return;
      }
      setNote(
        payload.publicPreview
          ? "The channel is quiet right now."
          : payload.note ?? "Paste a wheat1 night, then play. The public preview is closed."
      );
    } catch {
      setNote("Could not reach wheat1 just now.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const cached = sessionStorage.getItem(CACHE);
        if (cached) {
          const parsed = JSON.parse(cached) as LibraryTrack[];
          if (Array.isArray(parsed) && parsed.length && !cancelled) {
            setTracks(parsed);
            liveRef.current = { ...liveRef.current, tracks: parsed };
          }
        }
      } catch {
        /* empty cache */
      }
      if (!cancelled) await harvest(undefined, false);
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // First paint plus a live harvest. Later taps call harvest directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playFrom(index: number) {
    const visible = tracks.filter((track) => !dislikedIds.includes(track.id));
    const slice = visible.slice(index);
    if (!slice.length) return;
    ingest(visible);
    playQueue(slice, "Tonight");
  }

  const visible = tracks.filter((track) => !dislikedIds.includes(track.id));

  return (
    <section className="cx-section">
      <div className="cx-section-head">
        <h2 className="cx-title">
          Tonight, from <em>wheat1.</em>
        </h2>
      </div>
      <p className="cx-body">
        Five recordings each tap, not the same five. Paste a post, or refresh for a new night.
        After the last one, the engine keeps walking. No skip.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DurationChips value={minutes} onChange={setMinutes} />
        <a href="https://t.me/wheat1" target="_blank" rel="noreferrer noopener" className="cx-pill cx-pill-ghost">
          Open wheat1
        </a>
      </div>
      <textarea
        className="cx-wheat-paste mt-4"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={"Paste a wheat1 night:\nArtist – title\nArtist – title"}
        aria-label="wheat1 night"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="cx-pill cx-pill-primary"
          disabled={busy}
          onClick={() => void harvest(draft, true)}
        >
          {busy
            ? "Finding…"
            : draft.trim()
              ? `Play this night · ${durationLabel(minutes)}`
              : `New night · ${durationLabel(minutes)}`}
        </button>
        <button
          type="button"
          className="cx-pill cx-pill-ghost"
          disabled={busy}
          onClick={() => void harvest(undefined, false)}
        >
          {busy ? "Finding…" : "Refresh tonight"}
        </button>
        {visible.length > 0 && (
          <button
            type="button"
            className="cx-pill cx-pill-ghost"
            disabled={busy}
            onClick={() => playFrom(0)}
          >
            Play from the top
          </button>
        )}
      </div>
      {note && <p className="cx-meta mt-3">{note}</p>}

      {visible.length > 0 && (
        <div className="cx-atlas-tracks mt-6" aria-label="Tonight">
          {visible.map((track, index) => {
            const active = current?.id === track.id && playing;
            return (
              <article key={track.id} className={`cx-atlas-row${active ? " is-active" : ""}`}>
                <div className="cx-atlas-row-line">
                  <button
                    type="button"
                    className="cx-atlas-row-main"
                    onClick={() => playFrom(index)}
                    aria-label={`Play ${track.title} by ${track.artist}`}
                  >
                    <span className="cx-atlas-art" aria-hidden>
                      <Artwork src={track.artworkUrl} sizes="56px" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="cx-atlas-row-title">{track.title}</span>
                      <span className="cx-atlas-row-artist">{track.artist}</span>
                    </span>
                    <span className="cx-atlas-play-label">{active ? "Listening" : "Play"}</span>
                  </button>
                  <div className="cx-atlas-row-actions">
                    <LoveControl track={track} />
                    <DislikeControl track={track} />
                  </div>
                </div>
                <OutboundLinks links={outboundFromTrack(track)} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
