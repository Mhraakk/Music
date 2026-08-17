"use client";
import { useState } from "react";
import type { Track } from "@/lib/tracks";
import { links, fmtTime } from "@/lib/tracks";
import { REASONS, keyOf } from "@/lib/engine";
import { useFB } from "@/store/fb";
import { usePlayer } from "@/store/player";
import { Artwork } from "./Artwork";

type Props = {
  track: Track;
  reason?: string;
  chapter?: string;
  variant?: "compact" | "discovery" | "editorial";
  queue?: Track[];
};

export function TrackCard({ track, reason, chapter, variant = "discovery", queue }: Props) {
  const k = keyOf(track.artist, track.title);
  const cur = useFB((s) => s.byTrack[k]);
  const setFB = useFB((s) => s.setFB);
  const pushMem = useFB((s) => s.pushMem);
  const play = usePlayer((s) => s.play);
  const current = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.playing);
  const [why, setWhy] = useState(false);
  const isActive = current?.id === track.id;
  const L = links(track.artist, track.title);
  const artSize = variant === "editorial" ? 120 : variant === "compact" ? 48 : 64;

  const act = (kind: string, reasonId?: string) => {
    if (cur?.kind === kind && !reasonId) setFB(k, null);
    else {
      setFB(k, { kind, reason: reasonId });
      pushMem(`${kind}${reasonId ? ":" + reasonId : ""} · ${track.title}`);
    }
    if (kind !== "dislike") setWhy(false);
  };

  return (
    <article className={`glass-2 glass-edge rounded-2xl p-3 space-y-2.5 transition-all duration-300 ${isActive ? "ring-1 ring-[#e8a06a]/35" : ""}`}>
      {chapter && <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/90">{chapter}</p>}
      <div className="flex gap-3">
        <button type="button" className="relative pressable shrink-0 group" onClick={() => play(track, queue)} aria-label={`Play ${track.title}`}>
          <Artwork track={track} size={artSize} rounded="rounded-xl" />
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-lg">{isActive && playing ? "❚❚" : "▶"}</span>
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" className="text-left w-full" onClick={() => play(track, queue)}>
            <p className="text-[15px] font-medium text-[#f3eee6] truncate leading-tight">{track.title}</p>
            <p className="text-xs text-white/45 truncate mt-0.5">{track.artist}<span className="text-white/25"> · {track.year}</span></p>
          </button>
          {(reason || track.why) && <p className="text-[11px] text-[#d4a574]/90 mt-1.5 leading-snug line-clamp-2">{reason || track.why}</p>}
          <p className="text-[10px] text-white/30 mt-1">{track.emotion} · {fmtTime(track.duration)} · {track.album}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {([["more", "more like this", "border-emerald-500/40 text-emerald-200"],["less", "less like this", "border-orange-500/35 text-orange-200"],["heard", "heard", "border-amber-500/35 text-amber-200"]] as const).map(([kind, label, cls]) => (
          <button key={kind} type="button" onClick={() => act(kind)} className={`text-[10px] px-2.5 py-1 rounded-full border pressable ${cur?.kind === kind ? `${cls} bg-white/5` : "border-white/10 text-white/40"}`}>{label}</button>
        ))}
        <button type="button" onClick={() => setWhy((v) => !v)} className={`text-[10px] px-2.5 py-1 rounded-full border pressable ${cur?.kind === "dislike" ? "border-red-500/45 text-red-300 bg-red-500/10" : "border-white/10 text-white/40"}`}>reject</button>
      </div>
      {why && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <p className="w-full text-[10px] text-white/35">Why reject? Graph remembers.</p>
          {REASONS.map((r) => (
            <button key={r.id} type="button" onClick={() => act("dislike", r.id)} className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-white/45 pressable">{r.label}</button>
          ))}
        </div>
      )}
      {cur?.kind === "dislike" && cur.reason && !why && (
        <p className="text-[10px] text-red-300/70">Rejection memory: {REASONS.find((r) => r.id === cur.reason)?.label}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {(["spotify", "apple", "youtube", "soundcloud"] as const).map((p) => (
          <a key={p} href={L[p]} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-white/35 capitalize pressable">{p}</a>
        ))}
      </div>
    </article>
  );
}
