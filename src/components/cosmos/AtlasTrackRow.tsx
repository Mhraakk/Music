"use client";

import type { LibraryTrack } from "@/lib/library";
import type { AtlasTrackCard } from "@/lib/everynoise/types";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { OutboundLinks, outboundFromAtlas, outboundFromTrack } from "./OutboundLinks";
import { LoveControl } from "./LoveControl";
import { DislikeControl } from "./DislikeControl";

export function AtlasTrackRow({
  card,
  track,
}: {
  card: AtlasTrackCard;
  track?: LibraryTrack | null;
}) {
  const { current, playing } = usePlayer();
  const { play, ingest } = usePlayerActions();
  const active = Boolean(track && current?.id === track.id && playing);

  const onPlay = () => {
    if (!track) return;
    ingest([track]);
    play(track, { keepQueue: true });
  };

  return (
    <article className={`cx-atlas-row${active ? " is-active" : ""}`}>
      <div className="cx-atlas-row-line">
        <button type="button" className="cx-atlas-row-main" onClick={onPlay} disabled={!track}>
          <span className="cx-atlas-art" aria-hidden>
            {card.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.artworkUrl} alt="" />
            ) : (
              <span className="cx-atlas-art-empty" />
            )}
          </span>
          <span className="min-w-0 text-left">
            <span className="cx-atlas-row-title">{card.title}</span>
            <span className="cx-atlas-row-artist">{card.artist}</span>
          </span>
          <span className="cx-atlas-play-label">{track ? (active ? "Listening" : "Play") : "Open"}</span>
        </button>
          {track ? (
            <div className="cx-atlas-row-actions">
              <LoveControl track={track} />
              <DislikeControl track={track} />
            </div>
          ) : null}
      </div>
      <OutboundLinks links={track ? outboundFromTrack(track) : outboundFromAtlas(card.outbound)} />
    </article>
  );
}
