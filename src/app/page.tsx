"use client";

import { useMemo, useState } from "react";
import { TRACKS } from "@/lib/tracks";
import { recommend, flow, graph, clearRecent, getDebugSnapshot, type Compass } from "@/lib/engine";
import { useFB } from "@/store/fb";
import { usePlayer } from "@/store/player";
import { Ambient } from "@/components/Ambient";
import { TrackCard } from "@/components/TrackCard";
import { MiniPlayer } from "@/components/MiniPlayer";
import { NowPlaying } from "@/components/NowPlaying";

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block space-y-1.5">
      <div className="flex justify-between text-[10px] text-white/40">
        <span>{label}</span>
        <span className="text-[#e8a06a]/85">{Math.round(value * 100)}</span>
      </div>
      <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} className="w-full" />
    </label>
  );
}

function safeRecommend(c: Compass, by: Record<string, { kind: string; reason?: string }>, depth: number) {
  try {
    const r = recommend(c, by, depth);
    if (r?.items?.length) return r;
  } catch (e) {
    console.error("[RESONANT] recommend failed", e);
  }
  // Absolute UI fallback — never blank
  return {
    items: TRACKS.slice(0, 8).map((t, i) => ({ t, s: 1 - i * 0.01, reason: t.why })),
    message: "Showing open catalog.",
    graph: graph(by || {}),
    tier: "emergency",
  };
}

