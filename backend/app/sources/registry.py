"""Source registry and the cross-source aggregator.

`search_all` fans out to every configured source in parallel, merges the
results by cross-provider identity (ISRC first, normalized artist+title
otherwise) and keeps the richest field from each provider — Deezer's ISRC,
Apple's preview, Spotify's audio features, MusicBrainz's tags.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.sources.base import PERSONAL_SOURCES, ExternalTrack, MusicSource, SourceStatus
from app.sources.internet import DeezerSource, ITunesSource, MusicBrainzSource
from app.sources.personal import (
    AppleMusicSource,
    SpotifySource,
    TelegramSource,
    YouTubeMusicSource,
)

log = get_logger(__name__)


@dataclass
class MergedTrack:
    """One logical track, with every provider that has it."""

    track: ExternalTrack
    sources: list[str] = field(default_factory=list)
    #: True when any contributing provider saw it in the user's own library.
    in_library: bool = False

    def as_dict(self) -> dict[str, Any]:
        payload = self.track.as_dict()
        payload["sources"] = self.sources
        payload["in_library"] = self.in_library
        return payload


def _merge_into(base: ExternalTrack, other: ExternalTrack) -> ExternalTrack:
    """Fill gaps in `base` from `other` without overwriting good data."""
    base.isrc = base.isrc or other.isrc
    base.album = base.album or other.album
    base.year = base.year or other.year
    base.duration_seconds = base.duration_seconds or other.duration_seconds
    base.artwork_url = base.artwork_url or other.artwork_url
    base.preview_url = base.preview_url or other.preview_url
    base.external_url = base.external_url or other.external_url
    if other.popularity is not None:
        base.popularity = max(base.popularity or 0.0, other.popularity)
    if other.genres:
        base.genres = list(dict.fromkeys([*base.genres, *other.genres]))[:8]
    if other.audio_features:
        base.audio_features = {**other.audio_features, **base.audio_features}
    base.from_library = base.from_library or other.from_library
    return base


class SourceRegistry:
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings or get_settings()
        self.settings = s
        self.spotify = SpotifySource(s)
        self._sources: list[MusicSource] = [
            ITunesSource(),
            DeezerSource(),
            MusicBrainzSource(),
            self.spotify,
            AppleMusicSource(s),
            YouTubeMusicSource(s),
            TelegramSource(s),
        ]

    @property
    def all(self) -> list[MusicSource]:
        return list(self._sources)

    @property
    def active(self) -> list[MusicSource]:
        return [s for s in self._sources if s.configured]

    def get(self, source_id: str) -> MusicSource | None:
        return next((s for s in self._sources if s.id == source_id), None)

    def statuses(self) -> list[SourceStatus]:
        return [s.status() for s in self._sources]

    def summary(self) -> dict[str, Any]:
        statuses = self.statuses()
        return {
            "total": len(statuses),
            "configured": sum(1 for s in statuses if s.configured),
            "internet": [s.as_dict() for s in statuses if s.kind == "internet"],
            "personal": [s.as_dict() for s in statuses if s.kind == "personal"],
            "missing_secrets": sorted(
                {secret for s in statuses if not s.configured for secret in s.required_secrets}
            ),
        }

    # ------------------------------------------------------------------
    def _fan_out(
        self, call: str, *, query: str = "", limit: int = 10, only: list[str] | None = None
    ) -> tuple[list[ExternalTrack], dict[str, str]]:
        sources = [s for s in self.active if not only or s.id in only]
        collected: list[ExternalTrack] = []
        errors: dict[str, str] = {}

        if not sources:
            return collected, errors

        with ThreadPoolExecutor(max_workers=min(6, len(sources))) as pool:
            futures = {
                pool.submit(getattr(source, call), query, limit)
                if call == "search"
                else pool.submit(getattr(source, call), limit): source
                for source in sources
            }
            for future in as_completed(futures):
                source = futures[future]
                try:
                    collected.extend(future.result() or [])
                except Exception as exc:  # one bad provider must not fail the query
                    errors[source.id] = str(exc)[:160]
                    log.warning("sources.failed", source=source.id, error=str(exc)[:160])

        return collected, errors

    def search_all(
        self, query: str, limit: int = 10, only: list[str] | None = None
    ) -> tuple[list[MergedTrack], dict[str, str]]:
        raw, errors = self._fan_out("search", query=query, limit=limit, only=only)
        return self._merge(raw), errors

    def library_all(
        self, limit: int = 50, only: list[str] | None = None
    ) -> tuple[list[MergedTrack], dict[str, str]]:
        personal = [s.id for s in self.active if s.id in PERSONAL_SOURCES]
        chosen = [s for s in (only or personal) if s in personal]
        raw, errors = self._fan_out("library", limit=limit, only=chosen)
        for track in raw:
            track.from_library = True
        return self._merge(raw), errors

    @staticmethod
    def _merge(tracks: list[ExternalTrack]) -> list[MergedTrack]:
        """Union tracks by any shared identity.

        A track is indexed under every alias it carries (normalized name and,
        when present, ISRC). Providers that expose different subsets of those
        aliases still collapse onto one entry.
        """
        index: dict[str, MergedTrack] = {}
        results: list[MergedTrack] = []

        for track in tracks:
            aliases = track.alias_keys
            existing = next((index[a] for a in aliases if a in index), None)

            if existing is None:
                entry = MergedTrack(
                    track=track, sources=[track.source], in_library=track.from_library
                )
                results.append(entry)
            else:
                entry = existing
                _merge_into(entry.track, track)
                if track.source not in entry.sources:
                    entry.sources.append(track.source)
                entry.in_library = entry.in_library or track.from_library

            # Register every alias — including ones learned from this provider.
            for alias in set(aliases) | set(entry.track.alias_keys):
                index[alias] = entry

        # Corroboration across providers is a real quality signal.
        results.sort(
            key=lambda m: (m.in_library, len(m.sources), m.track.popularity or 0), reverse=True
        )
        return results

    def enrich_with_audio_features(self, merged: list[MergedTrack]) -> None:
        """Attach Spotify audio features where the track is known to Spotify."""
        if not self.spotify.configured:
            return
        ids = [
            m.track.source_id for m in merged if m.track.source == "spotify" and m.track.source_id
        ]
        if not ids:
            return
        try:
            features = self.spotify.audio_features(ids)
        except Exception as exc:
            log.warning("sources.audio_features_failed", error=str(exc)[:160])
            return
        for m in merged:
            found = features.get(m.track.source_id)
            if found:
                m.track.audio_features.update(found)
