"""Composition root: builds every service once and wires them together."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.guardrails.pipeline import Guardrails
from app.llm.registry import InstrumentedLLM, build_llm
from app.memory.manager import MemoryManager
from app.orchestrator.graph import AgentService
from app.orchestrator.tools import ToolRegistry, build_tool_registry
from app.rag.embeddings import Embedder, build_embedder
from app.rag.pipeline import RagPipeline
from app.sources.registry import SourceRegistry
from app.storage.cache import Cache, build_cache
from app.storage.database import DatabaseGateway
from app.storage.files import LocalFileStorage
from app.storage.vector_store import VectorStore, build_vector_store
from app.taste.profile import TasteMemory

log = get_logger(__name__)


@dataclass
class ServiceContainer:
    settings: Settings
    db: DatabaseGateway
    cache: Cache
    files: LocalFileStorage
    vector_store: VectorStore
    embedder: Embedder
    rag: RagPipeline
    llm: InstrumentedLLM
    guardrails: Guardrails
    memory: MemoryManager
    tools: ToolRegistry
    agent: AgentService
    sources: SourceRegistry
    taste: TasteMemory

    def health(self) -> dict[str, Any]:
        source_summary = self.sources.summary()
        return {
            "vector_store": self.vector_store.health(),
            "database": self.db.health(),
            "cache": self.cache.health(),
            "files": self.files.health(),
            "llm": self.llm.health(),
            "embeddings": {
                "provider": self.settings.embedding_provider,
                "dimension": self.embedder.dimension,
            },
            "music_sources": {
                "status": "up",
                "configured": source_summary["configured"],
                "total": source_summary["total"],
            },
        }

    def seed_knowledge(self) -> int:
        """Index the bundled knowledge corpus if the store is empty."""
        if self.vector_store.count() > 0:
            return 0
        results = self.rag.seed_from_directory(self.settings.knowledge_seed_dir)
        total = sum(r.chunks for r in results)
        log.info("knowledge.seeded", documents=len(results), chunks=total)
        return total


def build_container(settings: Settings | None = None) -> ServiceContainer:
    s = settings or get_settings()

    db = DatabaseGateway(s)
    cache = build_cache(s)
    files = LocalFileStorage(s)
    vector_store = build_vector_store(s)
    embedder = build_embedder(s)
    rag = RagPipeline(vector_store=vector_store, embedder=embedder, db=db, settings=s)
    llm = InstrumentedLLM(build_llm(s))
    guardrails = Guardrails(s)
    memory = MemoryManager(db=db, cache=cache, settings=s)
    sources = SourceRegistry(s)
    taste = TasteMemory(db)
    tools = build_tool_registry(granted={"read"}, sources=sources, taste=taste)
    agent = AgentService(
        rag=rag, llm=llm, guardrails=guardrails, memory=memory, tools=tools, settings=s
    )

    return ServiceContainer(
        settings=s,
        db=db,
        cache=cache,
        files=files,
        vector_store=vector_store,
        embedder=embedder,
        rag=rag,
        llm=llm,
        guardrails=guardrails,
        memory=memory,
        tools=tools,
        agent=agent,
        sources=sources,
        taste=taste,
    )


@lru_cache
def get_container() -> ServiceContainer:
    return build_container()
