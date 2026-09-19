"""LangGraph workflow wiring (AI Orchestrator block).

guard_input ─┬─(blocked)──────────────────────────────► END
             └─► plan ─┬─(retrieve)─► retrieve ─► generate ─► evaluate ─┐
                       ├─(tool)─────► tools ────► generate ─► evaluate ─┤
                       └─(direct)───► generate ─► evaluate ─────────────┤
                                                                        │
                    reflect ◄──(low groundedness, ReAct/Reflexion loop)──┤
                       │                                                │
                       └─► retrieve (re-query)                          │
                                                                        ▼
                                                                guard_output ─► END
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Any

from langgraph.graph import END, START, StateGraph

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.observability import AGENT_RUNS, AGENT_STEPS
from app.guardrails.pipeline import Guardrails
from app.llm.registry import InstrumentedLLM
from app.memory.manager import MemoryManager
from app.orchestrator.nodes import AgentNodes
from app.orchestrator.state import AgentState
from app.orchestrator.tools import ToolRegistry
from app.rag.pipeline import RagPipeline

log = get_logger(__name__)


@dataclass
class AgentReply:
    answer: str
    citations: list[dict[str, Any]]
    route: str
    steps: list[str]
    safety: dict[str, Any]
    tool_calls: list[dict[str, Any]]
    llm: dict[str, Any]
    groundedness: float
    latency_ms: float
    conversation_id: str


def _route_after_plan(state: AgentState) -> str:
    return state.get("route", "retrieve")


def _route_after_guard_input(state: AgentState) -> str:
    return "blocked" if state.get("blocked") else "continue"


def _route_after_evaluate(state: AgentState) -> str:
    return "reflect" if state.get("should_retry") else "finish"


def _cited_only(answer: str, citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Surface only the sources the answer actually references.

    Retrieval intentionally over-fetches; showing every candidate as a "source"
    misrepresents what the answer was built from.
    """
    used = {int(n) for n in re.findall(r"\[(\d+)\]", answer)}
    if not used:
        return citations
    return [c for c in citations if c.get("ref") in used]


def build_agent_graph(nodes: AgentNodes):
    graph = StateGraph(AgentState)

    graph.add_node("guard_input", nodes.guard_input)
    graph.add_node("plan", nodes.plan)
    graph.add_node("retrieve", nodes.retrieve)
    graph.add_node("tools", nodes.use_tools)
    graph.add_node("generate", nodes.generate)
    graph.add_node("evaluate", nodes.evaluate)
    graph.add_node("reflect", nodes.reflect)
    graph.add_node("guard_output", nodes.guard_output)

    graph.add_edge(START, "guard_input")
    graph.add_conditional_edges(
        "guard_input", _route_after_guard_input, {"blocked": END, "continue": "plan"}
    )
    graph.add_conditional_edges(
        "plan",
        _route_after_plan,
        {"retrieve": "retrieve", "tool": "tools", "direct": "generate"},
    )
    graph.add_edge("retrieve", "generate")
    graph.add_edge("tools", "generate")
    graph.add_edge("generate", "evaluate")
    graph.add_conditional_edges(
        "evaluate", _route_after_evaluate, {"reflect": "reflect", "finish": "guard_output"}
    )
    graph.add_edge("reflect", "retrieve")  # Reflexion loop: re-query with critique
    graph.add_edge("guard_output", END)

    return graph.compile()


class AgentService:
    """Public entry point used by the API layer."""

    def __init__(
        self,
        *,
        rag: RagPipeline,
        llm: InstrumentedLLM,
        guardrails: Guardrails,
        memory: MemoryManager,
        tools: ToolRegistry,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.memory = memory
        self.nodes = AgentNodes(
            rag=rag,
            llm=llm,
            guardrails=guardrails,
            memory=memory,
            tools=tools,
            settings=self.settings,
        )
        self.graph = build_agent_graph(self.nodes)

    def run(
        self, *, question: str, user_id: str = "anonymous", conversation_id: str | None = None
    ) -> AgentReply:
        started = time.perf_counter()
        cid = self.memory.start_conversation(conversation_id, user_id)

        self.memory.learn_from_message(user_id, question)
        initial: AgentState = {
            "question": question,
            "user_id": user_id,
            "conversation_id": cid,
            "memory_summary": self.memory.profile_summary(user_id),
            "history": self.memory.history_text(cid),
            "steps": [],
            "citations": [],
            "tool_calls": [],
        }

        try:
            final: AgentState = self.graph.invoke(
                initial, config={"recursion_limit": self.settings.max_agent_steps * 4}
            )
            outcome = "blocked" if final.get("blocked") else "ok"
        except Exception as exc:
            AGENT_RUNS.labels("error").inc()
            log.error("agent.run_failed", error=str(exc))
            raise

        AGENT_RUNS.labels(outcome).inc()
        AGENT_STEPS.observe(len(final.get("steps", [])))

        answer = final.get("answer") or final.get("draft") or ""
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        citations = _cited_only(answer, final.get("citations", []))

        self.memory.append_turn(cid, "user", question)
        self.memory.append_turn(
            cid, "assistant", answer, {"route": final.get("route"), "latency_ms": latency_ms}
        )
        self.memory.update_session(
            cid, last_route=final.get("route"), last_groundedness=final.get("groundedness", 0.0)
        )

        return AgentReply(
            answer=answer,
            citations=citations,
            route=final.get("route", "blocked" if final.get("blocked") else "unknown"),
            steps=final.get("steps", []),
            safety=final.get("safety", {}),
            tool_calls=final.get("tool_calls", []),
            llm=final.get("llm", {}),
            groundedness=final.get("groundedness", 0.0),
            latency_ms=latency_ms,
            conversation_id=cid,
        )
