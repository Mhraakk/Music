"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentMessage, PlaylistDraft } from "@/lib/agent/types";

type AgentState = {
  open: boolean;
  messages: AgentMessage[];
  draft: PlaylistDraft | null;
  lastRecIds: string[];
  pendingConfirm: { confirmId: string; summary: string; payload: unknown } | null;
  busy: boolean;
  setOpen: (v: boolean) => void;
  toggleOpen: () => void;
  pushMessage: (m: Omit<AgentMessage, "id" | "at"> & { id?: string }) => void;
  setDraft: (d: PlaylistDraft | null) => void;
  setLastRecIds: (ids: string[]) => void;
  setPendingConfirm: (p: AgentState["pendingConfirm"]) => void;
  setBusy: (v: boolean) => void;
  clearChat: () => void;
};

export const useAgent = create(
  persist<AgentState>(
    (set) => ({
      open: false,
      messages: [],
      draft: null,
      lastRecIds: [],
      pendingConfirm: null,
      busy: false,
      setOpen: (v) => set({ open: v }),
      toggleOpen: () => set((s) => ({ open: !s.open })),
      pushMessage: (m) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: m.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              at: Date.now(),
              role: m.role,
              text: m.text,
              tools: m.tools,
              pendingConfirm: m.pendingConfirm,
            },
          ].slice(-40),
        })),
      setDraft: (d) => set({ draft: d }),
      setLastRecIds: (ids) => set({ lastRecIds: ids }),
      setPendingConfirm: (p) => set({ pendingConfirm: p }),
      setBusy: (v) => set({ busy: v }),
      clearChat: () => set({ messages: [], pendingConfirm: null }),
    }),
    {
      name: "resonant-agent-v1",
      partialize: (s) =>
        ({
          messages: s.messages.slice(-20),
          draft: s.draft,
          lastRecIds: s.lastRecIds,
        }) as unknown as AgentState,
    }
  )
);
