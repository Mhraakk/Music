"use client";

import { usePlayer } from "@/store/player";
import { Artwork } from "./Artwork";

export function OrbPlayer() {
  const current = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.playing);
  const stage = usePlayer((s) => s.stage);
  const toggle = usePlayer((s) => s.toggle);
  const setStage = usePlayer((s) => s.setStage);
  if (!current || stage !== "orb") return null;
  return (
    <div className="fixed bottom-[5.25rem] right-4 z-40 pointer-events-auto">
      <button type="button" className="relative pressable h-14 w-14 rounded-full overflow-hidden" style={{
        boxShadow: `0 12px 40px rgba(0,0,0,0.55), 0 0 28px rgba(${current.ambient}, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)`,
      }} onClick={() => setStage("bar")} onContextMenu={(e) => { e.preventDefault(); toggle(); }} aria-label="Expand player">
        <Artwork track={current} size={56} rounded="rounded-full" priority />
        <span className="absolute inset-0 rounded-full ring-1 ring-white/20" style={{
          background: playing ? `radial-gradient(circle at 30% 30%, rgba(${current.ambient}, 0.25), transparent 60%)` : undefined,
        }} />
        {!playing && <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white text-xs">▶</span>}
      </button>
    </div>
  );
}
