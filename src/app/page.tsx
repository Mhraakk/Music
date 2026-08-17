"use client";

import { useMemo, useState } from "react";
import { TRACKS } from "@/lib/tracks";
import { recommend, flow, graph, clearRecent, getDebugSnapshot, type Compass } from "@/lib/engine";
import { orchestrateRecommendations } from "@/lib/orchestrator";
import { buildJourneyPlan } from "@/lib/journey/engine";
import { useFB } from "@/store/fb";
import { usePlayer } from "@/store/player";
import { Ambient } from "@/components/Ambient";
import { TrackCard } from "@/components/TrackCard";
import { MiniPlayer } from "@/components/MiniPlayer";
import { OrbPlayer } from "@/components/OrbPlayer";
import { NowPlaying } from "@/components/NowPlaying";
import { AgentPanel } from "@/components/AgentPanel";
import { DiscoveryPortals } from "@/components/DiscoveryPortals";
import { MusicalGps } from "@/components/MusicalGps";
import { HealthBanner } from "@/components/HealthBanner";
import { getSession, setTemperature, pushSessionListen, getTasteTwin, dnaSnapshot } from "@/lib/taste";
import { clearExposure } from "@/lib/reliability/exposure";
import type { Track } from "@/lib/tracks";

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex justify-between text-[10px] text-white/40">
        <span>{label}</span>
        <span className="text-[#e8a06a]/85">{Math.round(value * 100)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full"
      />
    </label>
  );
}

