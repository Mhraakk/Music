"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";

export function useAtlasPreview() {
  const { pause } = usePlayerActions();
  const { playing, current } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pending = useRef<number | null>(null);
  const nowRef = useRef<string | null>(null);
  const [now, setNow] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (pending.current !== null) {
      window.clearTimeout(pending.current);
      pending.current = null;
    }
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    nowRef.current = null;
    setNow(null);
  }, []);

  useEffect(() => {
    if (playing && current) stop();
  }, [playing, current, stop]);

  useEffect(() => () => stop(), [stop]);

  const preview = useCallback(
    (url: string | null | undefined, id: string) => {
      if (!url) return;
      if (typeof Audio === "undefined") return;
      if (nowRef.current === id) {
        stop();
        return;
      }
      if (pending.current !== null) window.clearTimeout(pending.current);
      pending.current = window.setTimeout(() => {
        pending.current = null;
        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.preload = "auto";
        }
        const el = audioRef.current;
        pause();
        el.src = url;
        void el.play().catch(() => undefined);
        nowRef.current = id;
        setNow(id);
      }, 140);
    },
    [pause, stop]
  );

  return { preview, stop, now };
}