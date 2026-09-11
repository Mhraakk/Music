"use client";

import { useMemo, useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayer, usePlayerActions, useTaste } from "@/context/PlayerContext";
import { cachedTaste } from "@/lib/taste/memory";
import { rankJoyful } from "@/lib/taste/joyful";
import { Artwork } from "./Artwork";
import { LoveControl } from "./LoveControl";
import { DislikeControl } from "./DislikeControl";
import { OutboundLinks, outboundFromTrack } from "./OutboundLinks";
import Link from "next/link";

export function JoyfulSurface({
  seeds,
  compact = false,
}: {
  seeds: LibraryTrack[];
  compact?: boolean;
}) {
  const { extras, dislikedIds } = usePlayer();
  const { circulating } = useLibrary();
  const { likedIds, tasteNote } = useTaste();
  const { playQueue, ingest } = usePlayerActions();
  const [arrived, setArrived] = useState<LibraryTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const golds = useMemo(() => {
    const memory = cachedTaste();
    const pool = [...arrived, ...extras, ...circulating, ...seeds];
    const seen = new Set<string>();
    const unique: LibraryTrack[] = [];
    for (const track of pool) {
      if (seen.has(track.id) || dislikedIds.includes(track.id)) continue;
      seen.add(track.id);
      unique.push(track);
    }
    return rankJoyful(unique, {
      memory,
      excludeIds: dislikedIds,
      limit: compact ? 8 : 12,
    });
  }, [arrived, extras, circulating, seeds, dislikedIds, likedIds, tasteNote]);

  async function moreGold() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const exclude = [...new Set([...golds.map((t) => t.id), ...dislikedIds])];
      const params = new URLSearchParams({
        seed: String(Date.now()),
        limit: compact ? "8" : "12",
      });
      if (exclude.length) params.set("exclude", exclude.join(","));
      const response = await fetch(`/api/discover/joyful?${params}`);
      const payload = (await response.json()) as { ok?: boolean; tracks?: LibraryTrack[]; error?: string };
      const tracks = (payload.tracks ?? []).filter((track) => !dislikedIds.includes(track.id));
      if (!tracks.length) {
        setNote(payload.error || "Apple Music did not return new gold just now.");
        return;
      }
      ingest(tracks);
      setArrived(tracks);
      setNote(`Little golds from Apple Music · ${tracks.length} recordings`);
    } catch {
      setNote("Joyful could not reach Apple Music.");
    } finally {
      setBusy(false);
    }
  }

  function playGold() {
    if (!golds.length) return;
    playQueue(golds, "Joyful.");
  }

  return (
    <section className="cx-section cx-joyful">
      <div className="cx-section-head">
        <h2 className="cx-title">
          {compact ? (
            <>
              Joyful <em>golds.</em>
            </>
          ) : (
            <>
              Little <em>golds.</em>
            </>
          )}
        </h2>
        <p className="cx-body">
          Morning light, analog heat, dusted soul — not a festival, not a tenth room. Heart a recording and the gold
          leans toward you. Refuse one and that heat walks away. No skip.
        </p>
        {compact ? (
          <Link href="/joyful" className="cx-see-all">
            Open Joyful
          </Link>
        ) : null}
      </div>

      <div className="cx-joyful-actions">
        <button type="button" className="cx-pill cx-pill-primary" onClick={playGold} disabled={!golds.length}>
          Play this gold
        </button>
        <button type="button" className="cx-pill cx-pill-ghost" onClick={() => void moreGold()} disabled={busy}>
          {busy ? "Gathering…" : "More gold from Apple"}
        </button>
      </div>
      {tasteNote ? <p className="cx-meta mt-3">{tasteNote}</p> : null}
      {note ? <p className="cx-meta mt-3">{note}</p> : null}

      {golds.length > 0 ? (
        <div className="cx-atlas-tracks mt-6" aria-label="Joyful golds">
          {golds.map((track, index) => (
            <article key={track.id} className="cx-atlas-row">
              <div className="cx-atlas-row-line">
                <button
                  type="button"
                  className="cx-atlas-row-main"
                  onClick={() => playQueue(golds.slice(index), "Joyful.")}
                  aria-label={`Play ${track.title} by ${track.artist}`}
                >
                  <span className="cx-atlas-art" aria-hidden>
                    <Artwork src={track.artworkUrl} sizes="56px" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="cx-atlas-row-title">{track.title}</span>
                    <span className="cx-atlas-row-artist">{track.artist}</span>
                  </span>
                  <span className="cx-atlas-play-label">{index === 0 ? "Lead gold" : "Play"}</span>
                </button>
                <div className="cx-atlas-row-actions">
                  <LoveControl track={track} />
                  <DislikeControl track={track} />
                </div>
              </div>
              <OutboundLinks links={outboundFromTrack(track)} />
            </article>
          ))}
        </div>
      ) : (
        <p className="cx-meta mt-4">Heart something warm, or gather gold from Apple.</p>
      )}
    </section>
  );
}
