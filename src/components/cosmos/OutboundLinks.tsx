import type { LibraryTrack } from "@/lib/library";
import type { AtlasOutbound } from "@/lib/everynoise/types";
import { isSearchUrl } from "@/lib/everynoise/types";

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

const RECORDING_KEYS: { key: keyof OutboundSource; label: string }[] = [
  { key: "apple", label: "Apple Music" },
  { key: "spotify", label: "Spotify" },
  { key: "youtubeMusic", label: "YouTube Music" },
  { key: "soundcloud", label: "SoundCloud" },
];

const ARTIST_KEYS: { key: keyof OutboundSource; label: string }[] = [
  { key: "appleArtist", label: "Apple Music" },
  { key: "spotifyArtist", label: "Spotify" },
];

const CATALOG_KEYS: { key: keyof OutboundSource; label: string }[] = [
  { key: "netease", label: "NetEase" },
  { key: "qqMusic", label: "QQ Music" },
  { key: "kugou", label: "KuGou" },
  { key: "kuwo", label: "Kuwo" },
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

function visible(
  links: OutboundSource,
  keys: { key: keyof OutboundSource; label: string }[]
): { key: string; label: string; href: string }[] {
  const out: { key: string; label: string; href: string }[] = [];
  for (const item of keys) {
    const href = links[item.key];
    if (!href) continue;
    out.push({
      key: item.key,
      href,
      label: isSearchUrl(href) ? `${item.label} search` : item.label,
    });
  }
  return out;
}

function LinkRow({
  label,
  items,
}: {
  label?: string;
  items: { key: string; label: string; href: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="cx-outbound-row">
      {label ? <span className="cx-outbound-kicker">{label}</span> : null}
      <nav className="cx-outbound" aria-label={label ?? "Open this recording"}>
        {items.map((item) => (
          <a key={item.key} href={item.href} target="_blank" rel="noreferrer noopener" className="cx-outbound-link">
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

export function OutboundLinks({
  links,
  artist,
  layout,
}: {
  links: OutboundSource;
  artist?: boolean;
  layout?: "flat" | "atlas";
}) {
  if (layout === "atlas" || artist) {
    const recording = visible(links, RECORDING_KEYS);
    const people = visible(links, ARTIST_KEYS);
    if (artist) {
      return <LinkRow label="Artist" items={people.length ? people : recording} />;
    }
    if (!recording.length && !people.length) return null;
    return (
      <div className="cx-outbound-stack">
        <LinkRow label="Recording" items={recording} />
        <LinkRow label="Artist" items={people} />
      </div>
    );
  }

  const items = visible(links, [...RECORDING_KEYS, ...CATALOG_KEYS]);
  if (!items.length) return null;
  return <LinkRow items={items} />;
}
