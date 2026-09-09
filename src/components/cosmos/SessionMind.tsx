"use client";

/**
 * SESSION MIND
 *
 * The engine's current read of the listener, on the discover surface rather
 * than buried in the drift lab. Cognition is the product; this is where it
 * speaks in public.
 */

import Link from "next/link";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { coordinate } from "@/lib/drift/topography";

export function SessionMind() {
  const { current, destination, cognition, reading, historyIds, fromEngine } = usePlayer();
  const { synced } = useLibrary();
  const dest = coordinate(destination);

  return (
    <div className="mb-5 rounded-2xl border border-[var(--hairline)] px-4 py-3">
      <p className="cx-meta">Cognitive engine</p>
      <p className="mt-1 text-[14px] font-medium leading-snug">
        {current
          ? fromEngine
            ? `Drifting toward ${dest?.label ?? destination}`
            : `Starting from ${current.region.replace(/_/g, " ")} · heading for ${dest?.label ?? destination}`
          : "Waiting. Pick a sleeve — the engine will drift from there."}
      </p>
      <p className="cx-meta mt-1">
        {synced
          ? `Favorite Songs circulating · ${synced.toLocaleString()} loved positions in the substrate.`
          : cognition
            ? cognition.source === "gemini-mcp"
              ? "Gemini proposed · verified against the ontology"
              : cognition.note
            : "Deterministic local cognition. No genre, no chart, no next button."}
        {reading ? ` · ${reading.mode}` : ""}
        {historyIds.length ? ` · ${historyIds.length} heard` : ""}
        {" · "}
        <Link href="/drift" className="underline decoration-[var(--hairline-strong)] underline-offset-2 hover:text-[var(--ink)]">
          open the map
        </Link>
      </p>
    </div>
  );
}
