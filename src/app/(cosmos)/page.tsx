/**
 * LISTEN NOW — Epidemic liner notes, oxblood chapters.
 */

import Link from "next/link";
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
        <h1 className="cx-display">
          Listen <em>Now</em>
        </h1>
        <p className="cx-hero-lede">
          Every Noise branches, then the same recording on Apple Music, Spotify, YouTube Music, and SoundCloud.
        </p>
        <div className="cx-hero-inserts" aria-hidden>
          {topPicks.slice(0, 2).map((track, index) => (
            <span key={track.id} className="cx-hero-insert" data-size={index === 0 ? "wide" : "tall"}>
              {track.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.artworkUrl} alt="" />
              ) : null}
            </span>
          ))}
        </div>
        <Link href="/atlas" className="cx-pill cx-pill-primary">
          Open the atlas
        </Link>
      </section>

      <section className="cx-chapter">
        <div className="cx-chapter-inner">
          <h2 className="cx-title">Every branch.</h2>
          <p className="cx-body">
            Six thousand rooms from everynoise.com. Tap DJ Krush or trip hop and keep walking.
          </p>
          <Link href="/atlas" className="cx-see-all">
            Walk the map
          </Link>
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
