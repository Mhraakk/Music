"use client";
import { create } from "zustand";
import type { Track } from "@/lib/tracks";
import { recordSkip } from "@/lib/taste/dna";

export type PlayerStage = "orb" | "bar" | "full";

type PlayerState = {
  current: Track | null;
  queue: Track[];
  playing: boolean;
  progress: number;
  stage: PlayerStage;
  expanded: boolean;
  play: (t: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (p: number) => void;
  setExpanded: (v: boolean) => void;
  setStage: (s: PlayerStage) => void;
  cycleStage: () => void;
  tick: () => void;
};

export const usePlayer = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  playing: false,
  progress: 0,
  stage: "bar",
  expanded: false,
  play: (t, queue) =>
    set({
      current: t,
      queue: queue?.length ? queue : get().queue,
      playing: true,
      progress: 0,
      stage: get().stage === "full" ? "full" : get().current ? get().stage : "bar",
      expanded: get().stage === "full",
    }),
  toggle: () => set((s) => ({ playing: s.current ? !s.playing : false })),
  next: () => {
    const { current, queue, progress } = get();
    if (!current || !queue.length) return;
    try { recordSkip(current.id, progress); } catch { /* */ }
    const i = queue.findIndex((x) => x.id === current.id);
    const n = queue[(i + 1) % queue.length];
    set({ current: n, progress: 0, playing: true });
  },
  prev: () => {
    const { current, queue, progress } = get();
    if (!current || !queue.length) return;
    if (progress > 0.08) { set({ progress: 0 }); return; }
    const i = queue.findIndex((x) => x.id === current.id);
    const n = queue[(i - 1 + queue.length) % queue.length];
    set({ current: n, progress: 0, playing: true });
  },
  seek: (p) => set({ progress: Math.min(1, Math.max(0, p)) }),
  setExpanded: (v) =>
    set({ expanded: v, stage: v ? "full" : get().stage === "full" ? "bar" : get().stage }),
  setStage: (s) => set({ stage: s, expanded: s === "full" }),
  cycleStage: () => {
    const order: PlayerStage[] = ["orb", "bar", "full"];
    const cur = get().stage;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    set({ stage: next, expanded: next === "full" });
  },
  tick: () => {
    const { playing, current, progress } = get();
    if (!playing || !current) return;
    const step = 1 / Math.max(30, current.duration);
    const next = progress + step;
    if (next >= 1) get().next();
    else set({ progress: next });
  },
}));
