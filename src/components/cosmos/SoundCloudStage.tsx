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
      ERROR?: string;
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
    const fail = () => {
      apiReady = null;
      reject(new Error("SoundCloud widget failed to load"));
    };
    const existing = document.querySelector("script[data-sc-widget]");
    if (existing) {
      existing.addEventListener("load", () => (window.SC?.Widget ? resolve() : fail()));
      existing.addEventListener("error", fail);
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://w.soundcloud.com/player/api.js";
    tag.async = true;
    tag.dataset.scWidget = "true";
    tag.onload = () => (window.SC?.Widget ? resolve() : fail());
    tag.onerror = fail;
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
  onFailed,
  onSeekApplied,
}: {
  url: string;
  playing: boolean;
  volume: number;
  seekAt: number | null;
  onTick: (progress: number, durationSec: number) => void;
  onEnded: () => void;
  onFailed?: () => void;
  onSeekApplied?: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const widget = useRef<ScWidget | null>(null);
  const durationMs = useRef(0);
  const ended = useRef(false);
  const seekAtRef = useRef(seekAt);
  const appliedSeek = useRef<number | null>(null);
  const onFailedRef = useRef(onFailed);
  const onSeekAppliedRef = useRef(onSeekApplied);
  seekAtRef.current = seekAt;
  onFailedRef.current = onFailed;
  onSeekAppliedRef.current = onSeekApplied;

  const applySeek = (api: ScWidget) => {
    const at = seekAtRef.current;
    if (at == null || durationMs.current <= 0) return;
    if (appliedSeek.current === at) return;
    api.seekTo(at * durationMs.current);
    appliedSeek.current = at;
    onSeekAppliedRef.current?.();
  };

  useEffect(() => {
    ended.current = false;
    durationMs.current = 0;
    widget.current = null;
    appliedSeek.current = null;
    const iframe = frame.current;
    if (!iframe) return;
    let cancelled = false;
    void loadWidgetApi()
      .then(() => {
        if (cancelled || !window.SC?.Widget) {
          if (!cancelled) onFailedRef.current?.();
          return;
        }
        const api = window.SC.Widget(iframe);
        widget.current = api;
        api.bind(window.SC.Widget.Events.READY, () => {
          api.setVolume(Math.round(volume * 100));
          api.getDuration((ms) => {
            durationMs.current = ms;
            applySeek(api);
          });
          applySeek(api);
          if (playing) api.play();
          else api.pause();
        });
        api.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
          const duration = durationMs.current;
          if (!(duration > 0)) {
            api.getDuration((ms) => {
              durationMs.current = ms;
              applySeek(api);
            });
            return;
          }
          applySeek(api);
          if (data?.relativePosition != null && Number.isFinite(data.relativePosition)) {
            onTick(Math.max(0, Math.min(1, data.relativePosition)), duration / 1000);
            return;
          }
          if (data?.currentPosition != null) {
            onTick(Math.max(0, Math.min(1, data.currentPosition / duration)), duration / 1000);
          }
        });
        api.bind(window.SC.Widget.Events.FINISH, () => {
          if (ended.current) return;
          ended.current = true;
          onEnded();
        });
        const errorEvent = window.SC.Widget.Events.ERROR;
        if (errorEvent) {
          api.bind(errorEvent, () => {
            if (!cancelled) onFailedRef.current?.();
          });
        }
      })
      .catch(() => {
        if (!cancelled) onFailedRef.current?.();
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
    appliedSeek.current = null;
    const api = widget.current;
    if (api) applySeek(api);
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
