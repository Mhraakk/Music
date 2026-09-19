"""Agent nodes: guard → plan → retrieve/tool → generate → evaluate → reflect → guard."""

from __future__ import annotations

import re
from typing import Any

from app.config import Settings
from app.core.logging import get_logger
from app.guardrails.pipeline import Guardrails
from app.llm.base import ChatMessage
from app.llm.prompts import build_rag_prompt
from app.llm.registry import InstrumentedLLM
from app.memory.manager import MemoryManager
from app.orchestrator.state import AgentState
from app.orchestrator.tools import ToolCall, ToolRegistry
from app.rag.pipeline import RagPipeline

log = get_logger(__name__)

# Actionable requests go to tools; explanatory questions go to retrieval even
# when they mention domain nouns like "track" or "catalog".
_ACTION_INTENT = re.compile(
    r"\b(recommend|suggest|play|queue|show me|give me|find me|list)\b", re.I
)
_AGGREGATE_INTENT = re.compile(
    r"\b(how many|how much|count|statistics|stats|average|oldest|newest)\b", re.I
)
_KNOWLEDGE_QUESTION = re.compile(
    r"\b(what|how|why|which|when|who|explain|describe|difference|mean|means|happens?|work|works)\b",
    re.I,
)
_MOOD_WORDS = re.compile(
    r"\b(warm|cozy|dark|noir|sad|melancholy|calm|quiet|energetic|fast|organic|acoustic)\b", re.I
)
_SMALLTALK = re.compile(r"^\s*(hi|hello|hey|thanks|thank you|salam|سلام|مرسی)\b[\s!.?]*$", re.I)


