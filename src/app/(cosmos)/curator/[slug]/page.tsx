import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { curator, curators } from "@/lib/library";
import { CollectionSurface } from "@/components/cosmos/CollectionSurface";
import { PlayAll } from "@/components/cosmos/PlayAll";
import { songsLabel } from "@/lib/format";
import { BackGlyph } from "@/components/cosmos/icons";

export function generateStaticParams() {
  return curators().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = curator(slug);
  if (!profile) return { title: "Artist - Resonant" };
  return { title: `${profile.name} - Resonant`, description: profile.bio };
}

export default async function CuratorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = curator(slug);
  if (!profile) notFound();

  return (
    <main className="cx-page">
      <Link href="/curators" className="cx-icon-button mb-5" aria-label="Back to Artists">
        <BackGlyph />
      </Link>

      <header className="cx-playlist-hero">
        <div
          className="cx-playlist-art"
          style={{ borderRadius: 0, backgroundColor: profile.tint }}
        >
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[1px]">
            {profile.covers.map((track) => (
              <div key={track.id} className="relative" style={{ backgroundColor: track.tint }}>
                {track.artworkUrl && (
                  <Image src={track.artworkUrl} alt="" fill sizes="120px" style={{ objectFit: "cover" }} />
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - profile.covers.length) }).map((_, i) => (
              <div key={`pad-${i}`} style={{ backgroundColor: profile.tint }} />
            ))}
          </div>
        </div>

        <div className="min-w-0 pb-1">
          <p className="cx-meta">Artist</p>
          <h1 className="cx-display mt-2">{profile.name}</h1>
          <p className="cx-body mt-3 max-w-[46ch]">{profile.bio}</p>
          <p className="cx-meta mt-3">{songsLabel(profile.tracks.length)}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <PlayAll track={profile.tracks[0]} label="Play" />
            {profile.regions.slice(0, 4).map((region) => (
              <Link key={region} href={`/collection/${region}`} className="cx-pill cx-pill-ghost cx-pill-compact">
                <span className="cx-meta">{region.replace(/_/g, " ")}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <CollectionSurface tracks={profile.tracks.slice(0, 72)} />
    </main>
  );
}
