"use client";

/**
 * GENERATE TEN
 *
 * The living catalog's listener-facing move. Taste is a position, not a genre:
 * the button sends the session history to the expansion engine, which searches
 * Apple Music near the artists already occupying that neighbourhood and admits
 * ten new positions.
 */

import { useState } from "react";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { generateTasteExpansion } from "@/lib/mcp/client";

export function TasteExpand() {
  const { historyIds, extras, current, sessionId, tasteVectors } = usePlayer();
  const { ingest, play } = usePlayerActions();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);

    const outcome = await generateTasteExpansion({
      sessionId,
      history: historyIds.slice(-12),
      tasteVectors,
      exclude: extras.map((t) => t.id),
      limit: 10,
    });

    setBusy(false);

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }

    ingest(outcome.value.libraryTracks);
    setNote(outcome.value.note);

    const first = outcome.value.libraryTracks[0];
    if (first && !current) play(first);
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        className="cx-pill cx-pill-dark shrink-0 disabled:opacity-50"
        onClick={() => void generate()}
        disabled={busy}
      >
        {busy ? "Finding ten…" : "10 new near your taste"}
      </button>
      {note && <p className="cx-meta max-w-[42ch]">{note}</p>}
      {error && <p className="cx-meta max-w-[42ch] text-[#8c1b22]">{error}</p>}
    </div>
  );
}
