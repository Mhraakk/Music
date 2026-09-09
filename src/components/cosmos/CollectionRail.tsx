import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/lib/library";
import { songsLabel } from "@/lib/format";

export function CollectionRail({ collections }: { collections: Omit<Collection, "tracks">[] }) {
  return (
    <div className="cx-rail">
      {collections.map((collection) => (
        <Link key={collection.id} href={`/collection/${collection.id}`} className="cx-station">
          <Mosaic covers={collection.covers} tint={collection.tint} />
          <p className="cx-album-title mt-2 cx-truncate">{collection.title}</p>
          <p className="cx-album-sub cx-truncate">Station · {songsLabel(collection.count)}</p>
        </Link>
      ))}
    </div>
  );
}

export function Mosaic({
  covers,
  tint,
  sizes = "98px",
}: {
  covers: { id: string; artworkUrl: string | null; tint: string }[];
  tint: string;
  sizes?: string;
}) {
  return (
    <div className="cx-mosaic" style={{ backgroundColor: tint }}>
      {covers.map((track) => (
        <div key={track.id} className="relative overflow-hidden" style={{ backgroundColor: track.tint }}>
          {track.artworkUrl && (
            <Image src={track.artworkUrl} alt="" fill sizes={sizes} style={{ objectFit: "cover" }} />
          )}
        </div>
      ))}
      {Array.from({ length: Math.max(0, 4 - covers.length) }).map((_, i) => (
        <div key={`pad-${i}`} style={{ backgroundColor: tint }} />
      ))}
    </div>
  );
}
