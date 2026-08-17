"use client";

import { useCallback, useRef, useState } from "react";
import { useAgent } from "@/store/agent";
import { useFB } from "@/store/fb";
import { usePlayer } from "@/store/player";
import { TRACKS } from "@/lib/tracks";
import { clearRecent } from "@/lib/engine";
import type { AgentContext, AgentEffect, AgentResponse, Compass } from "@/lib/agent/types";
import type { Compass as EngineCompass } from "@/lib/engine";

type Props = {
  compass: EngineCompass;
  depth: number;
  tab: "graph" | "flow" | "self";
  onCompass: (c: Partial<EngineCompass>, depth?: number) => void;
  onTab: (t: "graph" | "flow" | "self") => void;
};

const SUGGESTIONS = [
  "how well do you know me",
  "go deeper",
  "same feeling",
  "parallel universe",
  "texture dusty drums warm bass",
  "what scene am I in",
  "influence",
  "autopsy",
  "what if without Burial",
  "surprise me",
  "what happened tonight",
  "teach you",
];

export function AgentPanel({ compass, depth, tab, onCompass, onTab }: Props) {
  const open = useAgent((s) => s.open);
  const toggleOpen = useAgent((s) => s.toggleOpen);
  const messages = useAgent((s) => s.messages);
  const pushMessage = useAgent((s) => s.pushMessage);
  const draft = useAgent((s) => s.draft);
  const setDraft = useAgent((s) => s.setDraft);
  const lastRecIds = useAgent((s) => s.lastRecIds);
  const setLastRecIds = useAgent((s) => s.setLastRecIds);
  const pendingConfirm = useAgent((s) => s.pendingConfirm);
  const setPendingConfirm = useAgent((s) => s.setPendingConfirm);
  const busy = useAgent((s) => s.busy);
  const setBusy = useAgent((s) => s.setBusy);
  const clearChat = useAgent((s) => s.clearChat);

  const by = useFB((s) => s.byTrack);
  const setFB = useFB((s) => s.setFB);
  const pushMem = useFB((s) => s.pushMem);

  const current = usePlayer((s) => s.current);
  const queue = usePlayer((s) => s.queue);
  const playing = usePlayer((s) => s.playing);
  const play = usePlayer((s) => s.play);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const setExpanded = usePlayer((s) => s.setExpanded);

  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const applyEffects = useCallback(
    (effects: AgentEffect[]) => {
      for (const e of effects) {
        switch (e.type) {
          case "setCompass":
            onCompass(e.compass, e.depth);
            break;
          case "setFeedback":
            setFB(e.key, e.fe);
            break;
          case "pushMemory":
            pushMem(e.label);
            break;
          case "play": {
            const t = TRACKS.find((x) => x.id === e.trackId);
            if (!t) break;
            const q = (e.queueIds || [])
              .map((id) => TRACKS.find((x) => x.id === id))
              .filter(Boolean) as typeof TRACKS;
            play(t, q.length ? q : undefined);
            break;
          }
          case "player":
            if (e.action === "toggle" || e.action === "play" || e.action === "pause") {
              if (e.action === "pause" && playing) toggle();
              else if (e.action === "play" && !playing) toggle();
              else if (e.action === "toggle") toggle();
            } else if (e.action === "next") next();
            else if (e.action === "prev") prev();
            else if (e.action === "expand") setExpanded(true);
            else if (e.action === "collapse") setExpanded(false);
            break;
          case "setTab":
            onTab(e.tab);
            break;
          case "clearRecent":
            clearRecent();
            break;
        }
      }
    },
    [onCompass, onTab, setFB, pushMem, play, toggle, next, prev, setExpanded, playing]
  );

  const buildContext = useCallback((): AgentContext => {
    return {
      compass: compass as Compass,
      depth,
      fb: by,
      currentTrackId: current?.id ?? null,
      queueIds: queue.map((t) => t.id),
      playing,
      draft,
      lastRecIds,
      tab,
    };
  }, [compass, depth, by, current, queue, playing, draft, lastRecIds, tab]);

  const send = useCallback(
    async (text: string, confirmId?: string) => {
      const msg = text.trim();
      if (!msg && !confirmId) return;
      if (busy) return;

      if (msg) pushMessage({ role: "user", text: msg });
      setInput("");
      setBusy(true);

      try {
        let data: AgentResponse;
        try {
          const res = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: msg || "confirm",
              context: buildContext(),
              confirmId,
            }),
          });
          if (!res.ok) throw new Error("api");
          data = (await res.json()) as AgentResponse;
        } catch {
          const { runAgent } = await import("@/lib/agent/orchestrator");
          data = runAgent({
            message: msg || "confirm",
            context: buildContext(),
            confirmId,
          });
        }

        applyEffects(data.effects || []);
        if (data.draft !== undefined) setDraft(data.draft ?? null);
        if (data.lastRecIds?.length) setLastRecIds(data.lastRecIds);
        setPendingConfirm(data.pendingConfirm ?? null);

        const failed = (data.tools || []).filter((t) => !t.ok);
        const replyText =
          data.reply ||
          (failed.length
            ? failed.map((t) => `⚠ ${t.name}: ${t.error || "failed"}`).join("\n")
            : "No response from tools.");

        pushMessage({
          role: "agent",
          text: replyText,
          tools: data.tools,
          pendingConfirm: data.pendingConfirm || undefined,
        });

        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
      } catch (e) {
        pushMessage({
          role: "agent",
          text: e instanceof Error ? e.message : "Agent failed",
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, pushMessage, setBusy, buildContext, applyEffects, setDraft, setLastRecIds, setPendingConfirm]
  );

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-[5.75rem] right-3 z-50 pressable h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold"
        style={{
          background: "linear-gradient(145deg, #e8a06a, #8b3a1a)",
          color: "#1a0e08",
          boxShadow: "0 0 28px rgba(232,160,106,0.45)",
        }}
        aria-label="Open RESONANT agent"
      >
        AI
      </button>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg mx-auto mb-[4.25rem] px-3">
            <div className="glass-4 glass-edge rounded-3xl overflow-hidden flex flex-col max-h-[min(70vh,560px)] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8a06a]">Agent</p>
                  <p className="text-sm text-[#f8f4ee] font-medium">RESONANT intelligence</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={clearChat} className="text-[10px] text-white/40 pressable px-2 py-1 rounded-full glass-1">clear</button>
                  <button type="button" onClick={toggleOpen} className="text-[10px] text-white/40 pressable px-2 py-1 rounded-full glass-1">close</button>
                </div>
              </div>

              <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[180px]">
                {messages.length === 0 && (
                  <p className="text-[12px] text-white/40 leading-relaxed">
                    Not a chatbot — wired to taste graph, recommendations, journey, player, and playlist drafts. Try a command below.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "text-[#e8a06a]/95 text-right" : "text-[#f0ebe3]/90"
                  }`}>{m.text}</div>
                ))}
                {busy && <p className="text-[11px] text-white/35">Thinking through the graph…</p>}
              </div>

              {pendingConfirm && (
                <div className="px-4 pb-2">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-amber-100/90">{pendingConfirm.summary}</p>
                    <button type="button" disabled={busy} onClick={() => send("confirm", pendingConfirm.confirmId)} className="pressable shrink-0 rounded-full bg-[#e8a06a] text-[#1a0e08] text-[11px] font-semibold px-3 py-1">Confirm</button>
                  </div>
                </div>
              )}

              {draft && (
                <div className="px-4 pb-1">
                  <p className="text-[10px] text-white/35">Draft: {draft.title} · {draft.trackIds.length} tracks</p>
                </div>
              )}

              <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={busy} onClick={() => send(s)} className="shrink-0 text-[10px] px-2.5 py-1 rounded-full glass-1 text-white/50 pressable">{s}</button>
                ))}
              </div>

              <form className="flex gap-2 p-3 border-t border-white/10" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="make it darker · why this track · new songs…" className="flex-1 bg-white/5 border border-white/10 rounded-full px-3.5 py-2 text-[13px] text-[#f8f4ee] outline-none focus:border-[#e8a06a]/40" disabled={busy} />
                <button type="submit" disabled={busy || !input.trim()} className="pressable rounded-full px-4 py-2 text-[12px] font-semibold disabled:opacity-40" style={{ background: "linear-gradient(145deg, #e8a06a, #c4783a)", color: "#1a0e08" }}>Send</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
