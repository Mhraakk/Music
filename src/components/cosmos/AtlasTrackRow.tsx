"use client";

import { useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import type { AtlasTrackCard } from "@/lib/everynoise/types";
import { useNowPlaying, usePlayerActions } from "@/context/PlayerContext";
import { OutboundLinks, outboundFromAtlas, outboundFromTrack, pickOutbound } from "./OutboundLinks";
import { Artwork } from "./Artwork";
import { LoveControl } from "./LoveControl";
import { DislikeControl } from "./DislikeControl";

export function AtlasTrackRow({
  card,
  track,
}: {
  card: AtlasTrackCard;
  track?: LibraryTrack | null;
}) {
  const { currentId, playing } = useNowPlaying();
  const { play, ingest } = usePlayerActions();
  const [resolved, setResolved] = useState<LibraryTrack | null>(track ?? null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const playable = resolved ?? track ?? null;
  const active = Boolean(playable && currentId === playable.id && playing);

  const onPlay = () => {
    void (async () => {
      let next = playable;
      if (!next) {
        setBusy(true);
        setNote(null);
        try {
          const response = await fetch("/api/atlas/resolve", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              artist: card.artist,
              title: card.title,
              previewUrl: card.previewUrl,
              spotifyTrackId: card.outbound.spotify?.match(/spotify\.com\/track\/([A-Za-z0-9]+)/)?.[1] ?? null,
            }),
          });
          const payload = (await response.json()) as { track?: LibraryTrack | null; error?: string };
          next = payload.track ?? null;
          if (next) setResolved(next);
          else setNote(payload.error ?? "Could not resolve this recording.");
        } catch {
          setNote("Could not resolve this recording.");
        } finally {
          setBusy(false);
        }
      }
      if (!next) return;
      ingest([next]);
      play(next, { keepQueue: true });
    })();
  };

  return (
    <article className={`cx-atlas-row${active ? " is-active" : ""}`}>
      <div className="cx-atlas-row-line">
        <button type="button" className="cx-atlas-row-main" onClick={onPlay} disabled={busy}>
          <span className="cx-atlas-art" aria-hidden>
            {card.artworkUrl ? (
              <Artwork src={card.artworkUrl} sizes="56px" />
            ) : (
              <span className="cx-atlas-art-empty" />
            )}
          </span>
          <span className="min-w-0 text-left">
            <span className="cx-atlas-row-title">{card.title}</span>
            <span className="cx-atlas-row-artist">{card.artist}</span>
          </span>
          <span className="cx-atlas-play-label">
            {busy ? "Finding…" : playable ? (active ? "Listening" : "Play") : "Play"}
          </span>
        </button>
          {playable ? (
            <div className="cx-atlas-row-actions">
              <LoveControl track={playable} />
              <DislikeControl track={playable} />
            </div>
          ) : null}
      </div>
      {note ? <p className="cx-meta">{note}</p> : null}
      <OutboundLinks
        links={
          playable
            ? pickOutbound(outboundFromTrack(playable), outboundFromAtlas(card.outbound))
            : outboundFromAtlas(card.outbound)
        }
        layout="atlas"
        artistName={card.artist}
        title={card.title}
      />
    </article>
  );
}
