"""Reranking stage: re-scores vector hits with lexical evidence.

Vector recall is broad; this narrows it using term coverage, phrase proximity
and title/section boosts. A cross-encoder can be dropped in behind the same
interface when GPU budget allows.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.rag.embeddings import tokenize
from app.storage.vector_store import SearchHit


@dataclass
class RankedChunk:
    id: str
    text: str
    metadata: dict[str, Any]
    vector_score: float
    lexical_score: float
    score: float


def _coverage(query_tokens: list[str], doc_tokens: set[str]) -> float:
    if not query_tokens:
        return 0.0
    hits = sum(1 for t in query_tokens if t in doc_tokens)
    return hits / len(query_tokens)


def _phrase_bonus(query_tokens: list[str], text_lower: str) -> float:
    if len(query_tokens) < 2:
        return 0.0
    bonus = 0.0
    for i in range(len(query_tokens) - 1):
        if f"{query_tokens[i]} {query_tokens[i + 1]}" in text_lower:
            bonus += 0.08
    return min(bonus, 0.24)


def rerank(query: str, hits: list[SearchHit], top_n: int) -> list[RankedChunk]:
    query_tokens = tokenize(query)
    ranked: list[RankedChunk] = []

    for hit in hits:
        text_lower = hit.text.lower()
        doc_tokens = set(tokenize(hit.text))
        coverage = _coverage(query_tokens, doc_tokens)
        lexical = coverage + _phrase_bonus(query_tokens, text_lower)

        section = str(hit.metadata.get("section") or "")
        title = str(hit.metadata.get("title") or "")
        heading_tokens = set(tokenize(f"{section} {title}"))
        if heading_tokens and query_tokens:
            lexical += 0.15 * _coverage(query_tokens, heading_tokens)

        combined = 0.55 * hit.score + 0.45 * min(lexical, 1.2)
        ranked.append(
            RankedChunk(
                id=hit.id,
                text=hit.text,
                metadata=hit.metadata,
                vector_score=hit.score,
                lexical_score=round(lexical, 4),
                score=round(combined, 4),
            )
        )

    ranked.sort(key=lambda r: r.score, reverse=True)

    # keep at most 2 chunks per document so one file cannot monopolise context
    per_doc: dict[str, int] = {}
    diversified: list[RankedChunk] = []
    for chunk in ranked:
        doc_id = str(chunk.metadata.get("document_id", chunk.id))
        if per_doc.get(doc_id, 0) >= 2:
            continue
        per_doc[doc_id] = per_doc.get(doc_id, 0) + 1
        diversified.append(chunk)
        if len(diversified) >= top_n:
            break

    return diversified
