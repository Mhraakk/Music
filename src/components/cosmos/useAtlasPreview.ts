"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer, usePlayerActions } from "@/context/PlayerContext";

export function useAtlasPreview() {
  const { pause } = usePlayerActions();
  const { playing, current } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<string | null>(null);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
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
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = "auto";
      }
      const el = audioRef.current;
      pause();
      if (now === id && !el.paused) {
        stop();
        return;
      }
      el.src = url;
      void el.play().catch(() => undefined);
      setNow(id);
    },
    [now, pause, stop]
  );

  return { preview, stop, now };
}
