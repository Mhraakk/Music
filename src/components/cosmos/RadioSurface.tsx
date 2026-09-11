"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Collection } from "@/lib/library";
import type { LibraryTrack } from "@/lib/library";
import type { CoordinateId } from "@/lib/drift/topography";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { nextOpenRoom } from "@/lib/fresh/rotate";
import { songsLabel } from "@/lib/format";
import { Mosaic } from "./CollectionRail";
import { PlayIcon } from "./icons";

export type RadioStation = Omit<Collection, "tracks"> & { starter: LibraryTrack };

export function RadioSurface({ stations }: { stations: RadioStation[] }) {
  const { play, playQueue, ingest, setDestination } = usePlayerActions();
  const { dislikedIds, refusedRooms } = usePlayer();
  const [busyId, setBusyId] = useState<string | null>(null);
  const lastByStation = useRef<Record<string, string[]>>({});

  async function start(station: RadioStation) {
    const tapped = station.id as CoordinateId;
    const room = nextOpenRoom(tapped, new Set(refusedRooms));
    setDestination(room);
    setBusyId(station.id);
    const seed = Date.now();
    const exclude = [...new Set([...(lastByStation.current[station.id] ?? []), ...dislikedIds])];
    try {
      const params = new URLSearchParams({
        room,
        seed: String(seed),
        limit: "5",
      });
      if (exclude.length) params.set("exclude", exclude.join(","));
      const response = await fetch(`/api/discover/fresh?${params}`);
      const payload = (await response.json()) as { tracks?: LibraryTrack[] };
      const tracks = (payload.tracks ?? []).filter((track) => !dislikedIds.includes(track.id));
      if (tracks.length) {
        lastByStation.current[station.id] = tracks.map((track) => track.id);
        ingest(tracks);
        playQueue(tracks, room === tapped ? station.title : `${station.title} · elsewhere`);
        return;
      }
    } catch {
      /* shelf starter still honours the tap */
    } finally {
      setBusyId(null);
    }
    if (dislikedIds.includes(station.starter.id) || refusedRooms.includes(tapped)) return;
    play(station.starter);
  }

  return (
    <div className="cx-browse-grid">
      {stations.map((station) => {
        const refused = refusedRooms.includes(station.id as CoordinateId);
        return (
          <article key={station.id} className="cx-browse-card">
            <button
              type="button"
              className="relative w-full text-left"
              onClick={() => void start(station)}
              aria-label={refused ? `Play near ${station.title}` : `Play ${station.title}`}
              disabled={busyId === station.id}
            >
              <Mosaic covers={station.covers} tint={station.tint} sizes="280px" />
              <span className="cx-play-fab" style={{ opacity: 1, transform: "none" }} aria-hidden>
                <PlayIcon size={16} />
              </span>
            </button>
            <div className="mt-3">
              <h2 className="cx-heading">{station.title}</h2>
              <p className="cx-meta mt-1">
                Station ·{" "}
                {busyId === station.id
                  ? "Harvesting Apple Music…"
                  : refused
                    ? "Mood refused · next tap walks elsewhere"
                    : songsLabel(station.count)}
              </p>
              <p className="cx-body mt-2">{station.description}</p>
              <Link href={`/collection/${station.id}`} className="cx-see-all mt-2 inline-block">
                Open playlist
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
