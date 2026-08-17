"use client";

import { journeyGps } from "@/lib/taste/gps";
import type { Compass } from "@/lib/engine";
import type { Track } from "@/lib/tracks";

type Props = { compass: Compass; path: Track[] };

export function MusicalGps({ compass, path }: Props) {
  const gps = journeyGps(path, compass);
  const x = gps.here.x * 100;
  const y = gps.here.y * 100;
  return (
    <div className="glass-2 glass-edge rounded-2xl p-3.5 space-y-2">
      <div className="flex justify-between items-baseline">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e8a06a]/90">Musical GPS</p>
        <p className="text-[10px] text-white/35">T {Math.round(gps.temperature * 100)}%</p>
      </div>
      <p className="text-sm text-[#f0ebe3]">You are near: <span className="text-[#e8a06a]">{gps.here.label}</span></p>
      <p className="text-[12px] text-white/45">Heading: {gps.heading}</p>
      {gps.path.length > 0 && (
        <p className="text-[11px] text-white/35">Landing toward: {gps.destinationHint}</p>
      )}
      <div className="relative h-24 rounded-xl bg-black/40 border border-white/8 overflow-hidden mt-1">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage:
            "linear-gradient(to right, transparent 49.5%, rgba(255,255,255,0.15) 50%, transparent 50.5%), linear-gradient(to bottom, transparent 49.5%, rgba(255,255,255,0.15) 50%, transparent 50.5%)",
        }} />
        <span className="absolute left-1 top-1 text-[8px] text-white/25">still</span>
        <span className="absolute right-1 bottom-1 text-[8px] text-white/25">pulse</span>
        <span className="absolute left-1 bottom-1 text-[8px] text-white/25">warm</span>
        <span className="absolute right-1 top-1 text-[8px] text-white/25">nocturnal</span>
        {gps.path.map((pt, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-white/25" style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%`, transform: "translate(-50%,-50%)" }} />
        ))}
        <div className="absolute w-3 h-3 rounded-full bg-[#e8a06a] shadow-[0_0_12px_rgba(232,160,106,0.8)]" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }} />
      </div>
    </div>
  );
}
