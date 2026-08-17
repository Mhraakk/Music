"use client";
import { useEffect } from "react";
import { usePlayer } from "@/store/player";
import { fmtTime } from "@/lib/tracks";
import { Artwork } from "./Artwork";

export function MiniPlayer() {
  const current = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.playing);
  const progress = usePlayer((s) => s.progress);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const tick = usePlayer((s) => s.tick);
  const expanded = usePlayer((s) => s.expanded);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [playing, tick]);

  if (!current || expanded) return null;

  const elapsed = Math.floor(progress * current.duration);

  return (
    <div className="fixed bottom-[4.5rem] inset-x-0 z-40 px-3 pointer-events-none">
      <div className="mx-auto max-w-lg pointer-events-auto">
        <div
          className="glass-3 glass-edge rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer"
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setExpanded(true)}
        >
          <Artwork track={current} size={48} rounded="rounded-lg" priority />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f3eee6] truncate">{current.title}</p>
            <p className="text-[11px] text-white/45 truncate">{current.artist}</p>
            <div className="mt-1.5 h-0.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8b5a2b] to-[#e8a06a] transition-[width] duration-1000 linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
              <span>{fmtTime(elapsed)}</span>
              <span>{fmtTime(current.duration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Previous" onClick={prev} className="pressable w-9 h-9 rounded-full glass-1 flex items-center justify-center text-white/70 text-sm">
              ‹‹
            </button>
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={toggle}
              className="pressable w-11 h-11 rounded-full bg-[#e8a06a]/90 text-[#1a0e08] flex items-center justify-center text-base font-semibold shadow-[0_0_24px_rgba(232,160,106,0.35)]"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button type="button" aria-label="Next" onClick={next} className="pressable w-9 h-9 rounded-full glass-1 flex items-center justify-center text-white/70 text-sm">
              ››
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
