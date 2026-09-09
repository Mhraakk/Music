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
  apiReady = new Promise((resolve) => {
    const existing = document.querySelector("script[data-yt-api]");
    const done = () => resolve();
    window.onYouTubeIframeAPIReady = done;
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.dataset.ytApi = "true";
      document.head.appendChild(tag);
    }
    const wait = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(wait);
        done();
      }
    }, 80);
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
}: {
  videoId: string;
  playing: boolean;
  volume: number;
  seekAt: number | null;
  onTick: (progress: number, durationSec: number) => void;
  onEnded: () => void;
  onFailed?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ended = useRef(false);

  useEffect(() => {
    ended.current = false;
    let cancelled = false;
    const wrapper = host.current;
    if (!wrapper) return;
    void loadYoutubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
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
            if (!cancelled) onFailed?.();
          },
        },
      });
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
    const p = player.current;
    if (!p) return;
    const duration = p.getDuration();
    if (!duration) return;
    p.seekTo(seekAt * duration, true);
  }, [seekAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const p = player.current;
      if (!p || typeof p.getDuration !== "function") return;
      const duration = p.getDuration();
      if (!duration) return;
      onTick(Math.max(0, Math.min(1, p.getCurrentTime() / duration)), duration);
    }, 250);
    return () => window.clearInterval(timer);
  }, [onTick]);

  return (
    <div className="cx-embed overflow-hidden bg-black">
      <div ref={host} className="h-full w-full" />
    </div>
  );
}