export default function App() {
  const by = useFB((s) => s.byTrack);
  const mem = useFB((s) => s.memory);
  const liked = useFB((s) => s.liked());
  const hated = useFB((s) => s.hated());
  const playRaw = usePlayer((s) => s.play);
  const play = (t: Track, q?: Track[]) => {
    playRaw(t, q);
    try { pushSessionListen(t, c, t.emotion); } catch { /* */ }
  };

  const [tab, setTab] = useState<"graph" | "flow" | "self">("graph");
  const [c, setC] = useState<Compass>({ warm: 0.55, sad: 0.45, organic: 0.5, energy: 0.35, dark: 0.55 });
  const [depth, setDepth] = useState(0.7);
  const [temp, setTemp] = useState(() => (typeof window !== "undefined" ? getSession().temperature : 0.45));
  const [portalItems, setPortalItems] = useState<Track[] | null>(null);
  const [portalTitle, setPortalTitle] = useState<string | null>(null);
  const [sessionShown, setSessionShown] = useState<string[]>([]);
  const [showMoreNonce, setShowMoreNonce] = useState(0);

  const fbKey = useMemo(
    () =>
      Object.entries(by)
        .map(([k, v]) => `${k}:${v.kind}:${v.reason || ""}`)
        .sort()
        .join("|"),
    [by]
  );

  const res = useMemo(
    () =>
      orchestrateRecommendations(c, by, depth, {
        limit: 12,
        excludeIds: showMoreNonce > 0 ? sessionShown : undefined,
      }),
    [c, by, depth, fbKey, showMoreNonce, sessionShown]
  );
  const fl = useMemo(() => buildJourneyPlan(c, by, depth, 6), [c, by, depth, fbKey]);
  const g = useMemo(() => graph(by), [by, fbKey]);

  if (typeof window !== "undefined") {
    (window as any).__RESONANT__ = {
      clearRecent,
      getDebugSnapshot,
      recommend,
      flow,
      lastRecommend: res,
      sessionShown,
    };
  }
  const maxE = Math.max(...fl.path.map((p) => p.e), 0.01);
  const displayItems = portalItems
    ? portalItems.map((tr) => ({ t: tr, reason: portalTitle || tr.why, s: 1 as number }))
    : res.items;
  const queue = displayItems.map((x) => x.t);
  const twin = getTasteTwin(by, c, depth);

  return (
    <div className="relative min-h-dvh">
      <Ambient />
      <div className="relative z-10 mx-auto max-w-lg px-4 pt-8 pb-44">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-bold tracking-tight"
              style={{
                background: "linear-gradient(145deg, #e8a06a, #8b3a1a)",
                boxShadow: "0 0 28px rgba(232,160,106,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                color: "#1a0e08",
              }}
            >
              R
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.22em] text-[#e8a06a] uppercase">Resonant</p>
              <p className="text-[10px] text-white/32 tracking-wide">Emotional taste graph</p>
            </div>
          </div>
          <div className="glass-2 glass-edge rounded-full px-3.5 py-1.5 flex gap-3 text-[11px]">
            <span className="text-emerald-400/90">+{liked}</span>
            <span className="text-red-400/85">−{hated}</span>
          </div>
        </header>

        {tab === "graph" && (
          <>
            <h1 className="mt-8 text-[1.85rem] font-semibold tracking-tight text-[#f8f4ee] leading-[1.15]">
              Listen by feeling,
              <br />
              <span className="text-white/38">not by genre.</span>
            </h1>
            <p className="mt-2.5 text-[14px] text-white/38 leading-relaxed max-w-[22rem]">
              Artwork, atmosphere, rejection memory — recommendations that pass an emotional test.
            </p>

            {res.items[0] && (
              <button
                type="button"
                onClick={() => play(res.items[0].t, queue)}
                className="mt-6 w-full text-left glass-3 glass-edge rounded-[1.5rem] overflow-hidden pressable group"
                style={{
                  boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 40px rgba(${res.items[0].t.ambient}, 0.15)`,
                }}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={res.items[0].t.coverUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#e8a06a] mb-1.5">Hero discovery</p>
                    <p className="text-[1.35rem] font-semibold text-white tracking-tight">{res.items[0].t.title}</p>
                    <p className="text-sm text-white/55 mt-0.5">{res.items[0].t.artist}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[12.5px] text-[#d4a574]/95 leading-relaxed">{res.items[0].reason}</p>
                </div>
              </button>
            )}

            <section className="mt-5 glass-2 glass-edge rounded-[1.25rem] p-4 space-y-3.5">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#e8a06a]/90">Mood compass</h2>
              <Slider label="Warm" value={c.warm} onChange={(n) => setC({ ...c, warm: n })} />
              <Slider label="Sad" value={c.sad} onChange={(n) => setC({ ...c, sad: n })} />
              <Slider label="Organic" value={c.organic} onChange={(n) => setC({ ...c, organic: n })} />
              <Slider label="Energy" value={c.energy} onChange={(n) => setC({ ...c, energy: n })} />
              <Slider label="Dark" value={c.dark} onChange={(n) => setC({ ...c, dark: n })} />
              <Slider label="Discovery depth" value={depth} onChange={setDepth} />
              <Slider
                label="Discovery temperature"
                value={temp}
                onChange={(n) => {
                  setTemp(n);
                  setTemperature(n);
                  setPortalItems(null);
                }}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="glass-2 glass-edge rounded-full px-3.5 py-1.5 text-[11px] text-[#e8a06a] pressable"
                  onClick={() => {
                    const fromRes = res.items.map((x) => x.t.id);
                    setSessionShown((prev) => [...new Set([...prev, ...fromRes])]);
                    clearRecent();
                    setPortalItems(null);
                    setPortalTitle(null);
                    setShowMoreNonce(0);
                    setTemp((t) => Math.min(1, t + 0.08));
                    setTemperature(Math.min(1, temp + 0.08));
                  }}
                >
                  Fresh room
                </button>
                <button
                  type="button"
                  className="glass-2 glass-edge rounded-full px-3.5 py-1.5 text-[11px] text-[#e8a06a]/90 pressable"
                  onClick={() => {
                    const fromRes = res.items.map((x) => x.t.id);
                    setSessionShown((prev) => [...new Set([...prev, ...fromRes])]);
                    setPortalItems(null);
                    setPortalTitle(null);
                    setShowMoreNonce((n) => n + 1);
                  }}
                >
                  Show more
                </button>
                <button
                  type="button"
                  className="glass-2 glass-edge rounded-full px-3.5 py-1.5 text-[11px] text-white/50 pressable"
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.confirm("Clear all likes, dislikes and exposure memory? The graph will start fresh.")
                    ) {
                      useFB.setState({ byTrack: {}, memory: [] });
                      try {
                        clearExposure();
                      } catch {
                        /* */
                      }
                      clearRecent();
                      setSessionShown([]);
                      setShowMoreNonce(0);
                      setPortalItems(null);
                      setPortalTitle(null);
                    }
                  }}
                >
                  Reset memory
                </button>
              </div>
            </section>

            <div className="mt-4">
              <DiscoveryPortals
                compass={c}
                fb={by}
                depth={depth}
                onResult={(items, meta) => {
                  setPortalItems(items);
                  setPortalTitle(meta.title);
                  if (meta.compass) setC((prev) => ({ ...prev, ...meta.compass }));
                  if (typeof meta.depth === "number") setDepth(meta.depth);
                }}
              />
            </div>

            <div className="mt-3 glass-1 rounded-xl px-3.5 py-2.5 text-[11px] text-white/50 leading-relaxed">
              <span className="text-[#e8a06a]/90">Taste Twin · </span>
              {Math.round(twin.howWellIKnowYou * 100)}% known — {twin.summary}
            </div>

            <div className="mt-3 glass-1 rounded-xl px-3.5 py-2.5 text-[11px] text-white/50 leading-relaxed">
              <span className="text-[#e8a06a]/90">Graph · </span>
              {res.graph?.voice}
              {res.graph?.avoids && res.graph.avoids.length > 0 && (
                <span className="text-white/30"> · avoids {res.graph.avoids.slice(0, 3).join(", ")}</span>
              )}
            </div>

            <HealthBanner
              tier={res.tier}
              health={res.health}
              message={portalItems ? null : res.message}
              poolSize={res.metrics?.poolSize}
              itemCount={displayItems.length}
              correlationId={res.correlationId}
              sources={res.sources}
            />

            <h2 className="mt-7 text-[10px] uppercase tracking-[0.15em] text-white/35">
              {portalTitle ? portalTitle : "Passes emotional test"}
              {showMoreNonce > 0 && !portalTitle ? ` · more · excluded ${sessionShown.length}` : ""}
            </h2>
            {portalItems && (
              <button
                type="button"
                className="text-[10px] text-white/40 mt-1 pressable"
                onClick={() => {
                  setPortalItems(null);
                  setPortalTitle(null);
                }}
              >
                clear portal · back to graph rank
              </button>
            )}
            <div className="mt-2.5 space-y-3">
              {displayItems.map(({ t, reason }, i) => (
                <TrackCard
                  key={t.id + (portalTitle || "") + String(showMoreNonce)}
                  track={t}
                  reason={reason}
                  variant={i === 0 ? "editorial" : "discovery"}
                  queue={queue}
                />
              ))}
            </div>
          </>
        )}

        {tab === "flow" && (
          <>
            <h1 className="mt-7 text-2xl font-semibold text-[#f8f4ee]">Continuous flow</h1>
            <div className="mt-4">
              <MusicalGps compass={c} path={fl.path.map((p) => p.t)} />
            </div>
            {twin.sessionNarrative && (
              <p className="mt-3 text-[12px] text-white/45 leading-relaxed">{twin.sessionNarrative}</p>
            )}
            <p className="text-sm text-white/40 mt-1">Open → rise → settle → land. Hard emotional cuts are penalized.</p>
            <p className="text-[11px] text-[#e8a06a]/80 mt-2">{fl.voice}</p>
            <section className="mt-4 glass-2 glass-edge rounded-2xl p-4 space-y-3">
              <Slider label="Warm" value={c.warm} onChange={(n) => setC({ ...c, warm: n })} />
              <Slider label="Sad" value={c.sad} onChange={(n) => setC({ ...c, sad: n })} />
              <Slider label="Energy peak" value={c.energy} onChange={(n) => setC({ ...c, energy: n })} />
              <Slider label="Dark" value={c.dark} onChange={(n) => setC({ ...c, dark: n })} />
            </section>
            <div className="mt-4 flex items-end gap-1.5 h-16 px-1">
              {fl.path.map((p, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#6b3a18] to-[#e8a06a]"
                    style={{ height: `${(p.e / maxE) * 100}%`, minHeight: 4 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {fl.path.map(({ t, reason, chapter }) => (
                <TrackCard
                  key={t.id + chapter}
                  track={t}
                  reason={reason}
                  chapter={chapter}
                  queue={fl.path.map((x) => x.t)}
                />
              ))}
            </div>
          </>
        )}

        {tab === "self" && (
          <>
            <h1 className="mt-7 text-2xl font-semibold text-[#f8f4ee]">Knows you</h1>
            <p className="text-sm text-white/40 mt-1">Every signal rewires the graph. Not a scoreboard — a memory.</p>
            {(() => {
              const dna = dnaSnapshot(by, c);
              return (
                <div className="mt-5 glass-2 glass-edge rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/85">Taste DNA</p>
                  <p className="text-[12px] text-white/55">
                    Long-term samples {dna.longTermSamples} · medium {dna.mediumSamples} · session{" "}
                    {dna.sessionSamples}
                  </p>
                  <p className="text-[12px] text-white/45">
                    Negative strength {Math.round(dna.negativeStrength * 100)}%
                    {dna.negativeArtists.length > 0 && (
                      <span> · avoids {dna.negativeArtists.slice(0, 4).join(", ")}</span>
                    )}
                  </p>
                </div>
              );
            })()}
            <div className="mt-5 glass-3 glass-edge rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/85 mb-2">Taste graph voice</p>
              <p className="text-lg text-[#f8f4ee] leading-snug">{g.voice}</p>
              {g.avoids.length > 0 && (
                <p className="mt-3 text-[12px] text-white/40">Avoids: {g.avoids.join(" · ")}</p>
              )}
              <p className="mt-2 text-[11px] text-white/30">
                +{g.liked} attract · −{g.hated} reject
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {(
                [
                  ["Dark", g.attract.d],
                  ["Warm", g.attract.w],
                  ["Organic", g.attract.o],
                  ["Energy", g.attract.e],
                  ["Sad", g.attract.s],
                  ["Mainstream pull", g.attract.m],
                ] as [string, number][]
              ).map(([label, v]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>{label}</span>
                    <span>{Math.round(v * 100)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6b3a18] to-[#e8a06a]"
                      style={{ width: `${Math.round(v * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <h2 className="mt-8 text-[10px] uppercase tracking-[0.15em] text-white/35">Library atmosphere</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {TRACKS.map((t) => (
                <button key={t.id} type="button" onClick={() => play(t, TRACKS)} className="shrink-0 pressable">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.coverUrl}
                    alt={t.title}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-xl object-cover ring-1 ring-white/10"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            <h2 className="mt-8 text-[10px] uppercase tracking-[0.15em] text-white/35">Signal timeline</h2>
            {mem.length === 0 ? (
              <p className="mt-3 text-sm text-white/35">
                Teach the graph: more like this, less like this, reject with a reason.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mem.slice(0, 15).map((m, i) => (
                  <li key={i} className="glass-1 rounded-xl px-3 py-2 flex justify-between gap-3">
                    <span className="text-sm text-[#f0ebe3] truncate">{m.label}</span>
                    <span className="text-[10px] text-white/30 shrink-0">
                      {new Date(m.at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <OrbPlayer />
      <MiniPlayer />
      <NowPlaying />
      <AgentPanel
        compass={c}
        depth={depth}
        tab={tab}
        onCompass={(partial, d) => {
          setC((prev) => ({ ...prev, ...partial }));
          if (typeof d === "number") setDepth(d);
        }}
        onTab={setTab}
      />

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-white/6 bg-black/65 backdrop-blur-2xl pb-safe">
        <div className="mx-auto max-w-lg flex justify-around py-3.5">
          {(["graph", "flow", "self"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`text-[11px] font-medium capitalize tracking-wide pressable px-4 py-1.5 rounded-full transition-colors ${
                tab === t ? "text-[#e8a06a] bg-white/5" : "text-white/32"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