export default function App() {
  const by = useFB((s) => s.byTrack);
  const mem = useFB((s) => s.memory);
  const liked = useFB((s) => s.liked());
  const hated = useFB((s) => s.hated());
  const setFB = useFB((s) => s.setFB);
  const play = usePlayer((s) => s.play);

  const [tab, setTab] = useState<"graph" | "flow" | "self">("graph");
  const [c, setC] = useState<Compass>({ warm: 0.55, sad: 0.45, organic: 0.5, energy: 0.35, dark: 0.55 });
  const [depth, setDepth] = useState(0.7);
  const [refresh, setRefresh] = useState(0);

  const fbKey = useMemo(
    () =>
      Object.entries(by)
        .map(([k, v]) => `${k}:${v.kind}:${v.reason || ""}`)
        .sort()
        .join("|") + `|r${refresh}`,
    [by, refresh]
  );

  const res = useMemo(() => safeRecommend(c, by, depth), [c, by, depth, fbKey]);
  const fl = useMemo(() => {
    try {
      return flow(c, by, depth);
    } catch {
      return {
        path: TRACKS.slice(0, 6).map((t, i) => ({ t, reason: t.why, chapter: "Open", e: 0.4 })),
        graph: graph(by),
      };
    }
  }, [c, by, depth, fbKey]);
  const g = useMemo(() => graph(by), [by, fbKey]);

  if (typeof window !== "undefined") {
    (window as any).__RESONANT__ = { clearRecent, getDebugSnapshot, recommend, flow, last: res };
  }

  const maxE = Math.max(...(fl.path?.map((p) => p.e) || [0.4]), 0.01);
  const items = res.items?.length ? res.items : TRACKS.slice(0, 8).map((t) => ({ t, reason: t.why, s: 1 }));
  const queue = items.map((x) => x.t);

  const resetTaste = () => {
    Object.keys(by).forEach((k) => setFB(k, null));
    clearRecent();
    setRefresh((n) => n + 1);
  };

  const shuffleFresh = () => {
    clearRecent();
    setRefresh((n) => n + 1);
  };

  return (
    <div className="relative min-h-dvh">
      <Ambient />

      <div className="relative z-10 mx-auto max-w-lg px-4 pt-8 pb-44">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#c4783a] to-[#3d1a0a] flex items-center justify-center text-xs font-bold shadow-[0_0_20px_rgba(196,120,58,0.35)]">R</div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#e8a06a]/90 uppercase">Resonant</p>
              <p className="text-[10px] text-white/30">Emotional taste graph</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={shuffleFresh} className="glass-1 rounded-full px-3 py-1.5 text-[10px] text-[#e8a06a]/90 pressable">
              Fresh
            </button>
            <div className="glass-1 rounded-full px-3 py-1.5 flex gap-3 text-[11px]">
              <span className="text-emerald-400/85">+{liked}</span>
              <span className="text-red-400/85">−{hated}</span>
            </div>
          </div>
        </header>

        {tab === "graph" && (
          <>
            <h1 className="mt-7 text-[1.75rem] font-semibold tracking-tight text-[#f8f4ee] leading-tight">
              Listen by feeling,<br /><span className="text-white/40">not by genre.</span>
            </h1>
            <p className="mt-2 text-sm text-white/40 leading-relaxed">
              Artwork, atmosphere, rejection memory — recommendations that pass an emotional test.
            </p>

            {items[0] && (
              <button type="button" onClick={() => play(items[0].t, queue)} className="mt-6 w-full text-left glass-3 glass-edge rounded-3xl overflow-hidden pressable group">
                <div className="relative aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={items[0].t.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/90 mb-1">Hero discovery</p>
                    <p className="text-xl font-semibold text-white">{items[0].t.title}</p>
                    <p className="text-sm text-white/60">{items[0].t.artist}</p>
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="text-[12px] text-[#d4a574]/90 leading-snug">{items[0].reason}</p>
                </div>
              </button>
            )}

            <section className="mt-5 glass-2 glass-edge rounded-2xl p-4 space-y-3">
              <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/85">Mood compass</h2>
              <Slider label="Warm" value={c.warm} onChange={(n) => setC({ ...c, warm: n })} />
              <Slider label="Sad" value={c.sad} onChange={(n) => setC({ ...c, sad: n })} />
              <Slider label="Organic" value={c.organic} onChange={(n) => setC({ ...c, organic: n })} />
              <Slider label="Energy" value={c.energy} onChange={(n) => setC({ ...c, energy: n })} />
              <Slider label="Dark" value={c.dark} onChange={(n) => setC({ ...c, dark: n })} />
              <Slider label="Discovery depth" value={depth} onChange={setDepth} />
            </section>

            <div className="mt-3 glass-1 rounded-xl px-3.5 py-2.5 text-[11px] text-white/50 leading-relaxed">
              <span className="text-[#e8a06a]/90">Graph · </span>{res.graph?.voice || g.voice}
              {(res.graph?.avoids?.length || 0) > 0 && (
                <span className="text-white/30"> · avoids {(res.graph?.avoids || []).slice(0, 3).join(", ")}</span>
              )}
            </div>

            {res.message && (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">{res.message}</div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.15em] text-white/35">Passes emotional test · {items.length}</h2>
              <button type="button" onClick={shuffleFresh} className="text-[10px] text-[#e8a06a]/85 pressable">
                Show more →
              </button>
            </div>
            <div className="mt-2.5 space-y-3">
              {items.map(({ t, reason }, i) => (
                <TrackCard key={`${t.id}-${refresh}-${i}`} track={t} reason={reason} variant={i === 0 ? "editorial" : "discovery"} queue={queue} />
              ))}
            </div>

            {items.length === 0 && (
              <div className="mt-4 glass-2 rounded-2xl p-4 text-center">
                <p className="text-sm text-white/60">No tracks ranked — recovering…</p>
                <button type="button" onClick={shuffleFresh} className="mt-3 text-[12px] text-[#e8a06a] pressable">Reload recommendations</button>
              </div>
            )}
          </>
        )}

        {tab === "flow" && (
          <>
            <h1 className="mt-7 text-2xl font-semibold text-[#f8f4ee]">Continuous flow</h1>
            <p className="text-sm text-white/40 mt-1">Open → rise → settle → land.</p>
            <p className="text-[11px] text-[#e8a06a]/80 mt-2">{fl.graph?.voice}</p>
            <section className="mt-4 glass-2 glass-edge rounded-2xl p-4 space-y-3">
              <Slider label="Warm" value={c.warm} onChange={(n) => setC({ ...c, warm: n })} />
              <Slider label="Sad" value={c.sad} onChange={(n) => setC({ ...c, sad: n })} />
              <Slider label="Energy peak" value={c.energy} onChange={(n) => setC({ ...c, energy: n })} />
              <Slider label="Dark" value={c.dark} onChange={(n) => setC({ ...c, dark: n })} />
            </section>
            <div className="mt-4 flex items-end gap-1.5 h-16 px-1">
              {(fl.path || []).map((p, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-[#6b3a18] to-[#e8a06a]" style={{ height: `${(p.e / maxE) * 100}%`, minHeight: 4 }} />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {(fl.path || []).map(({ t, reason, chapter }) => (
                <TrackCard key={t.id + chapter} track={t} reason={reason} chapter={chapter} queue={(fl.path || []).map((x) => x.t)} />
              ))}
            </div>
          </>
        )}

        {tab === "self" && (
          <>
            <h1 className="mt-7 text-2xl font-semibold text-[#f8f4ee]">Knows you</h1>
            <p className="text-sm text-white/40 mt-1">Every signal rewires the graph.</p>
            <div className="mt-5 glass-3 glass-edge rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/85 mb-2">Taste graph voice</p>
              <p className="text-lg text-[#f8f4ee] leading-snug">{g.voice}</p>
              {g.avoids.length > 0 && <p className="mt-3 text-[12px] text-white/40">Avoids: {g.avoids.join(" · ")}</p>}
              <p className="mt-2 text-[11px] text-white/30">+{g.liked} attract · −{g.hated} reject</p>
              <button type="button" onClick={resetTaste} className="mt-4 text-[11px] text-red-300/80 pressable underline">
                Reset all taste memory
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {([["Dark", g.attract.d], ["Warm", g.attract.w], ["Organic", g.attract.o], ["Energy", g.attract.e], ["Sad", g.attract.s], ["Mainstream pull", g.attract.m]] as [string, number][]).map(([label, v]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/40"><span>{label}</span><span>{Math.round(v * 100)}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#6b3a18] to-[#e8a06a]" style={{ width: `${Math.round(v * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <h2 className="mt-8 text-[10px] uppercase tracking-[0.15em] text-white/35">Library atmosphere</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {TRACKS.map((t) => (
                <button key={t.id} type="button" onClick={() => play(t, TRACKS)} className="shrink-0 pressable">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.coverUrl} alt={t.title} width={72} height={72} className="h-[72px] w-[72px] rounded-xl object-cover ring-1 ring-white/10" loading="lazy" />
                </button>
              ))}
            </div>
            <h2 className="mt-8 text-[10px] uppercase tracking-[0.15em] text-white/35">Signal timeline</h2>
            {mem.length === 0 ? (
              <p className="mt-3 text-sm text-white/35">Teach the graph: more like this, less like this, reject with a reason.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mem.slice(0, 15).map((m, i) => (
                  <li key={i} className="glass-1 rounded-xl px-3 py-2 flex justify-between gap-3">
                    <span className="text-sm text-[#f0ebe3] truncate">{m.label}</span>
                    <span className="text-[10px] text-white/30 shrink-0">{new Date(m.at).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <MiniPlayer />
      <NowPlaying />

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-white/8 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto max-w-lg flex justify-around py-3.5">
          {(["graph", "flow", "self"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`text-[11px] font-medium capitalize tracking-wide pressable px-3 py-1 ${tab === t ? "text-[#e8a06a]" : "text-white/35"}`}>{t}</button>
          ))}
        </div>
      </nav>
    </div>
  );
}
