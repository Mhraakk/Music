"""Vector database abstraction.

`memory` runs in-process with numpy cosine similarity (zero infra, used in dev
and CI). `qdrant` talks to a real Qdrant cluster. Both satisfy the same
protocol, so the RAG pipeline is storage-agnostic.
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import numpy as np

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.observability import INDEXED_CHUNKS

log = get_logger(__name__)


@dataclass
class VectorRecord:
    id: str
    text: str
    embedding: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchHit:
    id: str
    text: str
    score: float
    metadata: dict[str, Any] = field(default_factory=dict)


class VectorStore(Protocol):
    def upsert(self, records: list[VectorRecord]) -> int: ...
    def search(self, embedding: list[float], top_k: int) -> list[SearchHit]: ...
    def delete_by_document(self, document_id: str) -> int: ...
    def count(self) -> int: ...
    def health(self) -> dict[str, Any]: ...


def _cosine(matrix: np.ndarray, query: np.ndarray) -> np.ndarray:
    if matrix.size == 0:
        return np.empty(0)
    denom = np.linalg.norm(matrix, axis=1) * np.linalg.norm(query)
    denom = np.where(denom == 0, 1e-9, denom)
    return (matrix @ query) / denom


class MemoryVectorStore:
    """In-process store with optional JSON persistence so restarts keep the index."""

    def __init__(self, persist_path: Path | None = None) -> None:
        self._records: dict[str, VectorRecord] = {}
        self._lock = threading.Lock()
        self._persist_path = persist_path
        self._load()

    def _load(self) -> None:
        if not self._persist_path or not self._persist_path.exists():
            return
        try:
            raw = json.loads(self._persist_path.read_text("utf-8"))
            for item in raw:
                rec = VectorRecord(**item)
                self._records[rec.id] = rec
            INDEXED_CHUNKS.set(len(self._records))
            log.info("vector_store.loaded", count=len(self._records))
        except Exception as exc:  # corrupted cache must never break boot
            log.warning("vector_store.load_failed", error=str(exc))

    def _persist(self) -> None:
        if not self._persist_path:
            return
        self._persist_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [
            {"id": r.id, "text": r.text, "embedding": r.embedding, "metadata": r.metadata}
            for r in self._records.values()
        ]
        self._persist_path.write_text(json.dumps(payload), encoding="utf-8")

    def upsert(self, records: list[VectorRecord]) -> int:
        with self._lock:
            for rec in records:
                self._records[rec.id] = rec
            self._persist()
            INDEXED_CHUNKS.set(len(self._records))
        return len(records)

    def search(self, embedding: list[float], top_k: int) -> list[SearchHit]:
        with self._lock:
            items = list(self._records.values())
        if not items:
            return []
        matrix = np.array([r.embedding for r in items], dtype=np.float32)
        scores = _cosine(matrix, np.array(embedding, dtype=np.float32))
        order = np.argsort(-scores)[:top_k]
        return [
            SearchHit(
                id=items[i].id,
                text=items[i].text,
                score=float(scores[i]),
                metadata=items[i].metadata,
            )
            for i in order
        ]

    def delete_by_document(self, document_id: str) -> int:
        with self._lock:
            victims = [
                rid
                for rid, rec in self._records.items()
                if rec.metadata.get("document_id") == document_id
            ]
            for rid in victims:
                del self._records[rid]
            self._persist()
            INDEXED_CHUNKS.set(len(self._records))
        return len(victims)

    def count(self) -> int:
        return len(self._records)

    def health(self) -> dict[str, Any]:
        return {"backend": "memory", "status": "up", "vectors": self.count()}


class QdrantVectorStore:
    """Qdrant-backed store. Imported lazily so the dep stays optional."""

    def __init__(self, settings: Settings) -> None:
        from qdrant_client import QdrantClient  # type: ignore[import-not-found]
        from qdrant_client.models import Distance, VectorParams  # type: ignore

        self._models = __import__("qdrant_client.models", fromlist=["models"])
        self._client = QdrantClient(
            url=settings.qdrant_url, api_key=settings.qdrant_api_key, timeout=10
        )
        self._collection = settings.vector_collection
        existing = {c.name for c in self._client.get_collections().collections}
        if self._collection not in existing:
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=VectorParams(size=settings.embedding_dim, distance=Distance.COSINE),
            )

    def upsert(self, records: list[VectorRecord]) -> int:
        points = [
            self._models.PointStruct(
                id=r.id, vector=r.embedding, payload={"text": r.text, **r.metadata}
            )
            for r in records
        ]
        self._client.upsert(collection_name=self._collection, points=points)
        return len(records)

    def search(self, embedding: list[float], top_k: int) -> list[SearchHit]:
        res = self._client.search(
            collection_name=self._collection, query_vector=embedding, limit=top_k
        )
        hits: list[SearchHit] = []
        for point in res:
            payload = dict(point.payload or {})
            text = payload.pop("text", "")
            hits.append(
                SearchHit(id=str(point.id), text=text, score=float(point.score), metadata=payload)
            )
        return hits

    def delete_by_document(self, document_id: str) -> int:
        self._client.delete(
            collection_name=self._collection,
            points_selector=self._models.FilterSelector(
                filter=self._models.Filter(
                    must=[
                        self._models.FieldCondition(
                            key="document_id",
                            match=self._models.MatchValue(value=document_id),
                        )
                    ]
                )
            ),
        )
        return 1

    def count(self) -> int:
        return int(self._client.count(self._collection, exact=True).count)

    def health(self) -> dict[str, Any]:
        try:
            return {"backend": "qdrant", "status": "up", "vectors": self.count()}
        except Exception as exc:
            return {"backend": "qdrant", "status": "down", "error": str(exc)}


def build_vector_store(settings: Settings | None = None) -> VectorStore:
    s = settings or get_settings()
    if s.vector_store == "qdrant":
        try:
            return QdrantVectorStore(s)
        except Exception as exc:  # fail soft to keep the service usable
            log.error("vector_store.qdrant_unavailable", error=str(exc))
    persist = None if s.environment == "test" else s.file_storage_dir / "vector_index.json"
    return MemoryVectorStore(persist_path=persist)
