/**
 * LISTEN NOW — York editorial hero, then the shelves.
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
        <p className="cx-kicker">Resonant</p>
        <h1 className="cx-display">Listen Now</h1>
        <p className="cx-hero-lede">
          A broadsheet for listening. The atlas opens every electronic branch from Every Noise —
          then Apple Music, Spotify, YouTube Music, and SoundCloud for the same recording.
        </p>
        <div className="cx-hero-inserts" aria-hidden>
          {topPicks.slice(0, 3).map((track) => (
            <span key={track.id} className="cx-hero-insert">
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
