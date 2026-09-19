"""Normalized music-source layer.

Every provider — the open internet, Spotify, Apple Music, YouTube Music,
Telegram — is reduced to the same `ExternalTrack` shape so the taste engine and
the agent never care where a track came from.

Sources that need credentials report `configured=False` and are skipped by the
aggregator instead of raising, so the app degrades cleanly to whatever the user
has actually connected.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

SourceId = Literal[
    "itunes",
    "deezer",
    "musicbrainz",
    "spotify",
    "apple_music",
    "youtube_music",
    "telegram",
    "local",
]

#: Sources that represent the user's own library rather than the open internet.
PERSONAL_SOURCES: set[str] = {"spotify", "apple_music", "youtube_music", "telegram"}


@dataclass
class ExternalTrack:
    """A track from any provider, normalized."""

    source: str
    source_id: str
    title: str
    artist: str
    album: str | None = None
    year: int | None = None
    duration_seconds: int | None = None
    artwork_url: str | None = None
    preview_url: str | None = None
    external_url: str | None = None
    isrc: str | None = None
    genres: list[str] = field(default_factory=list)
    #: 0..1 relative popularity where the provider reports one.
    popularity: float | None = None
    #: Provider-native audio features (Spotify valence/energy, etc.).
    audio_features: dict[str, float] = field(default_factory=dict)
    #: True when the track came from the user's own library/history.
    from_library: bool = False
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def key(self) -> str:
        """Stable identity for taste memory.

        Deliberately *not* the ISRC: providers disagree about whether a track
        has one, so an ISRC-first key would give the same song two identities
        and split its listening history. The normalized artist+title is always
        computable and therefore stable across sessions and providers.
        """
        return f"nk:{normalize_key(self.artist)}::{normalize_key(self.title)}"

    @property
    def alias_keys(self) -> list[str]:
        """All identities this track may be known by, used to merge providers."""
        keys = [self.key]
        if self.isrc:
            keys.append(f"isrc:{self.isrc.upper()}")
        return keys

    def as_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "source_id": self.source_id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "year": self.year,
            "duration_seconds": self.duration_seconds,
            "artwork_url": self.artwork_url,
            "preview_url": self.preview_url,
            "external_url": self.external_url,
            "isrc": self.isrc,
            "genres": self.genres,
            "popularity": self.popularity,
            "from_library": self.from_library,
            "key": self.key,
        }


_PAREN = re.compile(r"\((?:feat|ft|with|remaster|remastered|live|mono|stereo|version)[^)]*\)", re.I)
_BRACKET = re.compile(r"\[[^\]]*\]")
_SUFFIX = re.compile(
    r"\s*-\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|live|mono|stereo|radio edit).*$", re.I
)
_NON_ALNUM = re.compile(r"[^a-z0-9\u0600-\u06ff ]+")
_SPACES = re.compile(r"\s+")


def normalize_key(value: str) -> str:
    """Fold a title/artist down to a comparable key across providers.

    Combining marks are dropped rather than replaced, so "Sigur Rós" and
    "Sigur Ros" collapse to the same key instead of "sigur ro s".
    """
    decomposed = unicodedata.normalize("NFKD", value or "").lower()
    text = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    text = _PAREN.sub(" ", text)
    text = _BRACKET.sub(" ", text)
    text = _SUFFIX.sub(" ", text)
    text = _NON_ALNUM.sub(" ", text)
    text = _SPACES.sub(" ", text).strip()
    # "the xx" and "xx" should collide; leading article carries no identity
    if text.startswith("the "):
        text = text[4:]
    return text


@dataclass
class SourceStatus:
    id: str
    label: str
    kind: Literal["internet", "personal"]
    configured: bool
    reachable: bool | None = None
    detail: str = ""
    #: Environment variables that would enable this source.
    required_secrets: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "kind": self.kind,
            "configured": self.configured,
            "reachable": self.reachable,
            "detail": self.detail,
            "required_secrets": self.required_secrets,
        }


class MusicSource(Protocol):
    id: str
    label: str
    kind: Literal["internet", "personal"]

    @property
    def configured(self) -> bool: ...

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]: ...

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        """Tracks the user has saved/liked. Empty for open-internet sources."""
        ...

    def status(self) -> SourceStatus: ...
