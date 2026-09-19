"""Embedding providers.

`local` is a deterministic hashed bag-of-ngrams embedder: no network, no model
download, reproducible in CI, and good enough for lexical-semantic retrieval on
a curated corpus. `openai` swaps in hosted embeddings without touching callers.
"""

from __future__ import annotations

import hashlib
import math
import re
from typing import Protocol

import httpx

from app.config import Settings, get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

_TOKEN = re.compile(r"[a-z0-9\u0600-\u06ff]+")
_STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "is",
    "are",
    "was",
    "were",
    "it",
    "this",
    "that",
    "for",
    "on",
    "with",
    "as",
    "by",
    "at",
    "from",
    "be",
    "how",
    "what",
    "which",
    "does",
    "do",
    "you",
    "i",
    "we",
    "they",
    "can",
}


def tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1]


class Embedder(Protocol):
    dimension: int

    def embed(self, texts: list[str]) -> list[list[float]]: ...

    def embed_one(self, text: str) -> list[float]: ...


class LocalHashEmbedder:
    """Feature-hashing embedder with sublinear TF weighting and L2 norm."""

    def __init__(self, dimension: int = 256) -> None:
        self.dimension = dimension

    def _bucket(self, token: str) -> tuple[int, float]:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        value = int.from_bytes(digest, "big")
        index = value % self.dimension
        sign = 1.0 if (value >> 63) & 1 else -1.0
        return index, sign

    def embed_one(self, text: str) -> list[float]:
        tokens = tokenize(text)
        vector = [0.0] * self.dimension
        if not tokens:
            return vector
        counts: dict[str, int] = {}
        for token in tokens:
            counts[token] = counts.get(token, 0) + 1
        # unigrams plus adjacent bigrams for a little word-order signal
        for i in range(len(tokens) - 1):
            bigram = f"{tokens[i]}_{tokens[i + 1]}"
            counts[bigram] = counts.get(bigram, 0) + 1

        for token, count in counts.items():
            index, sign = self._bucket(token)
            weight = 1.0 + math.log(count)
            if "_" in token:
                weight *= 0.6  # bigrams support, not dominate
            vector[index] += sign * weight

        norm = math.sqrt(sum(v * v for v in vector))
        if norm == 0:
            return vector
        return [v / norm for v in vector]

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_one(t) for t in texts]


class OpenAIEmbedder:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self.dimension = settings.embedding_dim
        self._model = settings.embedding_model
        self._client = httpx.Client(
            base_url=settings.openai_base_url,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            timeout=30,
        )

    def embed(self, texts: list[str]) -> list[list[float]]:
        resp = self._client.post("/embeddings", json={"model": self._model, "input": texts})
        resp.raise_for_status()
        data = resp.json()["data"]
        return [item["embedding"] for item in data]

    def embed_one(self, text: str) -> list[float]:
        return self.embed([text])[0]


def build_embedder(settings: Settings | None = None) -> Embedder:
    s = settings or get_settings()
    if s.embedding_provider == "openai" and s.openai_api_key:
        try:
            return OpenAIEmbedder(s)
        except Exception as exc:
            log.error("embeddings.openai_unavailable", error=str(exc))
    return LocalHashEmbedder(dimension=s.embedding_dim)
