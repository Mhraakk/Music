import type { LibraryTrack } from "@/lib/library";
import type { AtlasOutbound } from "@/lib/everynoise/types";
import { isSearchUrl, searchUrls } from "@/lib/everynoise/types";
import { metingSearchUrl } from "@/lib/meting/platforms";

export type OutboundSource = {
  apple?: string | null;
  appleArtist?: string | null;
  spotify?: string | null;
  spotifyArtist?: string | null;
  youtubeMusic?: string | null;
  youtubeMusicArtist?: string | null;
  soundcloud?: string | null;
  soundcloudArtist?: string | null;
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
  { key: "youtubeMusicArtist", label: "YouTube Music" },
  { key: "soundcloudArtist", label: "SoundCloud" },
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

const OUTBOUND_KEYS: (keyof OutboundSource)[] = [
  "apple",
  "appleArtist",
  "spotify",
  "spotifyArtist",
  "youtubeMusic",
  "youtubeMusicArtist",
  "soundcloud",
  "soundcloudArtist",
  "netease",
  "qqMusic",
  "kugou",
  "kuwo",
];

export function pickOutbound(...parts: OutboundSource[]): OutboundSource {
  const out: OutboundSource = {};
  for (const key of OUTBOUND_KEYS) {
    for (const part of parts) {
      const href = part[key];
      if (href) {
        out[key] = href;
        break;
      }
    }
  }
  return out;
}

function catalogSearch(query: string): Pick<OutboundSource, "netease" | "qqMusic" | "kugou" | "kuwo"> {
  return {
    netease: metingSearchUrl("netease", query),
    qqMusic: metingSearchUrl("tencent", query),
    kugou: metingSearchUrl("kugou", query),
    kuwo: metingSearchUrl("kuwo", query),
  };
}

function fillOutbound(links: OutboundSource, artist?: string, title?: string | null): OutboundSource {
  const person = artist?.trim() ?? "";
  const fallback = person ? searchUrls(person, title) : searchUrls("", null);
  const song = `${person} ${title ?? ""}`.replace(/\s+/g, " ").trim();
  const catalogs = song ? catalogSearch(song) : person ? catalogSearch(person) : {};
  return pickOutbound(links, fallback, {
    youtubeMusicArtist: person ? `https://music.youtube.com/search?q=${encodeURIComponent(person)}` : null,
    soundcloudArtist: person ? `https://soundcloud.com/search/people?q=${encodeURIComponent(person)}` : null,
    ...catalogs,
  });
}

function itemsFrom(
  links: OutboundSource,
  keys: { key: keyof OutboundSource; label: string }[]
): { key: string; label: string; href: string; search: boolean }[] {
  const out: { key: string; label: string; href: string; search: boolean }[] = [];
  for (const item of keys) {
    const href = links[item.key];
    if (!href) continue;
    out.push({
      key: item.key,
      href,
      label: item.label,
      search: isSearchUrl(href),
    });
  }
  return out;
}

function LinkRow({
  label,
  items,
}: {
  label?: string;
  items: { key: string; label: string; href: string; search: boolean }[];
}) {
  if (!items.length) return null;
  return (
    <div className="cx-outbound-row">
      {label ? <span className="cx-outbound-kicker">{label}</span> : null}
      <nav className="cx-outbound" aria-label={label ?? "Open this recording"}>
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noreferrer noopener"
            className="cx-outbound-link"
            title={item.search ? `${item.label} search` : `Open on ${item.label}`}
          >
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
  artistName,
  title,
}: {
  links: OutboundSource;
  artist?: boolean;
  layout?: "flat" | "atlas";
  artistName?: string;
  title?: string | null;
}) {
  if (layout === "atlas") {
    const filled = fillOutbound(links, artistName, title);
    const recording = itemsFrom(filled, RECORDING_KEYS);
    const people = itemsFrom(filled, ARTIST_KEYS);
    const catalogs = itemsFrom(filled, CATALOG_KEYS);
    if (artist) {
      return (
        <div className="cx-outbound-stack">
          <LinkRow label="Artist" items={people} />
          <LinkRow label="Catalog" items={catalogs} />
        </div>
      );
    }
    return (
      <div className="cx-outbound-stack">
        <LinkRow label="Recording" items={recording} />
        <LinkRow label="Artist" items={people} />
        <LinkRow label="Catalog" items={catalogs} />
      </div>
    );
  }

  const items = itemsFrom(links, [...RECORDING_KEYS, ...CATALOG_KEYS]);
  if (artist) {
    return <LinkRow label="Artist" items={itemsFrom(links, ARTIST_KEYS)} />;
  }
  if (!items.length) return null;
  return <LinkRow items={items} />;
}
