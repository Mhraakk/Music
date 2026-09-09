/**
 * LISTEN NOW — iridescent editorial hero, then quiet paper shelves.
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
        <div className="cx-scroll-badge" aria-hidden>
          <svg viewBox="0 0 100 100">
            <defs>
              <path id="cx-scroll-path" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
            </defs>
            <text>
              <textPath href="#cx-scroll-path">SCROLL DOWN · SCROLL DOWN · </textPath>
            </text>
          </svg>
        </div>
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
