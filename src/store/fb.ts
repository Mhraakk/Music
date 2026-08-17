"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FE } from "@/lib/engine";
import { keyOf } from "@/lib/engine";

type State = {
  byTrack: Record<string, FE>;
  memory: { at: number; label: string }[];
  setFB: (key: string, e: FE | null) => void;
  pushMem: (label: string) => void;
  liked: () => number;
  hated: () => number;
};

export { keyOf };

export const useFB = create(
  persist<State>(
    (set, get) => ({
      byTrack: {},
      memory: [],
      setFB: (key, e) =>
        set((s) => {
          const n = { ...s.byTrack };
          if (!e) delete n[key];
          else n[key] = e;
          return { byTrack: n };
        }),
      pushMem: (label) =>
        set((s) => ({ memory: [{ at: Date.now(), label }, ...s.memory].slice(0, 40) })),
      liked: () => Object.values(get().byTrack).filter((v) => v.kind === "more" || v.kind === "like").length,
      hated: () => Object.values(get().byTrack).filter((v) => v.kind === "dislike").length,
    }),
    { name: "resonant-fb-v4" }
  )
);
