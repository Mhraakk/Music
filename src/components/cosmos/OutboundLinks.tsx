import type { LibraryTrack } from "@/lib/library";
import type { AtlasOutbound } from "@/lib/everynoise/types";

export type OutboundSource = {
  apple?: string | null;
  appleArtist?: string | null;
  spotify?: string | null;
  spotifyArtist?: string | null;
  youtubeMusic?: string | null;
  soundcloud?: string | null;
  netease?: string | null;
  qqMusic?: string | null;
  kugou?: string | null;
  kuwo?: string | null;
};

const LINKS: { key: keyof OutboundSource; label: string }[] = [
  { key: "apple", label: "Apple Music" },
  { key: "spotify", label: "Spotify" },
  { key: "youtubeMusic", label: "YouTube Music" },
  { key: "soundcloud", label: "SoundCloud" },
  { key: "netease", label: "NetEase" },
  { key: "qqMusic", label: "QQ Music" },
  { key: "kugou", label: "KuGou" },
  { key: "kuwo", label: "Kuwo" },
];

const ARTIST_LINKS: { key: keyof OutboundSource; label: string }[] = [
  { key: "appleArtist", label: "Apple Music" },
  { key: "spotifyArtist", label: "Spotify" },
  { key: "youtubeMusic", label: "YouTube Music" },
  { key: "soundcloud", label: "SoundCloud" },
];

export function outboundFromTrack(track: LibraryTrack): OutboundSource {
  return {
    apple: track.appleUrl ?? track.openUrl,
    spotify: track.spotifyUrl,
    youtubeMusic: track.youtubeMusicUrl,
    soundcloud: track.soundcloudUrl,
    netease: track.metingPlatform === "netease" ? track.metingUrl : null,
    qqMusic: track.metingPlatform === "tencent" ? track.metingUrl : null,
    kugou: track.metingPlatform === "kugou" ? track.metingUrl : null,
    kuwo: track.metingPlatform === "kuwo" ? track.metingUrl : null,
  };
}

export function outboundFromAtlas(links: AtlasOutbound): OutboundSource {
  return {
    apple: links.apple,
    appleArtist: links.appleArtist,
    spotify: links.spotify,
    spotifyArtist: links.spotifyArtist,
    youtubeMusic: links.youtubeMusic,
    soundcloud: links.soundcloud,
  };
}

export function OutboundLinks({
  links,
  artist,
}: {
  links: OutboundSource;
  artist?: boolean;
}) {
  const items = (artist ? ARTIST_LINKS : LINKS).filter((item) => links[item.key]);
  if (!items.length) return null;
  return (
    <nav className="cx-outbound" aria-label={artist ? "Open this artist" : "Open this recording"}>
      {items.map((item) => (
        <a
          key={item.key}
          href={links[item.key] ?? "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="cx-outbound-link"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
