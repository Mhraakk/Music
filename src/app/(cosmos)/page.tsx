/**
 * LISTEN NOW — atmospheric hero, then instrument-grade shelves.
 */

import { collections, curators, featured, libraryStats } from "@/lib/library";
import { DiscoverSurface } from "@/components/cosmos/DiscoverSurface";

export default function ListenNowPage() {
  const topPicks = featured(12);
  const newMusic = featured(12, 12);
  const shelves = collections();
  const profiles = curators();
  const stats = libraryStats();

  return (
    <>
      <section className="cx-hero">
        <p className="sr-only">Favorite Songs. Connect Apple Music.</p>
        <h1 className="cx-display">Listen Now</h1>
        <p className="cx-hero-tag">Music by feeling — songs, albums, artists and stations. No genres, no charts.</p>
      </section>
      <main className="cx-page">
        <DiscoverSurface
          topPicks={topPicks}
          newMusic={newMusic}
          stations={shelves.map(({ tracks: _tracks, ...shelf }) => shelf)}
          artists={profiles.map(({ slug, name, covers, tint }) => ({ slug, name, covers, tint }))}
          catalogTotal={stats.admitted}
        />
      </main>
    </>
  );
}
