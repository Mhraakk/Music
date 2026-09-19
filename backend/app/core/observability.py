"""Prometheus metrics + lightweight tracing spans (OpenTelemetry-compatible shape)."""

from __future__ import annotations

import time
from collections.abc import Iterator
from contextlib import contextmanager

from prometheus_client import Counter, Gauge, Histogram

REQUESTS = Counter(
    "resonant_http_requests_total",
    "HTTP requests processed",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "resonant_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
)
AGENT_RUNS = Counter("resonant_agent_runs_total", "Agent graph executions", ["outcome"])
AGENT_STEPS = Histogram(
    "resonant_agent_steps", "Nodes executed per agent run", buckets=(1, 2, 3, 4, 5, 6, 8, 12)
)
LLM_CALLS = Counter("resonant_llm_calls_total", "LLM completions", ["provider", "model", "outcome"])
LLM_LATENCY = Histogram("resonant_llm_duration_seconds", "LLM call latency", ["provider"])
RETRIEVALS = Counter("resonant_retrievals_total", "RAG retrievals executed")
RETRIEVED_CHUNKS = Histogram(
    "resonant_retrieved_chunks", "Chunks returned per retrieval", buckets=(0, 1, 2, 4, 8, 16, 32)
)
GUARDRAIL_BLOCKS = Counter(
    "resonant_guardrail_blocks_total", "Guardrail interventions", ["stage", "rule"]
)
INDEXED_CHUNKS = Gauge("resonant_indexed_chunks", "Chunks currently indexed")


@contextmanager
def span(name: str) -> Iterator[dict[str, float]]:
    """Minimal span; swap for an OTel tracer without touching call sites."""
    start = time.perf_counter()
    ctx: dict[str, float] = {}
    try:
        yield ctx
    finally:
        ctx["duration_ms"] = (time.perf_counter() - start) * 1000
        ctx["name"] = name  # type: ignore[assignment]
