"use client";

import { useState } from "react";
import type { LibraryTrack } from "@/lib/library";
import { durationLabel, type ListenMinutes } from "@/lib/listen/duration";
import { usePlayerActions } from "@/context/PlayerContext";
import { DurationChips } from "./AtlasPlay";

type Harvest = {
  ok: boolean;
  url: string;
  publicPreview: boolean;
  tracks: LibraryTrack[];
  hints: string[];
  note?: string;
  count: number;
};

export function WheatSurface() {
  const { ingest, playQueue } = usePlayerActions();
  const [minutes, setMinutes] = useState<ListenMinutes>(30);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function harvest(text?: string) {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/wheat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text?.trim() || undefined, durationMinutes: minutes }),
      });
      const payload = (await response.json()) as Harvest;
      if (payload.tracks?.length) {
        ingest(payload.tracks);
        playQueue(payload.tracks, "wheat1");
        setNote(`${payload.tracks.length} recordings from wheat1 · ${durationLabel(minutes)}`);
        return;
      }
      setNote(
        payload.publicPreview
          ? "The channel is quiet right now."
          : payload.note ?? "Paste a wheat1 caption, then play. The public preview is closed."
      );
    } catch {
      setNote("Could not reach wheat1 just now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cx-section">
      <div className="cx-section-head">
        <h2 className="cx-title">
          From <em>wheat1.</em>
        </h2>
      </div>
      <p className="cx-body">
        The Telegram channel at t.me/wheat1. Paste a post and Resonant finds the same recordings on Apple Music.
        The engine keeps listening after the set ends. No skip.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DurationChips value={minutes} onChange={setMinutes} />
        <a href="https://t.me/wheat1" target="_blank" rel="noreferrer noopener" className="cx-pill cx-pill-ghost">
          Open wheat1
        </a>
      </div>
      <textarea
        className="cx-wheat-paste mt-4"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Paste a wheat1 caption. Artist – title, or a list."
        aria-label="wheat1 caption"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="cx-pill cx-pill-primary"
          disabled={busy}
          onClick={() => void harvest(draft)}
        >
          {busy ? "Finding…" : draft.trim() ? `Play this post · ${durationLabel(minutes)}` : `Try public posts · ${durationLabel(minutes)}`}
        </button>
      </div>
      {note && <p className="cx-meta mt-3">{note}</p>}
    </section>
  );
}
