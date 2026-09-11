"use client";

import { useEffect, useRef } from "react";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (n: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: Record<string, (e: { data: number; target: YTPlayer }) => void>;
        }
      ) => YTPlayer;
      PlayerState?: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve, reject) => {
    let settled = false;
    const done = () => {
      if (settled || !window.YT?.Player) return;
      settled = true;
      window.clearInterval(wait);
      window.clearTimeout(timeout);
      resolve();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(wait);
      window.clearTimeout(timeout);
      apiReady = null;
      reject(new Error("YouTube iframe API failed to load"));
    };
    window.onYouTubeIframeAPIReady = done;
    const existing = document.querySelector("script[data-yt-api]");
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.dataset.ytApi = "true";
      tag.onerror = fail;
      document.head.appendChild(tag);
    }
    const wait = window.setInterval(done, 80);
    const timeout = window.setTimeout(fail, 12000);
  });
  return apiReady;
}

export function NuclearStage({
  videoId,
  playing,
  volume,
  seekAt,
  onTick,
  onEnded,
  onFailed,
  onSeekApplied,
}: {
  videoId: string;
  playing: boolean;
  volume: number;
  seekAt: number | null;
  onTick: (progress: number, durationSec: number) => void;
  onEnded: () => void;
  onFailed?: () => void;
  onSeekApplied?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ended = useRef(false);
  const seekAtRef = useRef(seekAt);
  const appliedSeek = useRef<number | null>(null);
  const onFailedRef = useRef(onFailed);
  const onSeekAppliedRef = useRef(onSeekApplied);
  seekAtRef.current = seekAt;
  onFailedRef.current = onFailed;
  onSeekAppliedRef.current = onSeekApplied;

  const applySeek = (p: YTPlayer) => {
    const at = seekAtRef.current;
    if (at == null) return;
    const duration = p.getDuration();
    if (!duration) return;
    if (appliedSeek.current === at) return;
    p.seekTo(at * duration, true);
    appliedSeek.current = at;
    onSeekAppliedRef.current?.();
  };

  useEffect(() => {
    ended.current = false;
    appliedSeek.current = null;
    let cancelled = false;
    const wrapper = host.current;
    if (!wrapper) return;
    void loadYoutubeApi()
      .then(() => {
        if (cancelled || !window.YT?.Player) {
          if (!cancelled) onFailedRef.current?.();
          return;
        }
        wrapper.replaceChildren();
        const mount = document.createElement("div");
        mount.style.width = "100%";
        mount.style.height = "100%";
        wrapper.appendChild(mount);
        player.current = new window.YT.Player(mount, {
          videoId,
          playerVars: {
            autoplay: playing ? 1 : 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(Math.round(volume * 100));
              applySeek(event.target);
              if (playing) event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === window.YT?.PlayerState?.ENDED) {
                if (ended.current) return;
                ended.current = true;
                onEnded();
              }
            },
            onError: () => {
              if (!cancelled) onFailedRef.current?.();
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) onFailedRef.current?.();
      });
    return () => {
      cancelled = true;
      try {
        player.current?.destroy();
      } catch {
        /* iframe already gone */
      }
      player.current = null;
      wrapper.replaceChildren();
    };
    // Recreate only when the video changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (playing) p.playVideo();
    else p.pauseVideo();
  }, [playing]);

  useEffect(() => {
    player.current?.setVolume(Math.round(volume * 100));
  }, [volume]);

  useEffect(() => {
    if (seekAt === null) return;
    appliedSeek.current = null;
    const p = player.current;
    if (p) applySeek(p);
  }, [seekAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const p = player.current;
      if (!p || typeof p.getDuration !== "function") return;
      applySeek(p);
      const duration = p.getDuration();
      if (!duration) return;
      onTick(Math.max(0, Math.min(1, p.getCurrentTime() / duration)), duration);
    }, 250);
    return () => window.clearInterval(timer);
  }, [onTick]);

  return (
    <div className="cx-embed" aria-hidden>
      <div ref={host} className="h-full w-full" />
    </div>
  );
}
