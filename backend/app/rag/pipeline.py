"""RAG pipeline: Query → Embedding → Vector Search → Reranking → Relevant Context."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.observability import RETRIEVALS, RETRIEVED_CHUNKS, span
from app.rag.chunking import chunk_text
from app.rag.embeddings import Embedder
from app.rag.parsing import ParsedDocument, parse_bytes, parse_text
from app.rag.reranker import RankedChunk, rerank
from app.storage.database import DatabaseGateway, Document
from app.storage.vector_store import VectorRecord, VectorStore

log = get_logger(__name__)


@dataclass
class Citation:
    ref: int
    document_id: str
    title: str
    source: str
    section: str | None
    score: float
    snippet: str


@dataclass
class RetrievalResult:
    query: str
    chunks: list[RankedChunk] = field(default_factory=list)
    citations: list[Citation] = field(default_factory=list)
    context: str = ""
    latency_ms: float = 0.0

    @property
    def is_empty(self) -> bool:
        return not self.chunks


@dataclass
class IngestResult:
    document_id: str
    title: str
    chunks: int
    content_type: str
    bytes: int


class RagPipeline:
    def __init__(
        self,
        vector_store: VectorStore,
        embedder: Embedder,
        db: DatabaseGateway,
        settings: Settings | None = None,
    ) -> None:
        self.vector_store = vector_store
        self.embedder = embedder
        self.db = db
        self.settings = settings or get_settings()

    # ---------------- Ingestion (Knowledge & Data block) ----------------
    def ingest_document(
        self,
        *,
        title: str,
        source: str,
        parsed: ParsedDocument,
        extra_metadata: dict[str, Any] | None = None,
        document_id: str | None = None,
    ) -> IngestResult:
        doc_id = document_id or uuid.uuid4().hex[:16]
        base_meta: dict[str, Any] = {
            "document_id": doc_id,
            "title": title,
            "source": source,
            "content_type": parsed.content_type,
            **(extra_metadata or {}),
            **parsed.metadata,
        }

        chunks = chunk_text(
            parsed.text,
            chunk_size=self.settings.chunk_size,
            overlap=self.settings.chunk_overlap,
            base_metadata=base_meta,
        )
        if not chunks:
            log.warning("rag.ingest.empty", title=title, source=source)
            return IngestResult(doc_id, title, 0, parsed.content_type, len(parsed.text))

        # replace any previous version of this document
        self.vector_store.delete_by_document(doc_id)

        embeddings = self.embedder.embed([c.text for c in chunks])
        records = [
            VectorRecord(
                id=uuid.uuid5(uuid.NAMESPACE_URL, f"{doc_id}:{c.index}").hex,
                text=c.text,
                embedding=emb,
                metadata={**c.metadata, "chunk_index": c.index},
            )
            for c, emb in zip(chunks, embeddings, strict=True)
        ]
        self.vector_store.upsert(records)

        self.db.upsert_document(
            Document(
                id=doc_id,
                title=title,
                source=source,
                content_type=parsed.content_type,
                chunk_count=len(chunks),
                doc_metadata=extra_metadata or {},
            )
        )
        log.info("rag.ingest.ok", document_id=doc_id, title=title, chunks=len(chunks))
        return IngestResult(doc_id, title, len(chunks), parsed.content_type, len(parsed.text))

    def ingest_text(
        self, *, title: str, source: str, text: str, content_type: str = "text/plain"
    ) -> IngestResult:
        return self.ingest_document(
            title=title, source=source, parsed=parse_text(text, content_type)
        )

    def ingest_file(self, *, filename: str, data: bytes, source: str | None = None) -> IngestResult:
        return self.ingest_document(
            title=Path(filename).stem.replace("_", " ").replace("-", " ").title(),
            source=source or filename,
            parsed=parse_bytes(filename, data),
            extra_metadata={"filename": filename},
        )

    def seed_from_directory(self, directory: Path) -> list[IngestResult]:
        results: list[IngestResult] = []
        if not directory.exists():
            return results
        for path in sorted(directory.glob("**/*")):
            if not path.is_file() or path.suffix.lower() not in {".md", ".txt", ".html", ".pdf"}:
                continue
            results.append(
                self.ingest_document(
                    title=path.stem.replace("_", " ").replace("-", " ").title(),
                    source=f"seed://{path.name}",
                    parsed=parse_bytes(path.name, path.read_bytes()),
                    extra_metadata={"seed": True},
                    document_id=uuid.uuid5(uuid.NAMESPACE_URL, f"seed:{path.name}").hex[:16],
                )
            )
        return results

    # ---------------- Retrieval ----------------
    def retrieve(
        self, query: str, top_k: int | None = None, top_n: int | None = None
    ) -> RetrievalResult:
        top_k = top_k or self.settings.retrieval_top_k
        top_n = top_n or self.settings.rerank_top_n

        with span("rag.retrieve") as ctx:
            RETRIEVALS.inc()
            embedding = self.embedder.embed_one(query)
            hits = self.vector_store.search(embedding, top_k)
            ranked = rerank(query, hits, top_n)
            ranked = [r for r in ranked if r.score >= self.settings.min_relevance_score]
            RETRIEVED_CHUNKS.observe(len(ranked))

        citations: list[Citation] = []
        blocks: list[str] = []
        for i, chunk in enumerate(ranked, start=1):
            meta = chunk.metadata
            citations.append(
                Citation(
                    ref=i,
                    document_id=str(meta.get("document_id", "")),
                    title=str(meta.get("title", "Untitled")),
                    source=str(meta.get("source", "")),
                    section=meta.get("section"),
                    score=chunk.score,
                    snippet=chunk.text[:240].strip(),
                )
            )
            header = f"[{i}] {meta.get('title', 'Untitled')}"
            if meta.get("section"):
                header += f" › {meta['section']}"
            blocks.append(f"{header}\n{chunk.text}")

        result = RetrievalResult(
            query=query,
            chunks=ranked,
            citations=citations,
            context="\n\n---\n\n".join(blocks),
            latency_ms=round(ctx.get("duration_ms", 0.0), 2),
        )
        log.info(
            "rag.retrieve",
            query_len=len(query),
            candidates=len(hits),
            selected=len(ranked),
            latency_ms=result.latency_ms,
        )
        return result
