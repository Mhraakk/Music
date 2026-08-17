"use client";
import { usePlayer } from "@/store/player";
import { useFB, keyOf } from "@/store/fb";
import { links, fmtTime } from "@/lib/tracks";
import { Artwork } from "./Artwork";

export function NowPlaying() {
  const current = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.playing);
  const progress = usePlayer((s) => s.progress);
  const expanded = usePlayer((s) => s.expanded);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const setFB = useFB((s) => s.setFB);
  const pushMem = useFB((s) => s.pushMem);

  if (!current || !expanded) return null;

  const elapsed = Math.floor(progress * current.duration);
  const L = links(current.artist, current.title);
  const k = keyOf(current.artist, current.title);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-50" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-[#050403]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full px-5 pb-8">
        <div className="flex items-center justify-between pt-6">
          <button type="button" onClick={() => setExpanded(false)} className="pressable glass-2 rounded-full px-3 py-1.5 text-[11px] text-white/60">↓ Close</button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">Now Playing</span>
          <div className="w-16" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6">
          <div className="relative">
            <Artwork track={current} size={280} rounded="rounded-3xl" className="shadow-[0_30px_80px_rgba(0,0,0,0.6)]" priority />
            <div className="absolute -inset-6 rounded-[2rem] opacity-40 blur-2xl -z-10" style={{ background: `rgba(${current.ambient}, 0.6)` }} />
          </div>

          <div className="text-center space-y-1 px-4">
            <h2 className="text-2xl font-semibold tracking-tight text-[#f8f4ee]">{current.title}</h2>
            <p className="text-white/55">{current.artist}</p>
            <p className="text-[12px] text-white/30">{current.album} · {current.year}</p>
          </div>

          <p className="text-[12px] text-[#d4a574]/90 text-center max-w-sm leading-relaxed px-2">{current.why}</p>

          <div className="w-full px-2 space-y-1.5">
            <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(e) => seek(Number(e.target.value) / 1000)} className="w-full" aria-label="Seek" />
            <div className="flex justify-between text-[11px] text-white/35">
              <span>{fmtTime(elapsed)}</span>
              <span>{fmtTime(current.duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button type="button" onClick={prev} className="pressable w-12 h-12 rounded-full glass-2 flex items-center justify-center text-white/70 text-lg" aria-label="Previous">‹‹</button>
            <button type="button" onClick={toggle} className="pressable w-16 h-16 rounded-full bg-[#e8a06a] text-[#1a0e08] flex items-center justify-center text-xl font-semibold shadow-[0_0_40px_rgba(232,160,106,0.45)]" aria-label={playing ? "Pause" : "Play"}>
              {playing ? "❚❚" : "▶"}
            </button>
            <button type="button" onClick={next} className="pressable w-12 h-12 rounded-full glass-2 flex items-center justify-center text-white/70 text-lg" aria-label="Next">››</button>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="pressable glass-2 rounded-full px-3 py-1.5 text-[11px] text-emerald-200/90" onClick={() => { setFB(k, { kind: "more" }); pushMem(`more · ${current.title}`); }}>more like this</button>
            <button type="button" className="pressable glass-2 rounded-full px-3 py-1.5 text-[11px] text-red-200/80" onClick={() => { setFB(k, { kind: "dislike", reason: "never" }); pushMem(`never · ${current.title}`); next(); }}>never again</button>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {(["spotify", "apple", "youtube", "soundcloud"] as const).map((p) => (
              <a key={p} href={L[p]} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2.5 py-1 rounded-full glass-1 text-white/40 capitalize">{p}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
