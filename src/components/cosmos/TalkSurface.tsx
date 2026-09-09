"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";
import { compactOverlay } from "@/lib/apple/publish";
import { fetchConverseStatus, sendConverseTurn } from "@/lib/converse/client";
import { sourceLabel } from "@/lib/converse/anywhere";
import type { ConverseEffect, ConverseMessage, ConverseStatus } from "@/lib/converse/types";
import type { LibraryTrack } from "@/lib/library";
import { PlayIcon, SpinnerGlyph } from "./icons";

const KEY_STORAGE = "resonant.gemini.key";

const STARTERS = [
  { fa: "آهنگ‌های دهه ۹۰ رو بیار", en: "Find me 90s songs" },
  { fa: "یه آهنگ گرم سینمایی بذار", en: "Play something warm and cinematic" },
  { fa: "از یوتیوب یه چیزی شبیه این", en: "Something from YouTube" },
  { fa: "پلی‌لیستی از ساوندکلاد برای شب", en: "A SoundCloud mix for tonight" },
];

type Line = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tracks: LibraryTrack[];
  source?: "gemini" | "local";
};

function uid(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function readStoredKey(): string {
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function writeStoredKey(value: string) {
  try {
    if (value) window.localStorage.setItem(KEY_STORAGE, value);
    else window.localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* private mode */
  }
}

function maskKey(value: string): string {
  const t = value.trim();
  if (t.length < 8) return t ? "••••" : "";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

function tracksFromEffects(effects: ConverseEffect[]): LibraryTrack[] {
  const seen = new Set<string>();
  const out: LibraryTrack[] = [];
  for (const effect of effects) {
    const pack =
      effect.type === "play"
        ? [effect.track]
        : effect.type === "queue" || effect.type === "ingest"
          ? effect.tracks
          : [];
    for (const track of pack) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      out.push(track);
    }
  }
  return out;
}

export function TalkSurface() {
  const player = usePlayer();
  const { play, playQueue, ingest, setDestination } = usePlayerActions();
  const [status, setStatus] = useState<ConverseStatus | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = readStoredKey();
    setDeviceKey(stored);
    setKeyDraft(stored);
    void fetchConverseStatus().then((next) => {
      setStatus(next);
      if (!next.configured && !stored) setKeyOpen(true);
    });
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [lines, busy]);

  const ready = Boolean(status?.configured || deviceKey.trim());

  const applyEffects = useCallback(
    (effects: ConverseEffect[]) => {
      for (const effect of effects) {
        if (effect.type === "ingest") ingest(effect.tracks);
      }
      for (const effect of effects) {
        if (effect.type === "destination") setDestination(effect.id);
      }
      const playFx = effects.find((e) => e.type === "play");
      const queueFx = effects.find((e) => e.type === "queue");
      if (playFx && queueFx) {
        playQueue([playFx.track, ...queueFx.tracks], queueFx.title);
      } else if (queueFx) {
        playQueue(queueFx.tracks, queueFx.title);
      } else if (playFx) {
        play(playFx.track, { fromAsk: true });
      }
    },
    [ingest, play, playQueue, setDestination]
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setDraft("");
      setError(null);
      const userLine: Line = { id: uid(), role: "user", text: trimmed, tracks: [] };
      const nextLines = [...lines, userLine];
      setLines(nextLines);
      setBusy(true);

      const messages: ConverseMessage[] = nextLines.map((line) => ({ role: line.role, text: line.text }));
      const result = await sendConverseTurn({
        messages,
        session: {
          sessionId: player.sessionId,
          currentTrackId: player.current?.id ?? null,
          currentTitle: player.current?.title ?? null,
          currentArtist: player.current?.artist ?? null,
          destination: player.destination,
          destinationLocked: player.destinationLocked,
          historyIds: player.historyIds,
          overlay: compactOverlay(),
          tasteVectors: player.tasteVectors,
        },
        apiKey: deviceKey,
      });

      setBusy(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      applyEffects(result.effects);
      setLines((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: result.reply,
          tracks: tracksFromEffects(result.effects),
          source: result.source,
        },
      ]);
    },
    [applyEffects, busy, deviceKey, lines, player]
  );

  function saveKey() {
    const value = keyDraft.trim();
    writeStoredKey(value);
    setDeviceKey(value);
    setKeyOpen(false);
  }

  function clearKey() {
    writeStoredKey("");
    setDeviceKey("");
    setKeyDraft("");
  }

  const statusLabel = useMemo(() => {
    if (deviceKey.trim()) return "Using the Gemini key on this device.";
    if (status?.configured) return "Gemini is ready on the server.";
    return "No Gemini key yet — I can still find songs on Deezer, YouTube, YouTube Music and SoundCloud. Paste yours below; it never leaves this device except as a request header.";
  }, [deviceKey, status?.configured]);

  return (
    <div className="cx-talk">
      <p className="cx-meta" data-talk-status="true">
        {statusLabel}
      </p>

      <div className="cx-talk-key">
        <button type="button" id="ask-key-toggle" className="cx-see-all" onClick={() => setKeyOpen((v) => !v)}>
          {keyOpen ? "Hide Gemini key" : deviceKey ? `Device key ${maskKey(deviceKey)}` : "Add Gemini API key"}
        </button>
        {keyOpen && (
          <form
            className="cx-talk-key-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveKey();
            }}
          >
            <label className="cx-label" htmlFor="gemini-key">
              Gemini API key — stored only in this browser
            </label>
            <input
              id="gemini-key"
              className="cx-talk-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder="AIza…"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="cx-pill cx-pill-primary">
                Save on this device
              </button>
              <button type="button" className="cx-pill cx-pill-ghost" onClick={clearKey}>
                Clear
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="cx-talk-log" ref={scroller} aria-live="polite">
        {lines.length === 0 && (
          <div className="cx-talk-empty">
            <p className="cx-body">
              Ask however you talk. Songs from Deezer, YouTube, YouTube Music and SoundCloud — decades,
              artists, whatever you want. The Resonant shelf is optional.
            </p>
            <div className="cx-talk-starters">
              {STARTERS.map((item) => (
                <button
                  key={item.en}
                  type="button"
                  className="cx-talk-chip"
                  onClick={() => void send(item.fa)}
                >
                  <span dir="auto">{item.fa}</span>
                  <span className="cx-meta">{item.en}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {lines.map((line) => (
          <article key={line.id} className={`cx-talk-bubble cx-talk-${line.role}`} dir="auto">
            <p>{line.text}</p>
            {line.role === "assistant" && line.source === "local" && !ready && (
              <p className="cx-meta mt-2">بدون کلید جمینی هم جستجو می‌کنم. برای گفتگوی کامل کلید را بگذار.</p>
            )}
            {line.tracks.length > 0 && (
              <ul className="cx-talk-tracks">
                {line.tracks.slice(0, 8).map((track) => (
                  <li key={track.id}>
                    <button type="button" onClick={() => play(track, { fromAsk: true })}>
                      <span
                        className="cx-talk-sleeve"
                        style={{ backgroundColor: track.tint }}
                      >
                        {track.artworkUrl && (
                          // Remote art from Deezer / YouTube / SoundCloud is not all on Apple's CDN.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.artworkUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 text-left">
                        <span className="cx-truncate block text-[13px] font-semibold">{track.title}</span>
                        <span className="cx-truncate block text-[12px] text-[var(--ink-3)]">
                          {track.artist}
                          {sourceLabel(track.foundVia) ? ` · ${sourceLabel(track.foundVia)}` : ""}
                        </span>
                      </span>
                      <PlayIcon size={12} />
                    </button>
                    {(track.openUrl || track.appleUrl) && (
                      <a
                        href={track.openUrl || track.appleUrl || "#"}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="cx-meta px-2"
                      >
                        Open
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}

        {busy && (
          <p className="cx-meta flex items-center gap-2">
            <SpinnerGlyph /> Listening…
          </p>
        )}
      </div>

      {error && <p className="cx-talk-error">{error}</p>}

      <form
        className="cx-talk-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          ref={inputRef}
          className="cx-talk-input cx-talk-textarea"
          rows={2}
          dir="auto"
          value={draft}
          placeholder="آهنگ‌های دهه ۹۰، از یوتیوب، هر چی بگی…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(draft);
            }
          }}
        />
        <button type="submit" className="cx-pill cx-pill-primary" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
