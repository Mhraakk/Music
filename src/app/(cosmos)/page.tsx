/**
 * LISTEN NOW — server-rendered shelves, client island for search and playback.
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
    <main className="cx-page">
      <p className="sr-only">Favorite Songs. Connect Apple Music.</p>
      <header className="cx-page-head">
        <div>
          <h1 className="cx-display">Listen Now</h1>
          <p className="cx-body mt-2 max-w-[46ch]">
            Music by feeling — songs, albums, artists and stations. No genres, no charts.
          </p>
        </div>
      </header>

      <DiscoverSurface
        topPicks={topPicks}
        newMusic={newMusic}
        stations={shelves.map(({ tracks: _tracks, ...shelf }) => shelf)}
        artists={profiles.map(({ slug, name, covers, tint }) => ({ slug, name, covers, tint }))}
        catalogTotal={stats.admitted}
      />
    </main>
  );
}
