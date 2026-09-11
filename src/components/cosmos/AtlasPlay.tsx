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

  async function play() {
    setBusy(true);
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
      const payload = (await response.json()) as { tracks?: LibraryTrack[]; title?: string };
      const tracks = payload.tracks?.length ? payload.tracks : fallbackTracks;
      if (!tracks.length) return;
      ingest(tracks);
      playQueue(tracks, payload.title ?? title);
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
    </div>
  );
}
