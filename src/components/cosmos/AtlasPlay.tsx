"use client";

import { useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import type { AtlasPlaylistKind } from "@/lib/everynoise/types";
import { LISTEN_MINUTES, durationLabel, type ListenMinutes } from "@/lib/listen/duration";
import { usePlayerActions } from "@/context/PlayerContext";

export function DurationChips({
  value,
  onChange,
}: {
  value: ListenMinutes;
  onChange: (value: ListenMinutes) => void;
}) {
  return (
    <div className="cx-duration" role="group" aria-label="Listening length">
      {LISTEN_MINUTES.map((minutes) => (
        <button
          key={minutes}
          type="button"
          className={`cx-pill cx-pill-compact ${value === minutes ? "cx-pill-dark" : "cx-pill-ghost"}`}
          aria-pressed={value === minutes}
          onClick={() => onChange(minutes)}
        >
          {durationLabel(minutes)}
        </button>
      ))}
    </div>
  );
}

export function AtlasPlay({
  artist,
  genre,
  query,
  playlist,
  playlistKind,
  fallbackTracks,
  title,
  label,
}: {
  artist?: string;
  genre?: string;
  query?: string;
  playlist?: string;
  playlistKind?: AtlasPlaylistKind;
  fallbackTracks: LibraryTrack[];
  title: string;
  label: string;
}) {
  const { ingest, playQueue } = usePlayerActions();
  const [minutes, setMinutes] = useState<ListenMinutes>(30);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function play() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/atlas/harvest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          artist,
          genre,
          query,
          playlist,
          playlistKind,
          durationMinutes: minutes,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        tracks?: LibraryTrack[];
        title?: string;
        error?: string;
      };
      const harvested = payload.tracks?.length ? payload.tracks : [];
      if (harvested.length) {
        ingest(harvested);
        playQueue(harvested, payload.title ?? title);
        return;
      }
      if (fallbackTracks.length) {
        setNote("Could not harvest this branch — playing what we already have.");
        ingest(fallbackTracks);
        playQueue(fallbackTracks, title);
        return;
      }
      setNote(payload.error ?? "Could not harvest this branch just now.");
    } catch {
      if (fallbackTracks.length) {
        setNote("Could not harvest this branch — playing what we already have.");
        ingest(fallbackTracks);
        playQueue(fallbackTracks, title);
        return;
      }
      setNote("Could not harvest this branch just now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cx-atlas-play">
      <DurationChips value={minutes} onChange={setMinutes} />
      <button type="button" className="cx-pill cx-pill-primary" onClick={() => void play()} disabled={busy}>
        {busy ? "Gathering…" : `${label} · ${durationLabel(minutes)}`}
      </button>
      {note ? <p className="cx-meta">{note}</p> : null}
    </div>
  );
}
