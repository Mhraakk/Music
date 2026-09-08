/**
 * COLLECTION RAIL — SERVER COMPONENT
 *
 * A horizontal shelf of collections, each shown as a 2×2 mosaic of the sleeves
 * closest to that region's emotional centre.
 *
 * Server-rendered: collections are a pure function of the topography and the
 * media map, so there is nothing for the browser to compute and no reason to
 * ship a runtime for it.
 *
 * These are not playlists. A collection is a region of the emotional map, and
 * membership is by proximity to its centre — so a position can legitimately
 * appear in two neighbouring collections, which is true of the music.
 */

import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/lib/library";

export function CollectionRail({ collections }: { collections: Collection[] }) {
  return (
    <div className="cx-rail -mx-4 px-4 md:-mx-8 md:px-8">
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={`/collection/${collection.id}`}
          className="group block w-[168px] md:w-[196px]"
        >
          <div
            className="grid grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden"
            style={{
              borderRadius: "var(--r-card)",
              backgroundColor: collection.tint,
              aspectRatio: "1",
            }}
          >
            {collection.covers.map((track) => (
              <div key={track.id} className="relative overflow-hidden" style={{ backgroundColor: track.tint }}>
                {track.artworkUrl && (
                  <Image
                    src={track.artworkUrl}
                    alt=""
                    fill
                    sizes="98px"
                    style={{ objectFit: "cover" }}
                  />
                )}
              </div>
            ))}
            {/* A sparse region may have fewer than four covers; keep the mosaic square. */}
            {Array.from({ length: Math.max(0, 4 - collection.covers.length) }).map((_, i) => (
              <div key={`pad-${i}`} style={{ backgroundColor: collection.tint }} />
            ))}
          </div>

          <p className="cx-heading mt-2 cx-truncate">{collection.title}</p>
          <p className="cx-meta cx-truncate">{collection.count} positions</p>
        </Link>
      ))}
    </div>
  );
}
