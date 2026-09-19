"""API v1 routers: chat (agent), RAG, documents, memory, tools, health."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentSummary,
    HealthResponse,
    IngestResponse,
    IngestTextRequest,
    MemoryResponse,
    RagQueryRequest,
    RagQueryResponse,
    ToolSummary,
)
from app.core.logging import get_logger
from app.core.security import require_api_key
from app.services import ServiceContainer, get_container

log = get_logger(__name__)

router = APIRouter()

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def container() -> ServiceContainer:
    return get_container()


# ----------------------------------------------------------------- health
health_router = APIRouter(tags=["health"])


@health_router.get("/health", response_model=HealthResponse)
def health(c: ServiceContainer = Depends(container)) -> HealthResponse:
    components = c.health()
    degraded = any(isinstance(v, dict) and v.get("status") == "down" for v in components.values())
    return HealthResponse(
        status="degraded" if degraded else "ok",
        service=c.settings.app_name,
        environment=c.settings.environment,
        components=components,
    )


@health_router.get("/ready")
def ready(c: ServiceContainer = Depends(container)) -> dict[str, object]:
    indexed = c.vector_store.count()
    return {"ready": indexed > 0, "indexed_chunks": indexed}


# ------------------------------------------------------------------- chat
@router.post("/chat", response_model=ChatResponse, tags=["agent"])
def chat(
    payload: ChatRequest,
    c: ServiceContainer = Depends(container),
    _: str = Depends(require_api_key),
) -> ChatResponse:
    reply = c.agent.run(
        question=payload.message,
        user_id=payload.user_id,
        conversation_id=payload.conversation_id,
    )
    return ChatResponse(
        answer=reply.answer,
        citations=reply.citations,  # type: ignore[arg-type]
        route=reply.route,
        steps=reply.steps,
        tool_calls=reply.tool_calls,
        safety=reply.safety,
        llm=reply.llm,
        groundedness=reply.groundedness,
        latency_ms=reply.latency_ms,
        conversation_id=reply.conversation_id,
    )


# -------------------------------------------------------------------- rag
@router.post("/rag/query", response_model=RagQueryResponse, tags=["rag"])
def rag_query(
    payload: RagQueryRequest,
    c: ServiceContainer = Depends(container),
    _: str = Depends(require_api_key),
) -> RagQueryResponse:
    result = c.rag.retrieve(payload.query, top_k=payload.top_k, top_n=payload.top_n)
    return RagQueryResponse(
        query=result.query,
        chunks=[
            {
                "id": ch.id,
                "score": ch.score,
                "vector_score": round(ch.vector_score, 4),
                "lexical_score": ch.lexical_score,
                "text": ch.text,
                "metadata": ch.metadata,
            }
            for ch in result.chunks
        ],  # type: ignore[arg-type]
        citations=[asdict(cit) for cit in result.citations],  # type: ignore[arg-type]
        context_chars=len(result.context),
        latency_ms=result.latency_ms,
    )


@router.post(
    "/rag/documents/text",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["rag"],
)
def ingest_text(
    payload: IngestTextRequest,
    c: ServiceContainer = Depends(container),
    _: str = Depends(require_api_key),
) -> IngestResponse:
    result = c.rag.ingest_text(
        title=payload.title,
        source=payload.source,
        text=payload.text,
        content_type=payload.content_type,
    )
    return IngestResponse(**result.__dict__)


@router.post(
    "/rag/documents/file",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["rag"],
)
async def ingest_file(
    file: UploadFile = File(...),
    c: ServiceContainer = Depends(container),
    _: str = Depends(require_api_key),
) -> IngestResponse:
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    stored = c.files.save(file.filename or "upload.bin", data)
    result = c.rag.ingest_file(
        filename=file.filename or "upload.bin", data=data, source=stored["path"]
    )
    return IngestResponse(**result.__dict__)


@router.get("/rag/documents", response_model=list[DocumentSummary], tags=["rag"])
def list_documents(
    c: ServiceContainer = Depends(container), _: str = Depends(require_api_key)
) -> list[DocumentSummary]:
    return [
        DocumentSummary(
            id=d.id,
            title=d.title,
            source=d.source,
            content_type=d.content_type,
            chunk_count=d.chunk_count,
            created_at=d.created_at.isoformat(),
        )
        for d in c.db.list_documents()
    ]


@router.delete("/rag/documents/{document_id}", tags=["rag"])
def delete_document(
    document_id: str,
    c: ServiceContainer = Depends(container),
    _: str = Depends(require_api_key),
) -> dict[str, object]:
    removed_vectors = c.vector_store.delete_by_document(document_id)
    removed_doc = c.db.delete_document(document_id)
    if not removed_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": document_id, "vectors_removed": removed_vectors}


# ------------------------------------------------------------------ tools
@router.get("/tools", response_model=list[ToolSummary], tags=["agent"])
def list_tools(
    c: ServiceContainer = Depends(container), _: str = Depends(require_api_key)
) -> list[ToolSummary]:
    return [ToolSummary(**spec) for spec in c.tools.list_specs()]


# ----------------------------------------------------------------- memory
@router.get("/memory/{user_id}", response_model=MemoryResponse, tags=["memory"])
def get_memory(
    user_id: str,
    conversation_id: str | None = None,
    c: ServiceContainer = Depends(container),
    _: str = Depends(require_api_key),
) -> MemoryResponse:
    facts = [
        {"kind": f.kind, "value": f.value, "confidence": f.confidence}
        for f in c.db.user_facts(user_id)
    ]
    turns = []
    if conversation_id:
        turns = [
            {"role": t.role, "content": t.content}
            for t in c.memory.short_term(conversation_id, limit=20)
        ]
    return MemoryResponse(
        user_id=user_id,
        profile=c.memory.profile_summary(user_id),
        facts=facts,
        conversation_id=conversation_id,
        turns=turns,
    )


@router.delete("/memory/{user_id}", tags=["memory"])
def forget_memory(
    user_id: str,
    c: ServiceContainer = Depends(container),
    _: str = Depends(require_api_key),
) -> dict[str, object]:
    removed = c.memory.forget_user(user_id)
    return {"user_id": user_id, "facts_removed": removed}
