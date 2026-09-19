"""Relational persistence (SQLite by default, PostgreSQL in production).

Holds documents, conversations, messages and long-term user profile facts —
the durable half of the "Memory & State" block.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.config import Settings, get_settings


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(512))
    source: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(String(64), default="text/plain")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    doc_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True, default="anonymous")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("conversations.id"), index=True
    )
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    msg_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class UserFact(Base):
    """Long-term memory: durable facts/preferences learned about a user."""

    __tablename__ = "user_facts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    kind: Mapped[str] = mapped_column(String(64))
    value: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.6)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class DatabaseGateway:
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings or get_settings()
        connect_args = {"check_same_thread": False} if s.database_url.startswith("sqlite") else {}
        self.engine = create_engine(s.database_url, connect_args=connect_args, future=True)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        # Imported for its side effect: the taste tables must be attached to the
        # shared metadata before create_all runs. Local import avoids a cycle.
        from app.storage import taste_models  # noqa: F401

        Base.metadata.create_all(self.engine)

    def session(self) -> Session:
        return self.session_factory()

    # --- documents -------------------------------------------------------
    def upsert_document(self, doc: Document) -> None:
        with self.session() as s, s.begin():
            s.merge(doc)

    def list_documents(self) -> list[Document]:
        with self.session() as s:
            return list(s.scalars(select(Document).order_by(Document.created_at.desc())))

    def delete_document(self, document_id: str) -> bool:
        with self.session() as s, s.begin():
            doc = s.get(Document, document_id)
            if not doc:
                return False
            s.delete(doc)
            return True

    # --- conversations ---------------------------------------------------
    def ensure_conversation(self, conversation_id: str, user_id: str) -> None:
        with self.session() as s, s.begin():
            if s.get(Conversation, conversation_id) is None:
                s.add(Conversation(id=conversation_id, user_id=user_id))

    def add_message(
        self, conversation_id: str, role: str, content: str, metadata: dict[str, Any] | None = None
    ) -> None:
        with self.session() as s, s.begin():
            s.add(
                Message(
                    conversation_id=conversation_id,
                    role=role,
                    content=content,
                    msg_metadata=metadata or {},
                )
            )

    def recent_messages(self, conversation_id: str, limit: int = 12) -> list[Message]:
        with self.session() as s:
            rows = list(
                s.scalars(
                    select(Message)
                    .where(Message.conversation_id == conversation_id)
                    .order_by(Message.id.desc())
                    .limit(limit)
                )
            )
        return list(reversed(rows))

    # --- long-term memory ------------------------------------------------
    def add_user_fact(self, user_id: str, kind: str, value: str, confidence: float = 0.6) -> None:
        with self.session() as s, s.begin():
            exists = s.scalars(
                select(UserFact).where(
                    UserFact.user_id == user_id,
                    UserFact.kind == kind,
                    UserFact.value == value,
                )
            ).first()
            if exists is None:
                s.add(UserFact(user_id=user_id, kind=kind, value=value, confidence=confidence))

    def user_facts(self, user_id: str, limit: int = 20) -> list[UserFact]:
        with self.session() as s:
            return list(
                s.scalars(
                    select(UserFact)
                    .where(UserFact.user_id == user_id)
                    .order_by(UserFact.created_at.desc())
                    .limit(limit)
                )
            )

    def health(self) -> dict[str, Any]:
        try:
            with self.session() as s:
                s.execute(select(1))
            dialect = self.engine.dialect.name
            return {"backend": dialect, "status": "up"}
        except Exception as exc:
            return {"backend": "unknown", "status": "down", "error": str(exc)}
