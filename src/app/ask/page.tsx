"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Citation = {
  ref: number;
  document_id: string;
  title: string;
  source: string;
  section: string | null;
  score: number;
  snippet: string;
};

type ChatResponse = {
  answer: string;
  citations: Citation[];
  route: string;
  steps: string[];
  tool_calls: { name: string }[];
  safety: { blocked?: boolean; groundedness?: number; input_rules?: string[] };
  llm: { provider?: string; model?: string };
  groundedness: number;
  latency_ms: number;
  conversation_id: string;
  error?: string;
};

type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: ChatResponse;
  failed?: boolean;
};

const SUGGESTIONS = [
  "What are the five stages of the RAG pipeline?",
  "How does rejection memory work?",
  "How many tracks are in the catalog?",
  "Recommend something dark",
];

const ROUTE_LABEL: Record<string, string> = {
  retrieve: "RAG retrieval",
  tool: "Tool call",
  direct: "Direct answer",
  blocked: "Blocked by guardrails",
};

export default function AskPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/health")
      .then((r) => r.json())
      .then((d) => setBackendUp(Boolean(d.reachable)))
      .catch(() => setBackendUp(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    const userTurn: Turn = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    setTurns((prev) => [...prev, userTurn]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversation_id: conversationId }),
      });
      const data: ChatResponse = await res.json();

      if (!res.ok) {
        setTurns((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: data.error ?? "The assistant could not answer.",
            failed: true,
          },
        ]);
        return;
      }

      setConversationId(data.conversation_id);
      setBackendUp(true);
      setTurns((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: data.answer, meta: data },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Network error talking to the AI backend.",
          failed: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 py-8 pb-safe">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.3em] text-white/40">RESONANT</p>
          <h1 className="display mt-1 text-3xl">Ask</h1>
          <p className="mt-1 text-sm text-white/50">
            Grounded answers from the knowledge base and live catalog tools.
          </p>
        </div>
        <Link
          href="/"
          className="pressable glass-2 glass-edge shrink-0 rounded-full px-4 py-2 text-xs text-white/70"
        >
          Back
        </Link>
      </header>

      <div className="flex items-center gap-2 text-xs">
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full ${
            backendUp === null ? "bg-white/30" : backendUp ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
        <span className="text-white/45">
          {backendUp === null
            ? "Checking AI backend…"
            : backendUp
              ? "AI backend connected"
              : "AI backend offline — start it in ./backend"}
        </span>
      </div>

      <section className="flex flex-1 flex-col gap-4" aria-live="polite">
        {turns.length === 0 && (
          <div className="glass-1 glass-edge rounded-2xl p-5">
            <p className="text-sm text-white/60">Try one of these:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="pressable glass-2 rounded-full px-3 py-1.5 text-xs text-white/75"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.id} className="self-end">
              <div className="glass-3 glass-edge max-w-[85%] rounded-2xl px-4 py-3 text-sm">
                {turn.text}
              </div>
            </div>
          ) : (
            <article key={turn.id} className="glass-1 glass-edge rounded-2xl p-4">
              {turn.meta && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                    {ROUTE_LABEL[turn.meta.route] ?? turn.meta.route}
                  </span>
                  {turn.meta.safety?.blocked && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">
                      guardrail blocked
                    </span>
                  )}
                  <span className="text-white/35">
                    grounding {Math.round((turn.meta.groundedness ?? 0) * 100)}%
                  </span>
                  <span className="text-white/35">{Math.round(turn.meta.latency_ms)} ms</span>
                  <span className="text-white/35">
                    {turn.meta.llm?.provider}/{turn.meta.llm?.model}
                  </span>
                </div>
              )}

              <div
                className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  turn.failed ? "text-amber-300" : "text-white/85"
                }`}
              >
                {turn.text}
              </div>

              {turn.meta?.citations && turn.meta.citations.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-[11px] tracking-wide text-white/40">SOURCES</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {turn.meta.citations.map((c) => (
                      <li key={`${turn.id}-${c.ref}`} className="text-xs text-white/55">
                        <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-white/70">
                          {c.ref}
                        </span>
                        <span className="text-white/75">{c.title}</span>
                        {c.section && <span className="text-white/40"> › {c.section}</span>}
                        <span className="ml-1.5 text-white/30">score {c.score.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {turn.meta?.steps && turn.meta.steps.length > 0 && (
                <p className="mt-3 text-[11px] text-white/25">
                  graph: {turn.meta.steps.join(" → ")}
                </p>
              )}
            </article>
          )
        )}

        {busy && (
          <div className="glass-1 glass-edge rounded-2xl px-4 py-3 text-sm text-white/45">
            Thinking…
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="glass-2 glass-edge sticky bottom-4 flex items-center gap-2 rounded-full p-2"
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask the RESONANT assistant
        </label>
        <input
          id="ask-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the engine, catalog or architecture…"
          disabled={busy}
          className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="pressable glow-accent rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </main>
  );
}
