"""Durable taste tables: every signal the user gives, from any source."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.storage.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class TasteSignal(Base):
    """One interaction: like, dislike, play, skip or save — from any source."""

    __tablename__ = "taste_signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    #: Cross-provider identity (isrc:… or nk:artist::title).
    track_key: Mapped[str] = mapped_column(String(320), index=True)
    source: Mapped[str] = mapped_column(String(32))
    kind: Mapped[str] = mapped_column(String(16))  # like | dislike | play | skip | save
    reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    title: Mapped[str] = mapped_column(String(320), default="")
    artist: Mapped[str] = mapped_column(String(320), default="")
    #: Emotional vector inferred at the time of the signal.
    vector: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    genres: Mapped[list[str]] = mapped_column(JSON, default=list)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    obscurity: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class TrackMemory(Base):
    """What the system has learned about a specific track it has seen before."""

    __tablename__ = "track_memory"
    __table_args__ = (UniqueConstraint("track_key", name="uq_track_memory_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    track_key: Mapped[str] = mapped_column(String(320), index=True)
    title: Mapped[str] = mapped_column(String(320), default="")
    artist: Mapped[str] = mapped_column(String(320), default="")
    album: Mapped[str | None] = mapped_column(String(320), nullable=True)
    sources: Mapped[list[str]] = mapped_column(JSON, default=list)
    vector: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    genres: Mapped[list[str]] = mapped_column(JSON, default=list)
    artwork_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    preview_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    obscurity: Mapped[float | None] = mapped_column(Float, nullable=True)
    times_seen: Mapped[int] = mapped_column(Integer, default=1)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