class AgentNodes:
    """Node implementations bound to the concrete services they need."""

    def __init__(
        self,
        *,
        rag: RagPipeline,
        llm: InstrumentedLLM,
        guardrails: Guardrails,
        memory: MemoryManager,
        tools: ToolRegistry,
        settings: Settings,
    ) -> None:
        self.rag = rag
        self.llm = llm
        self.guardrails = guardrails
        self.memory = memory
        self.tools = tools
        self.settings = settings

    # ---------------------------------------------------------------- guard
    def guard_input(self, state: AgentState) -> dict[str, Any]:
        question = state.get("question", "")
        outcome = self.guardrails.check_input(question)
        steps = [*state.get("steps", []), "guard_input"]
        if not outcome.allowed:
            return {
                "blocked": True,
                "answer": outcome.text,
                "sanitized_question": question,
                "safety": {"blocked": True, "input_rules": outcome.rule_names},
                "steps": steps,
                "attempts": 0,
            }
        return {
            "blocked": False,
            "sanitized_question": outcome.text,
            "safety": {"blocked": False, "input_rules": outcome.rule_names},
            "steps": steps,
            "attempts": 0,
        }

    # ----------------------------------------------------------------- plan
    def plan(self, state: AgentState) -> dict[str, Any]:
        question = state.get("sanitized_question", "")
        steps = [*state.get("steps", []), "plan"]

        if _SMALLTALK.match(question):
            route, reason = "direct", "small talk"
        elif _AGGREGATE_INTENT.search(question):
            route, reason = "tool", "aggregate question — query the catalog"
        elif _ACTION_INTENT.search(question):
            route, reason = "tool", "actionable request — call a catalog tool"
        elif _MOOD_WORDS.search(question) and not _KNOWLEDGE_QUESTION.search(question):
            route, reason = "tool", "mood request — recommend from the catalog"
        else:
            route, reason = "retrieve", "knowledge question — use RAG"

        log.info("agent.plan", route=route, reason=reason)
        return {"route": route, "plan_reason": reason, "steps": steps}

    # ------------------------------------------------------------- retrieve
    def retrieve(self, state: AgentState) -> dict[str, Any]:
        question = state.get("sanitized_question", "")
        critique = state.get("critique", "")
        query = f"{question} {critique}".strip() if critique else question

        result = self.rag.retrieve(query)
        citations = [
            {
                "ref": c.ref,
                "document_id": c.document_id,
                "title": c.title,
                "source": c.source,
                "section": c.section,
                "score": c.score,
                "snippet": c.snippet,
            }
            for c in result.citations
        ]
        return {
            "context": result.context,
            "citations": citations,
            "retrieval_latency_ms": result.latency_ms,
            "steps": [*state.get("steps", []), "retrieve"],
        }

    # ----------------------------------------------------------------- tool
    def use_tools(self, state: AgentState) -> dict[str, Any]:
        question = state.get("sanitized_question", "")
        calls: list[ToolCall] = []

        mood = _MOOD_WORDS.search(question)
        if mood:
            calls.append(ToolCall("recommend_by_mood", {"mood": mood.group(0).lower(), "limit": 5}))
        if re.search(r"\b(how many|statistics|stats|count)\b", question, re.I):
            calls.append(ToolCall("catalog_stats", {}))
        if not calls:
            calls.append(ToolCall("catalog_search", {"query": question, "limit": 5}))

        results = [self.tools.invoke(call) for call in calls]
        rendered = self._render_tool_context(results)

        return {
            "tool_calls": [{"name": c.name, "args": c.args} for c in calls],
            "tool_results": [
                {"name": r.name, "ok": r.ok, "data": r.data, "error": r.error} for r in results
            ],
            "context": rendered,
            "citations": self._tool_citations(results),
            "steps": [*state.get("steps", []), "tools"],
        }

    @staticmethod
    def _render_tool_context(results: list[Any]) -> str:
        """Render tool output as quotable prose so answers stay grounded and readable."""
        blocks: list[str] = []
        for i, res in enumerate(results, start=1):
            if not res.ok:
                continue
            lines = [f"[{i}] Tool: {res.name}"]
            data = res.data

            if res.name == "catalog_stats":
                lines.append(
                    f"- The RESONANT catalog contains {data.get('total')} tracks "
                    f"from {data.get('artists')} distinct artists."
                )
                if data.get("year_min") and data.get("year_max"):
                    lines.append(
                        f"- Catalog release years span {data['year_min']} to {data['year_max']}."
                    )
                if data.get("avg_obscurity") is not None:
                    lines.append(
                        f"- Average catalog obscurity is {data['avg_obscurity']} on a 0 to 1 scale."
                    )
            elif data.get("tracks"):
                label = data.get("mood") or data.get("query") or "your request"
                lines.append(f"- Catalog tracks matching {label}:")
                for t in data["tracks"]:
                    extra = t.get("why") or t.get("emotion") or ""
                    lines.append(
                        f"- {t.get('title')} by {t.get('artist')}"
                        + (f" — {extra}" if extra else "")
                    )
            else:
                for key, value in data.items():
                    if key in {"query", "mood"}:
                        continue
                    lines.append(f"- {key.replace('_', ' ')}: {value}")

            blocks.append("\n".join(lines))
        return "\n\n---\n\n".join(blocks)

    @staticmethod
    def _tool_citations(results: list[Any]) -> list[dict[str, Any]]:
        citations: list[dict[str, Any]] = []
        for i, res in enumerate(results, start=1):
            if not res.ok:
                continue
            citations.append(
                {
                    "ref": i,
                    "document_id": f"tool:{res.name}",
                    "title": f"Tool · {res.name}",
                    "source": "resonant-catalog",
                    "section": None,
                    "score": 1.0,
                    "snippet": str(res.data)[:200],
                }
            )
        return citations

    # ------------------------------------------------------------- generate
    def generate(self, state: AgentState) -> dict[str, Any]:
        question = state.get("sanitized_question", "")
        context = state.get("context", "")
        memory_summary = state.get("memory_summary", "")

        if state.get("route") == "direct" and not context:
            draft = (
                "Hi — I'm RESONANT's assistant. Ask me about the track catalog, how the "
                "recommendation engine works, or the platform architecture."
            )
            return {
                "draft": draft,
                "llm": {"provider": "rule", "model": "greeting"},
                "steps": [*state.get("steps", []), "generate"],
            }

        prompt = build_rag_prompt(question, context, memory_summary)
        messages = [ChatMessage(role=m["role"], content=m["content"]) for m in prompt]  # type: ignore[arg-type]
        response = self.llm.complete(messages)

        return {
            "draft": response.text,
            "llm": {
                "provider": response.provider,
                "model": response.model,
                "finish_reason": response.finish_reason,
                "prompt_tokens": response.prompt_tokens,
                "completion_tokens": response.completion_tokens,
                **response.metadata,
            },
            "steps": [*state.get("steps", []), "generate"],
        }

    # ------------------------------------------------------------- evaluate
    def evaluate(self, state: AgentState) -> dict[str, Any]:
        from app.guardrails.rules import check_groundedness

        draft = state.get("draft", "")
        context = state.get("context", "")
        attempts = state.get("attempts", 0) + 1

        score, grounded = check_groundedness(draft, context, self.settings.groundedness_threshold)
        should_retry = bool(
            self.settings.enable_reflexion
            and context
            and not grounded
            and attempts < 2
            and state.get("route") == "retrieve"
        )
        critique = ""
        if should_retry:
            critique = "focus on the specific terms in the question; expand with synonyms"

        log.info(
            "agent.evaluate",
            groundedness=score,
            grounded=grounded,
            attempts=attempts,
            retry=should_retry,
        )
        return {
            "groundedness": score,
            "grounded": grounded,
            "attempts": attempts,
            "should_retry": should_retry,
            "critique": critique,
            "steps": [*state.get("steps", []), "evaluate"],
        }

    # -------------------------------------------------------------- reflect
    def reflect(self, state: AgentState) -> dict[str, Any]:
        log.info("agent.reflect", attempt=state.get("attempts", 0))
        return {"steps": [*state.get("steps", []), "reflect"]}

    # --------------------------------------------------------- guard output
    def guard_output(self, state: AgentState) -> dict[str, Any]:
        draft = state.get("draft", "")
        context = state.get("context", "")
        outcome = self.guardrails.check_output(draft, context)
        safety = dict(state.get("safety", {}))
        safety.update(
            {
                "output_rules": outcome.rule_names,
                "groundedness": outcome.metadata.get(
                    "groundedness", state.get("groundedness", 0.0)
                ),
                "grounded": outcome.metadata.get("grounded", state.get("grounded", False)),
                "pii_redacted": outcome.metadata.get("pii_redacted", False),
                "blocked": not outcome.allowed,
            }
        )
        return {
            "answer": outcome.text,
            "safety": safety,
            "steps": [*state.get("steps", []), "guard_output"],
        }
