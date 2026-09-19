"""Open-internet music sources that need no credentials.

Together these cover "the whole internet" for discovery: the Apple/iTunes
catalogue, Deezer's catalogue, and MusicBrainz for canonical metadata and
relationships. All three are keyless, so cross-source discovery works before the
user connects any personal account.
"""

from __future__ import annotations

import threading
import time
from typing import Any

import httpx

from app.core.logging import get_logger
from app.sources.base import ExternalTrack, SourceStatus

log = get_logger(__name__)

USER_AGENT = "RESONANT/4.0 (music-intelligence; +https://resonant.app)"


def _client(base_url: str, timeout: float = 12.0) -> httpx.Client:
    return httpx.Client(
        base_url=base_url,
        timeout=timeout,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        follow_redirects=True,
    )


def _year(value: str | None) -> int | None:
    if not value or len(value) < 4:
        return None
    try:
        return int(value[:4])
    except ValueError:
        return None


class ITunesSource:
    """Apple's public Search API — the Apple Music catalogue without a key."""

    id = "itunes"
    label = "Apple / iTunes catalogue"
    kind = "internet"

    def __init__(self) -> None:
        self._http = _client("https://itunes.apple.com")

    @property
    def configured(self) -> bool:
        return True

    @staticmethod
    def _artwork(item: dict[str, Any]) -> str | None:
        url = item.get("artworkUrl100") or item.get("artworkUrl60")
        # The CDN serves any size from the same path.
        return url.replace("100x100bb", "400x400bb") if url else None

    def _to_track(self, item: dict[str, Any]) -> ExternalTrack:
        millis = item.get("trackTimeMillis")
        return ExternalTrack(
            source=self.id,
            source_id=str(item.get("trackId") or item.get("collectionId") or ""),
            title=item.get("trackName") or item.get("collectionName") or "Unknown",
            artist=item.get("artistName") or "Unknown",
            album=item.get("collectionName"),
            year=_year(item.get("releaseDate")),
            duration_seconds=int(millis / 1000) if isinstance(millis, int) else None,
            artwork_url=self._artwork(item),
            preview_url=item.get("previewUrl"),
            external_url=item.get("trackViewUrl"),
            genres=[g for g in [item.get("primaryGenreName")] if g],
            raw={"country": item.get("country")},
        )

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]:
        if not query.strip():
            return []
        resp = self._http.get(
            "/search",
            params={"term": query, "entity": "song", "limit": min(limit, 50), "media": "music"},
        )
        resp.raise_for_status()
        return [self._to_track(item) for item in resp.json().get("results", [])]

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        return []  # open catalogue, not a personal library

    def status(self) -> SourceStatus:
        return SourceStatus(
            id=self.id,
            label=self.label,
            kind="internet",
            configured=True,
            detail="Keyless public catalogue search.",
        )


class DeezerSource:
    """Deezer's public search — broad catalogue plus ISRC for de-duplication."""

    id = "deezer"
    label = "Deezer catalogue"
    kind = "internet"

    def __init__(self) -> None:
        self._http = _client("https://api.deezer.com")

    @property
    def configured(self) -> bool:
        return True

    def _to_track(self, item: dict[str, Any]) -> ExternalTrack:
        artist = item.get("artist") or {}
        album = item.get("album") or {}
        rank = item.get("rank")
        return ExternalTrack(
            source=self.id,
            source_id=str(item.get("id") or ""),
            title=item.get("title_short") or item.get("title") or "Unknown",
            artist=artist.get("name") or "Unknown",
            album=album.get("title"),
            duration_seconds=item.get("duration"),
            artwork_url=album.get("cover_xl")
            or album.get("cover_big")
            or album.get("cover_medium"),
            preview_url=item.get("preview"),
            external_url=item.get("link"),
            isrc=item.get("isrc"),
            # Deezer's rank tops out around 1,000,000.
            popularity=min(1.0, rank / 1_000_000) if isinstance(rank, int) else None,
        )

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]:
        if not query.strip():
            return []
        resp = self._http.get("/search", params={"q": query, "limit": min(limit, 50)})
        resp.raise_for_status()
        return [self._to_track(item) for item in resp.json().get("data", [])]

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        return []

    def status(self) -> SourceStatus:
        return SourceStatus(
            id=self.id,
            label=self.label,
            kind="internet",
            configured=True,
            detail="Keyless public catalogue search with ISRC.",
        )


class MusicBrainzSource:
    """Canonical metadata: release years, tags/genres and disambiguation.

    MusicBrainz asks clients for at most one request per second and a real
    User-Agent. Both are honoured here — without the throttle the service
    intermittently answers 503 and the source drops out of results.
    """

    id = "musicbrainz"
    label = "MusicBrainz metadata"
    kind = "internet"

    MIN_INTERVAL_SECONDS = 1.05

    def __init__(self) -> None:
        self._http = _client("https://musicbrainz.org")
        self._lock = threading.Lock()
        self._last_request = 0.0

    def _throttle(self) -> None:
        with self._lock:
            elapsed = time.monotonic() - self._last_request
            if elapsed < self.MIN_INTERVAL_SECONDS:
                time.sleep(self.MIN_INTERVAL_SECONDS - elapsed)
            self._last_request = time.monotonic()

    @property
    def configured(self) -> bool:
        return True

    def _to_track(self, item: dict[str, Any]) -> ExternalTrack:
        credits = item.get("artist-credit") or []
        artist = credits[0].get("name") if credits else "Unknown"
        releases = item.get("releases") or []
        album = releases[0].get("title") if releases else None
        date = releases[0].get("date") if releases else None
        tags = [t.get("name") for t in (item.get("tags") or []) if t.get("name")]
        length = item.get("length")
        return ExternalTrack(
            source=self.id,
            source_id=str(item.get("id") or ""),
            title=item.get("title") or "Unknown",
            artist=artist or "Unknown",
            album=album,
            year=_year(date),
            duration_seconds=int(length / 1000) if isinstance(length, int) else None,
            external_url=f"https://musicbrainz.org/recording/{item.get('id')}",
            isrc=(item.get("isrcs") or [None])[0],
            genres=tags[:5],
        )

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]:
        if not query.strip():
            return []
        # This source enriches catalogue results rather than replacing them,
        # so it deliberately contributes fewer rows than the streaming sources.
        params = {"query": query, "fmt": "json", "limit": max(3, min(limit, 25) // 2)}

        for attempt in range(2):
            self._throttle()
            resp = self._http.get("/ws/2/recording", params=params)
            if resp.status_code == 503 and attempt == 0:
                time.sleep(1.2)  # server-side rate limit; one polite retry
                continue
            resp.raise_for_status()
            return [self._to_track(item) for item in resp.json().get("recordings", [])]
        return []

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        return []

    def status(self) -> SourceStatus:
        return SourceStatus(
            id=self.id,
            label=self.label,
            kind="internet",
            configured=True,
            detail="Keyless canonical metadata, tags and release dates.",
        )
