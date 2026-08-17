"use client";
import { useEffect } from "react";
import { usePlayer } from "@/store/player";
import { fmtTime } from "@/lib/tracks";
import { Artwork } from "./Artwork";

/** Floating glass mini player — Layer 5
 *  Feels like a physical glass object suspended in the environment.
 */
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
    <div className="fixed bottom-[4.75rem] inset-x-0 z-40 px-3.5 pointer-events-none">
      <div className="mx-auto max-w-lg pointer-events-auto">
        <div
          className="glass-3 glass-edge rounded-[1.35rem] p-2.5 flex items-center gap-3 cursor-pointer glow-accent"
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setExpanded(true)}
          style={{
            boxShadow: `
              0 16px 48px rgba(0,0,0,0.5),
              0 4px 16px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.12),
              0 0 40px rgba(${current.ambient}, 0.18)
            `,
          }}
        >
          {/* Artwork with soft ambient ring */}
          <div className="relative shrink-0">
            <Artwork track={current} size={52} rounded="rounded-xl" priority />
            <div
              className="absolute -inset-1.5 rounded-2xl opacity-40 blur-md -z-10"
              style={{ background: `rgba(${current.ambient}, 0.55)` }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-[#f8f4ee] truncate leading-tight">
              {current.title}
            </p>
            <p className="text-[11px] text-white/45 truncate mt-0.5">
              {current.artist}
            </p>

            {/* Progress bar with ambient tint */}
            <div className="mt-2 h-[3px] rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-1000 linear"
                style={{
                  width: `${progress * 100}%`,
                  background: `linear-gradient(90deg, rgba(${current.ambient}, 0.7), #e8a06a)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/28 mt-1">
              <span>{fmtTime(elapsed)}</span>
              <span>{fmtTime(current.duration)}</span>
            </div>
          </div>

          {/* Controls — glass pills */}
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Previous"
              onClick={prev}
              className="pressable w-9 h-9 rounded-full glass-1 flex items-center justify-center text-white/65 text-sm"
            >
              ‹‹
            </button>
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={toggle}
              className="pressable w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold"
              style={{
                background: "linear-gradient(145deg, #e8a06a, #c4783a)",
                color: "#1a0e08",
                boxShadow: "0 0 28px rgba(232,160,106,0.4)",
              }}
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={next}
              className="pressable w-9 h-9 rounded-full glass-1 flex items-center justify-center text-white/65 text-sm"
            >
              ››
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
