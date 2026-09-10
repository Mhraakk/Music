"use client";

import { useEffect, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { durationLabel, type ListenMinutes } from "@/lib/listen/duration";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { SAMPLE_NIGHT } from "@/lib/wheat/parse";
import { DurationChips } from "./AtlasPlay";
import { Artwork } from "./Artwork";
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
  const { current, playing } = usePlayer();
  const [minutes, setMinutes] = useState<ListenMinutes>(30);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);

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
    try {
      const response = await fetch("/api/wheat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text?.trim() || undefined, durationMinutes: minutes }),
      });
      const payload = (await response.json()) as Harvest;
      if (payload.tracks?.length) {
        ingest(payload.tracks);
        persist(payload.tracks);
        if (autoplay) playQueue(payload.tracks, payload.title || "wheat1");
        setNote(`${payload.tracks.length} recordings · ${durationLabel(minutes)}`);
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
          if (Array.isArray(parsed) && parsed.length) {
            if (!cancelled) setTracks(parsed);
            return;
          }
        }
      } catch {
        /* empty cache */
      }
      setBusy(true);
      try {
        const publicHarvest = (await fetch("/api/wheat").then((r) => r.json())) as Harvest;
        if (cancelled) return;
        if (publicHarvest.tracks?.length) {
          persist(publicHarvest.tracks);
          setNote(`${publicHarvest.tracks.length} recordings from wheat1`);
          return;
        }
        const sample = (await fetch("/api/wheat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: SAMPLE_NIGHT, durationMinutes: 30 }),
        }).then((r) => r.json())) as Harvest;
        if (cancelled) return;
        if (sample.tracks?.length) {
          persist(sample.tracks);
          setNote(`${sample.tracks.length} recordings on the page. Paste wheat1 for the real channel.`);
        }
      } catch {
        if (!cancelled) setNote("Paste a wheat1 night. The recordings land here.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  function playFrom(index: number) {
    const slice = tracks.slice(index);
    if (!slice.length) return;
    ingest(tracks);
    playQueue(slice, "Tonight");
  }

  return (
    <section className="cx-section">
      <div className="cx-section-head">
        <h2 className="cx-title">
          Tonight, from <em>wheat1.</em>
        </h2>
      </div>
      <p className="cx-body">
        Paste a post, or a whole night of artist – title lines. Resonant finds the same recordings on
        Apple Music and puts them on this page. After the last one, the engine keeps walking. No skip.
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
              : `Try public posts · ${durationLabel(minutes)}`}
        </button>
        {tracks.length > 0 && (
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

      {tracks.length > 0 && (
        <div className="cx-atlas-tracks mt-6" aria-label="Tonight">
          {tracks.map((track, index) => {
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
                  <LoveControl track={track} />
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
