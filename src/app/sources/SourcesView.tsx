"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ambient } from "@/components/Ambient";
import {
  CornerDiagonals,
  FlashlightBorder,
  GradientBorder,
  NumberDetail,
  Reveal,
} from "@/components/neuform";
import {
  AXIS_LABELS,
  SOURCE_LABELS,
  type ResultTrack,
  type SourcesSummary,
  type TasteProfile,
} from "./types";

const api = (path: string) => `/api/ai/music?path=${encodeURIComponent(path)}`;

const USER_ID = "medosa";

export function SourcesView() {
  const [summary, setSummary] = useState<SourcesSummary | null>(null);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<ResultTrack[]>([]);
  const [mode, setMode] = useState<"search" | "foryou">("foryou");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadProfile = useCallback(async () => {
    const res = await fetch(api(`taste/profile/${USER_ID}`));
    if (res.ok) setProfile((await res.json()).profile);
  }, []);

  useEffect(() => {
    fetch(api("sources"))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("backend unreachable"))))
      .then(setSummary)
      .catch(() => setError("Music backend unreachable — start it in ./backend"));
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function recommend() {
    setBusy(true);
    setError(null);
    setMode("foryou");
    try {
      const res = await fetch(api("taste/recommendations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, limit: 9 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setTracks(data.tracks ?? []);
      setProfile(data.profile ?? profile);
    } catch {
      setError("Could not build recommendations.");
    } finally {
      setBusy(false);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setMode("search");
    try {
      const res = await fetch(api("music/search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 12, user_id: USER_ID }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setTracks(data.tracks ?? []);
    } catch {
      setError("Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signal(track: ResultTrack, kind: "like" | "dislike", reason?: string) {
    await fetch(api("taste/signal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        kind,
        reason,
        source: track.source,
        source_id: track.source_id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        year: track.year,
        isrc: track.isrc,
        genres: track.genres,
      }),
    });
    await loadProfile();
  }

  function togglePreview(track: ResultTrack) {
    if (!track.preview_url) return;
    if (playing === track.key) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(track.preview_url);
    audio.volume = 0.8;
    audio.play().catch(() => setPlaying(null));
    audio.onended = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying(track.key);
  }

  const allSources = summary ? [...summary.internet, ...summary.personal] : [];

  return (
    <div className="relative min-h-dvh">
      <Ambient />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 pb-24">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.3em] text-white/40">RESONANT</p>
            <h1 className="display mt-1 text-3xl">Sources &amp; taste</h1>
            <p className="mt-1 max-w-xl text-sm text-white/50">
              Every connected service plus the open internet, ranked by what this app has learned
              about you.
            </p>
          </div>
          <Link
            href="/"
            className="glass-2 glass-edge pressable rounded-full px-4 py-2 text-xs text-white/70"
          >
            Back
          </Link>
        </header>

        {error && (
          <p className="mt-4 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
            {error}
          </p>
        )}

        {/* ---------------------------------------------------- sources */}
        <section className="mt-7">
          <h2 className="text-[11px] tracking-[0.22em] text-white/40">SOURCES</h2>
          <ul className="mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {allSources.map((source, i) => (
              <Reveal as="li" key={source.id} variant="blur" delay={i * 40}>
                <div className="glass-1 glass-edge nf-shadow-1 flex items-start gap-3 rounded-xl p-3">
                  <span
                    aria-hidden
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      source.configured ? "bg-emerald-400" : "bg-white/20"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/80">{source.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">
                      {source.detail}
                    </p>
                    {!source.configured && source.required_secrets.length > 0 && (
                      <p className="nf-ltr mt-1 text-[10px] text-white/30">
                        needs {source.required_secrets.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
          {summary && (
            <p className="mt-2 text-[11px] text-white/35">
              {summary.configured} of {summary.total} sources connected
            </p>
          )}
        </section>

        {/* ------------------------------------------------ taste memory */}
        <section className="mt-8">
          <h2 className="text-[11px] tracking-[0.22em] text-white/40">WHAT I&apos;VE LEARNED</h2>
          <CornerDiagonals className="glass-1 glass-edge nf-shadow-2 mt-3 rounded-2xl p-4">
            {profile && profile.signal_count > 0 ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-white/85">{profile.voice}</p>
                  <span className="text-[11px] text-white/35">
                    {profile.signal_count} signals · confidence{" "}
                    {Math.round(profile.confidence * 100)}%
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3">
                  {Object.entries(profile.attract).map(([axis, value]) => (
                    <div key={axis} className="text-[11px]">
                      <div className="flex justify-between text-white/40">
                        <span>{AXIS_LABELS[axis] ?? axis}</span>
                        <span className="nf-number">{Math.round(value * 100)}</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-white/8">
                        <div
                          className="h-1 rounded-full bg-[#e8a06a]"
                          style={{ width: `${Math.round(value * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {profile.top_artists.length > 0 && (
                  <p className="mt-3 text-[11px] text-white/45">
                    returns to{" "}
                    <span className="text-white/70">
                      {profile.top_artists
                        .slice(0, 4)
                        .map((a) => a.name)
                        .join(", ")}
                    </span>
                  </p>
                )}
                {profile.top_genres.length > 0 && (
                  <p className="mt-1 text-[11px] text-white/45">
                    leans{" "}
                    <span className="text-white/70">
                      {profile.top_genres
                        .slice(0, 4)
                        .map((g) => g.name)
                        .join(", ")}
                    </span>
                  </p>
                )}
                {Object.keys(profile.source_mix).length > 0 && (
                  <p className="mt-1 text-[11px] text-white/35">
                    learned from{" "}
                    {Object.entries(profile.source_mix)
                      .map(([s, n]) => `${SOURCE_LABELS[s] ?? s} (${n})`)
                      .join(" · ")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-white/45">
                No signals yet. Like or reject a few tracks below and the profile builds itself.
              </p>
            )}
          </CornerDiagonals>
        </section>

        {/* ---------------------------------------------------- controls */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <GradientBorder
              tone="premium"
              interactive
              radius="999px"
              className="glass-2 min-w-0 flex-1"
            >
              <form onSubmit={search} className="flex items-center gap-2 rounded-full p-1.5">
                <label htmlFor="music-search" className="sr-only">
                  Search every music source
                </label>
                <input
                  id="music-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search every source…"
                  className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={busy || !query.trim()}
                  className="pressable rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-black disabled:opacity-40"
                >
                  Search
                </button>
              </form>
            </GradientBorder>
            <button
              type="button"
              onClick={recommend}
              disabled={busy}
              className="glass-2 glass-edge pressable rounded-full px-4 py-2.5 text-xs text-white/75 disabled:opacity-40"
            >
              For you
            </button>
          </div>
        </section>

        {/* ----------------------------------------------------- results */}
        <section className="mt-6" aria-live="polite">
          {busy && <p className="text-xs text-white/40">Reaching every source…</p>}

          {!busy && tracks.length === 0 && (
            <p className="text-xs text-white/35">
              Search across all sources, or press “For you” for taste-ranked picks.
            </p>
          )}

          <ul className="mt-2 grid list-none grid-cols-1 gap-2 p-0">
            {tracks.map((track, i) => (
              <Reveal as="li" key={track.key} variant="slide" delay={Math.min(i, 8) * 35}>
                <FlashlightBorder className="glass-1 glass-edge nf-shadow-1 rounded-xl">
                  <div className="flex items-center gap-3 p-2.5" data-track-key={track.key}>
                    <NumberDetail value={i + 1} className="w-6 shrink-0 text-center text-[11px]" />

                    {track.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.artwork_url}
                        alt=""
                        width={44}
                        height={44}
                        loading="lazy"
                        className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <span className="h-11 w-11 shrink-0 rounded-lg bg-white/5 ring-1 ring-white/10" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/85">{track.title}</p>
                      <p className="truncate text-[11px] text-white/45">
                        {track.artist}
                        {track.year ? ` · ${track.year}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {track.sources.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] text-white/50"
                          >
                            {SOURCE_LABELS[s] ?? s}
                          </span>
                        ))}
                        {track.in_library && (
                          <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] text-emerald-300">
                            in your library
                          </span>
                        )}
                      </div>
                      {mode === "foryou" && track.reasons && track.reasons.length > 0 && (
                        <p className="mt-1 text-[10px] text-white/35">{track.reasons[0]}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {track.preview_url && (
                        <button
                          type="button"
                          onClick={() => togglePreview(track)}
                          aria-pressed={playing === track.key}
                          aria-label={`Preview ${track.title}`}
                          className="pressable rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/75"
                        >
                          {playing === track.key ? "Stop" : "Play"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => signal(track, "like")}
                        aria-label={`Like ${track.title}`}
                        className="pressable rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-emerald-300/80"
                      >
                        Like
                      </button>
                      <button
                        type="button"
                        onClick={() => signal(track, "dislike", "wrong-feel")}
                        aria-label={`Reject ${track.title}`}
                        className="pressable rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-red-300/70"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </FlashlightBorder>
              </Reveal>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
