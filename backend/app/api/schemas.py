"""Request/response contracts — input validation lives here (API gateway block)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = Field(default=None, max_length=64)
    user_id: str = Field(default="anonymous", max_length=128)


class Citation(BaseModel):
    ref: int
    document_id: str
    title: str
    source: str
    section: str | None = None
    score: float
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation] = []
    route: str
    steps: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    safety: dict[str, Any] = {}
    llm: dict[str, Any] = {}
    groundedness: float = 0.0
    latency_ms: float = 0.0
    conversation_id: str


class RagQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    top_k: int | None = Field(default=None, ge=1, le=50)
    top_n: int | None = Field(default=None, ge=1, le=20)


class RagChunk(BaseModel):
    id: str
    score: float
    vector_score: float
    lexical_score: float
    text: str
    metadata: dict[str, Any] = {}


class RagQueryResponse(BaseModel):
    query: str
    chunks: list[RagChunk]
    citations: list[Citation]
    context_chars: int
    latency_ms: float


class IngestTextRequest(BaseModel):
    title: str = Field(min_length=1, max_length=256)
    text: str = Field(min_length=1, max_length=500_000)
    source: str = Field(default="api", max_length=256)
    content_type: Literal["text/plain", "text/markdown", "text/html"] = "text/plain"


class IngestResponse(BaseModel):
    document_id: str
    title: str
    chunks: int
    content_type: str
    bytes: int


class DocumentSummary(BaseModel):
    id: str
    title: str
    source: str
    content_type: str
    chunk_count: int
    created_at: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    environment: str
    components: dict[str, Any]


class ToolSummary(BaseModel):
    name: str
    description: str
    permission: str
    parameters: dict[str, str]
    allowed: bool


class MemoryResponse(BaseModel):
    user_id: str
    profile: str
    facts: list[dict[str, Any]]
    conversation_id: str | None = None
    turns: list[dict[str, Any]] = []


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    request_id: str | None = None
