"use client";

import Link from "next/link";
import type { Collection } from "@/lib/library";
import type { LibraryTrack } from "@/lib/library";
import type { CoordinateId } from "@/lib/drift/topography";
import { usePlayerActions } from "@/context/PlayerContext";
import { songsLabel } from "@/lib/format";
import { Mosaic } from "./CollectionRail";
import { PlayIcon } from "./icons";

export type RadioStation = Omit<Collection, "tracks"> & { starter: LibraryTrack };

export function RadioSurface({ stations }: { stations: RadioStation[] }) {
  const { play, setDestination } = usePlayerActions();

  function start(station: RadioStation) {
    setDestination(station.id as CoordinateId);
    play(station.starter);
  }

  return (
    <div className="cx-browse-grid">
      {stations.map((station) => (
        <article key={station.id} className="cx-browse-card">
          <button
            type="button"
            className="relative w-full text-left"
            onClick={() => start(station)}
            aria-label={`Play ${station.title}`}
          >
            <Mosaic covers={station.covers} tint={station.tint} sizes="280px" />
            <span className="cx-play-fab" style={{ opacity: 1, transform: "none" }} aria-hidden>
              <PlayIcon size={16} />
            </span>
          </button>
          <div className="mt-3">
            <h2 className="cx-heading">{station.title}</h2>
            <p className="cx-meta mt-1">Station · {songsLabel(station.count)}</p>
            <p className="cx-body mt-2">{station.description}</p>
            <Link href={`/collection/${station.id}`} className="cx-see-all mt-2 inline-block">
              Open playlist
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
