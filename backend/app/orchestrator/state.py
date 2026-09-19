"""Shared state flowing through the LangGraph agent."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

Route = Literal["retrieve", "tool", "direct"]


class AgentState(TypedDict, total=False):
    # inputs
    question: str
    sanitized_question: str
    user_id: str
    conversation_id: str
    memory_summary: str
    history: str

    # planning
    route: Route
    plan_reason: str

    # retrieval
    context: str
    citations: list[dict[str, Any]]
    retrieval_latency_ms: float

    # tools
    tool_calls: list[dict[str, Any]]
    tool_results: list[dict[str, Any]]

    # generation / evaluation
    draft: str
    answer: str
    groundedness: float
    grounded: bool
    attempts: int
    should_retry: bool
    critique: str

    # safety + bookkeeping
    blocked: bool
    safety: dict[str, Any]
    steps: list[str]
    llm: dict[str, Any]
