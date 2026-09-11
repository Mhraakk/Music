"use client";

import Link from "next/link";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { coordinate } from "@/lib/drift/topography";
import { TasteExpand } from "./TasteExpand";

export function SessionMind() {
  const { current, destination, cognition, reading, historyIds, fromEngine, tasteNote } = usePlayer();
  const { synced } = useLibrary();
  const dest = coordinate(destination);

  return (
    <section className="cx-section">
      <div className="cx-section-head">
        <h2 className="cx-title">
          Made for <em>You.</em>
        </h2>
        <p className="cx-body">The engine keeps drifting from how you listen. There is no skip.</p>
        <Link href="/radio" className="cx-see-all">
          Open Radio
        </Link>
      </div>

      <div className="cx-callout">
        <p className="cx-heading">
          {current
            ? fromEngine
              ? `Drifting toward ${dest?.label ?? destination}`
              : `Playing ${current.title} · heading for ${dest?.label ?? destination}`
            : "Pick a song. Resonant will keep drifting from how you listen."}
        </p>
        <p className="cx-meta mt-2">
          {tasteNote
            ? tasteNote
            : synced
            ? `Favorite Songs in circulation · ${synced.toLocaleString()} loved tracks.`
            : cognition
              ? cognition.source === "gemini-mcp"
                ? "Chosen for you · verified"
                : cognition.note
              : "No genres, no charts, no next button. Just the next right song."}
          {reading ? ` · ${reading.mode === "deepen" ? "leaning in" : reading.mode === "prune" ? "moving on" : "exploring"}` : ""}
          {historyIds.length ? ` · ${historyIds.length} played` : ""}
        </p>
        <div className="mt-4">
          <TasteExpand />
        </div>
      </div>
    </section>
  );
}
