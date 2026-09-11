"use client";

import { useEffect, useRef } from "react";

type ScWidget = {
  bind: (event: string, listener: (data?: { currentPosition?: number; relativePosition?: number }) => void) => void;
  play: () => void;
  pause: () => void;
  setVolume: (n: number) => void;
  seekTo: (ms: number) => void;
  getDuration: (cb: (ms: number) => void) => void;
};

type ScApi = {
  Widget: ((el: HTMLIFrameElement) => ScWidget) & {
    Events: {
      READY: string;
      PLAY_PROGRESS: string;
      FINISH: string;
      ERROR: string;
    };
  };
};

declare global {
  interface Window {
    SC?: ScApi;
  }
}

let apiReady: Promise<void> | null = null;

function loadWidgetApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.SC?.Widget) return Promise.resolve();
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-sc-widget]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("SoundCloud widget failed to load")));
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://w.soundcloud.com/player/api.js";
    tag.async = true;
    tag.dataset.scWidget = "true";
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error("SoundCloud widget failed to load"));
    document.head.appendChild(tag);
  });
  return apiReady;
}

export function SoundCloudStage({
  url,
  playing,
  volume,
  seekAt,
  onTick,
  onEnded,
}: {
  url: string;
  playing: boolean;
  volume: number;
  seekAt: number | null;
  onTick: (progress: number, durationSec: number) => void;
  onEnded: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const widget = useRef<ScWidget | null>(null);
  const durationMs = useRef(0);
  const ended = useRef(false);

  useEffect(() => {
    ended.current = false;
    durationMs.current = 0;
    widget.current = null;
    const iframe = frame.current;
    if (!iframe) return;
    let cancelled = false;
    void loadWidgetApi()
      .then(() => {
        if (cancelled || !window.SC?.Widget) return;
        const api = window.SC.Widget(iframe);
        widget.current = api;
        api.bind(window.SC.Widget.Events.READY, () => {
          api.setVolume(Math.round(volume * 100));
          api.getDuration((ms) => {
            durationMs.current = ms;
          });
          if (playing) api.play();
          else api.pause();
        });
        api.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
          const duration = durationMs.current > 0 ? durationMs.current : 0;
          if (data?.relativePosition != null && Number.isFinite(data.relativePosition)) {
            const seconds = duration > 0 ? duration / 1000 : 210;
            onTick(Math.max(0, Math.min(1, data.relativePosition)), seconds);
            return;
          }
          if (data?.currentPosition != null && duration > 0) {
            onTick(Math.max(0, Math.min(1, data.currentPosition / duration)), duration / 1000);
          }
        });
        api.bind(window.SC.Widget.Events.FINISH, () => {
          if (ended.current) return;
          ended.current = true;
          onEnded();
        });
      })
      .catch(() => {
        /* PlayerContext still advances from the duration timer. */
      });
    return () => {
      cancelled = true;
      widget.current = null;
    };
    // Recreate only when the recording URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    const api = widget.current;
    if (!api) return;
    if (playing) api.play();
    else api.pause();
  }, [playing]);

  useEffect(() => {
    widget.current?.setVolume(Math.round(volume * 100));
  }, [volume]);

  useEffect(() => {
    if (seekAt == null) return;
    const api = widget.current;
    if (!api || durationMs.current <= 0) return;
    api.seekTo(seekAt * durationMs.current);
  }, [seekAt]);

  return (
    <div className="cx-embed" aria-hidden>
      <iframe
        ref={frame}
        title="SoundCloud"
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=${playing ? "true" : "false"}&hide_related=true&show_comments=false&visual=false`}
        allow="autoplay"
      />
    </div>
  );
}
