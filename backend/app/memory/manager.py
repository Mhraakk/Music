"""Memory & State: short-term conversation buffer, session store, long-term facts."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.storage.cache import Cache
from app.storage.database import DatabaseGateway

log = get_logger(__name__)

_PREFERENCE = re.compile(
    r"\b(i\s+(?:really\s+)?(?:like|love|prefer|enjoy|hate|dislike)|my\s+favou?rite\s+is)\s+([^.!?\n]{3,80})",
    re.I,
)


@dataclass
class Turn:
    role: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class MemoryManager:
    def __init__(self, db: DatabaseGateway, cache: Cache, settings: Settings | None = None) -> None:
        self.db = db
        self.cache = cache
        self.settings = settings or get_settings()

    # --- session (ephemeral state) --------------------------------------
    def _session_key(self, conversation_id: str) -> str:
        return f"session:{conversation_id}"

    def get_session(self, conversation_id: str) -> dict[str, Any]:
        return self.cache.get(self._session_key(conversation_id)) or {}

    def update_session(self, conversation_id: str, **values: Any) -> dict[str, Any]:
        session = self.get_session(conversation_id)
        session.update(values)
        self.cache.set(
            self._session_key(conversation_id), session, self.settings.session_ttl_seconds
        )
        return session

    # --- short-term (conversation window) --------------------------------
    def start_conversation(self, conversation_id: str | None, user_id: str) -> str:
        cid = conversation_id or uuid.uuid4().hex[:16]
        self.db.ensure_conversation(cid, user_id)
        return cid

    def append_turn(
        self, conversation_id: str, role: str, content: str, metadata: dict[str, Any] | None = None
    ) -> None:
        self.db.add_message(conversation_id, role, content, metadata)

    def short_term(self, conversation_id: str, limit: int = 8) -> list[Turn]:
        rows = self.db.recent_messages(conversation_id, limit)
        return [Turn(role=r.role, content=r.content, metadata=r.msg_metadata or {}) for r in rows]

    def history_text(self, conversation_id: str, limit: int = 6) -> str:
        turns = self.short_term(conversation_id, limit)
        return "\n".join(f"{t.role}: {t.content}" for t in turns)

    # --- long-term (durable profile) -------------------------------------
    def learn_from_message(self, user_id: str, message: str) -> list[str]:
        learned: list[str] = []
        for match in _PREFERENCE.finditer(message):
            value = match.group(2).strip().rstrip(".,!")
            if len(value) < 3:
                continue
            verb = match.group(1).lower()
            kind = "dislike" if ("hate" in verb or "dislike" in verb) else "preference"
            self.db.add_user_fact(user_id, kind, value, confidence=0.7)
            learned.append(f"{kind}: {value}")
        if learned:
            log.info("memory.learned", user_id=user_id, facts=learned)
        return learned

    def profile_summary(self, user_id: str, limit: int = 8) -> str:
        facts = self.db.user_facts(user_id, limit)
        if not facts:
            return ""
        return "; ".join(f"{f.kind}: {f.value}" for f in facts)

    def forget_user(self, user_id: str) -> int:
        facts = self.db.user_facts(user_id, limit=1000)
        with self.db.session() as s, s.begin():
            for fact in facts:
                s.delete(s.merge(fact))
        return len(facts)
