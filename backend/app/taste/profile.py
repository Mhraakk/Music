"""Memory: the durable understanding of one listener's taste.

Signals arrive from every source — a Spotify save, a Telegram share, a thumbs
down in the UI — and are folded into a profile:

* an emotional centroid (what the listener is drawn to),
* an avoidance centroid (what they push away),
* artist / genre / decade affinities,
* an obscurity preference,
* hard vetoes that must never be recommended again.

The profile is recomputed from the signal log rather than mutated in place, so
it is always explainable and a deleted signal genuinely disappears.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete, select

from app.core.logging import get_logger
from app.sources.base import ExternalTrack, MusicSource  # noqa: F401  (typing aid)
from app.storage.database import DatabaseGateway
from app.storage.taste_models import TasteSignal, TrackMemory
from app.taste.features import AXES, NEUTRAL, InferredVector, distance, infer_vector, obscurity_of

log = get_logger(__name__)

#: How strongly each signal kind pulls the profile.
SIGNAL_WEIGHT: dict[str, float] = {
    "like": 1.0,
    "save": 0.9,
    "play": 0.35,
    "skip": -0.45,
    "dislike": -1.0,
}

POSITIVE_KINDS = {"like", "save", "play"}
NEGATIVE_KINDS = {"dislike", "skip"}


@dataclass
class TasteProfile:
    user_id: str
    attract: dict[str, float] = field(default_factory=lambda: dict(NEUTRAL))
    avoid: dict[str, float] | None = None
    obscurity_preference: float = 0.6
    top_artists: list[tuple[str, float]] = field(default_factory=list)
    top_genres: list[tuple[str, float]] = field(default_factory=list)
    decades: list[tuple[str, int]] = field(default_factory=list)
    source_mix: dict[str, int] = field(default_factory=dict)
    vetoed_keys: set[str] = field(default_factory=set)
    disliked_keys: set[str] = field(default_factory=set)
    known_keys: set[str] = field(default_factory=set)
    signal_count: int = 0
    confidence: float = 0.0
    voice: str = "Quiet listener — waits before recommending"

    def as_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "attract": {k: round(v, 4) for k, v in self.attract.items()},
            "avoid": {k: round(v, 4) for k, v in (self.avoid or {}).items()} or None,
            "obscurity_preference": round(self.obscurity_preference, 4),
            "top_artists": [{"name": n, "weight": round(w, 3)} for n, w in self.top_artists],
            "top_genres": [{"name": n, "weight": round(w, 3)} for n, w in self.top_genres],
            "decades": [{"decade": d, "count": c} for d, c in self.decades],
            "source_mix": self.source_mix,
            "signal_count": self.signal_count,
            "confidence": round(self.confidence, 3),
            "vetoed": len(self.vetoed_keys),
            "voice": self.voice,
        }

    def describe(self) -> str:
        """Plain-language summary used as memory context for the agent."""
        if self.signal_count == 0:
            return "No taste signals recorded yet."
        parts = [self.voice]
        if self.top_genres:
            parts.append("leans " + ", ".join(g for g, _ in self.top_genres[:3]))
        if self.top_artists:
            parts.append("returns to " + ", ".join(a for a, _ in self.top_artists[:3]))
        if self.obscurity_preference > 0.65:
            parts.append("prefers deep-catalogue over chart music")
        elif self.obscurity_preference < 0.4:
            parts.append("comfortable with well-known music")
        if self.vetoed_keys:
            parts.append(f"{len(self.vetoed_keys)} hard vetoes in memory")
        return "; ".join(parts) + "."


def _voice_for(attract: dict[str, float]) -> str:
    if attract["d"] > 0.62 and attract["s"] > 0.55:
        return "Nocturnal archivist — weight over sparkle"
    if attract["w"] > 0.66:
        return "Velvet room curator — warmth under the surface"
    if attract["o"] > 0.66:
        return "Tactile collector — grain and breath"
    if attract["e"] > 0.66:
        return "Kinetic listener — motion first"
    return "Quiet listener — waits before recommending"


class TasteMemory:
    """Reads and writes the taste signal log, and derives the profile from it."""

    def __init__(self, db: DatabaseGateway) -> None:
        self.db = db

    # ------------------------------------------------------------- write
    def remember_track(
        self, track: ExternalTrack, sources: list[str] | None = None
    ) -> InferredVector:
        """Cache what we understand about a track so repeats stay consistent."""
        inferred = infer_vector(track)
        with self.db.session() as s, s.begin():
            existing = s.scalars(
                select(TrackMemory).where(TrackMemory.track_key == track.key)
            ).first()
            if existing:
                existing.times_seen += 1
                existing.last_seen = datetime.now(UTC)
                existing.sources = list(
                    dict.fromkeys([*(existing.sources or []), *(sources or [track.source])])
                )
                existing.artwork_url = existing.artwork_url or track.artwork_url
                existing.preview_url = existing.preview_url or track.preview_url
                existing.external_url = existing.external_url or track.external_url
                # A higher-confidence reading replaces a weaker one.
                if inferred.confidence > 0.6:
                    existing.vector = inferred.vector
            else:
                s.add(
                    TrackMemory(
                        track_key=track.key,
                        title=track.title,
                        artist=track.artist,
                        album=track.album,
                        sources=list(dict.fromkeys(sources or [track.source])),
                        vector=inferred.vector,
                        genres=track.genres,
                        artwork_url=track.artwork_url,
                        preview_url=track.preview_url,
                        external_url=track.external_url,
                        year=track.year,
                        obscurity=obscurity_of(track),
                    )
                )
        return inferred

    def record_signal(
        self,
        *,
        user_id: str,
        track: ExternalTrack,
        kind: str,
        reason: str | None = None,
    ) -> dict[str, Any]:
        if kind not in SIGNAL_WEIGHT:
            raise ValueError(f"unknown signal kind: {kind}")

        inferred = self.remember_track(track)
        with self.db.session() as s, s.begin():
            s.add(
                TasteSignal(
                    user_id=user_id,
                    track_key=track.key,
                    source=track.source,
                    kind=kind,
                    reason=reason,
                    title=track.title,
                    artist=track.artist,
                    vector=inferred.vector,
                    genres=track.genres,
                    year=track.year,
                    obscurity=obscurity_of(track),
                    confidence=inferred.confidence,
                )
            )
        log.info("taste.signal", user_id=user_id, kind=kind, source=track.source, reason=reason)
        return {"track_key": track.key, "kind": kind, "inferred": inferred.as_dict()}

    def forget(self, user_id: str) -> int:
        with self.db.session() as s, s.begin():
            signals = list(s.scalars(select(TasteSignal).where(TasteSignal.user_id == user_id)))
            count = len(signals)
            s.execute(delete(TasteSignal).where(TasteSignal.user_id == user_id))
        log.info("taste.forgotten", user_id=user_id, signals=count)
        return count

    # -------------------------------------------------------------- read
    def signals(self, user_id: str, limit: int = 500) -> list[TasteSignal]:
        with self.db.session() as s:
            return list(
                s.scalars(
                    select(TasteSignal)
                    .where(TasteSignal.user_id == user_id)
                    .order_by(TasteSignal.id.desc())
                    .limit(limit)
                )
            )

    def build_profile(self, user_id: str) -> TasteProfile:
        rows = self.signals(user_id)
        profile = TasteProfile(user_id=user_id)
        if not rows:
            return profile

        attract_acc = dict.fromkeys(AXES, 0.0)
        avoid_acc = dict.fromkeys(AXES, 0.0)
        attract_weight = 0.0
        avoid_weight = 0.0
        artists: dict[str, float] = defaultdict(float)
        genres: dict[str, float] = defaultdict(float)
        decades: dict[str, int] = defaultdict(int)
        sources: dict[str, int] = defaultdict(int)
        obscurity_acc = 0.0
        obscurity_weight = 0.0

        # Newer signals matter more; decay over the ordered log.
        for index, row in enumerate(rows):
            recency = 0.5 + 0.5 * (1.0 - min(index / max(len(rows), 1), 1.0))
            base = SIGNAL_WEIGHT.get(row.kind, 0.0)
            weight = abs(base) * recency * max(row.confidence, 0.2)
            vector = row.vector or {}
            sources[row.source] = sources.get(row.source, 0) + 1

            if base > 0:
                for axis in AXES:
                    attract_acc[axis] += vector.get(axis, 0.5) * weight
                attract_weight += weight
                artists[row.artist] += weight
                for genre in row.genres or []:
                    genres[genre.lower()] += weight
                if row.year:
                    decades[f"{(row.year // 10) * 10}s"] += 1
                if row.obscurity is not None:
                    obscurity_acc += row.obscurity * weight
                    obscurity_weight += weight
            elif base < 0:
                for axis in AXES:
                    avoid_acc[axis] += vector.get(axis, 0.5) * weight
                avoid_weight += weight
                artists[row.artist] -= weight * 0.5
                if row.kind == "dislike":
                    profile.disliked_keys.add(row.track_key)
                    if row.reason == "never":
                        profile.vetoed_keys.add(row.track_key)

            profile.known_keys.add(row.track_key)

        if attract_weight > 0:
            profile.attract = {axis: attract_acc[axis] / attract_weight for axis in AXES}
        if avoid_weight > 0:
            profile.avoid = {axis: avoid_acc[axis] / avoid_weight for axis in AXES}
        if obscurity_weight > 0:
            profile.obscurity_preference = obscurity_acc / obscurity_weight

        profile.top_artists = sorted(
            ((a, w) for a, w in artists.items() if w > 0 and a and a != "Unknown"),
            key=lambda kv: kv[1],
            reverse=True,
        )[:8]
        profile.top_genres = sorted(genres.items(), key=lambda kv: kv[1], reverse=True)[:8]
        profile.decades = sorted(decades.items(), key=lambda kv: kv[1], reverse=True)[:5]
        profile.source_mix = dict(sources)
        profile.signal_count = len(rows)
        # Confidence saturates once there is a meaningful history.
        profile.confidence = min(1.0, len(rows) / 40)
        profile.voice = _voice_for(profile.attract)
        return profile

    def contrast(self, profile: TasteProfile, vector: dict[str, float]) -> float:
        """How far a candidate sits from what the listener is drawn to."""
        return distance(profile.attract, vector)
