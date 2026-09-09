import Link from "next/link";
import { collections } from "@/lib/library";
import { songsLabel } from "@/lib/format";
import { Mosaic } from "@/components/cosmos/CollectionRail";

export const metadata = {
  title: "Browse - Resonant",
  description: "Stations and playlists, grouped by feeling rather than genre.",
};

export default function BrowsePage() {
  const shelves = collections();

  return (
    <main className="cx-page">
      <header className="cx-section-head">
        <h1 className="cx-display">Browse</h1>
        <p className="cx-body">
          Stations by feeling. Neighbourhoods on the map, not a chart.
        </p>
      </header>

      <div className="cx-browse-grid">
        {shelves.map((shelf) => (
          <Link key={shelf.id} href={`/collection/${shelf.id}`} className="cx-browse-card">
            <Mosaic covers={shelf.covers} tint={shelf.tint} />
            <div className="mt-3">
              <h2 className="cx-heading">{shelf.title}</h2>
              <p className="cx-meta mt-1">Playlist · {songsLabel(shelf.count)}</p>
              <p className="cx-body mt-2">{shelf.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
