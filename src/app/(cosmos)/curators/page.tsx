import Image from "next/image";
import Link from "next/link";
import { curators } from "@/lib/library";
import { songsLabel } from "@/lib/format";

export const metadata = {
  title: "Artists — Resonant",
  description: "Artists Resonant is calibrated to — and the songs that sit closest to each.",
};

export default function ArtistsPage() {
  const profiles = curators();

  return (
    <main className="cx-page">
      <header className="cx-page-head">
        <div>
          <h1 className="cx-display">Artists</h1>
          <p className="cx-body mt-2 max-w-[52ch]">
            Seven reference artists. What you see under each name is the music that sits closest to
            them — not a follower count, not a pitch.
          </p>
        </div>
      </header>

      <div>
        {profiles.map((profile) => (
          <Link key={profile.slug} href={`/curator/${profile.slug}`} className="cx-artist-row">
            <span className="cx-avatar" style={{ backgroundColor: profile.tint }}>
              {profile.covers.map((track) => (
                <span key={track.id} className="relative block" style={{ backgroundColor: track.tint }}>
                  {track.artworkUrl && (
                    <Image src={track.artworkUrl} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
                  )}
                </span>
              ))}
              {Array.from({ length: Math.max(0, 4 - profile.covers.length) }).map((_, i) => (
                <span key={`pad-${i}`} style={{ backgroundColor: profile.tint }} />
              ))}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold leading-tight">{profile.name}</span>
              <span className="cx-body mt-1 block cx-truncate">{profile.bio}</span>
              <span className="cx-meta mt-1 block">{songsLabel(profile.tracks.length)} · Artist</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
