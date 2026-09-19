"""The user's own accounts: Spotify, Apple Music, YouTube Music and Telegram.

Each adapter is fully implemented but inert until its credentials exist. That
keeps the app usable before the user connects anything, and means connecting an
account is purely a configuration step — no code change.

Required environment variables are declared on every `status()` so the UI can
tell the user exactly what to add.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

from app.config import Settings
from app.core.logging import get_logger
from app.sources.base import ExternalTrack, SourceStatus

log = get_logger(__name__)

USER_AGENT = "RESONANT/4.0 (music-intelligence)"


def _year(value: str | None) -> int | None:
    if not value or len(value) < 4:
        return None
    try:
        return int(value[:4])
    except ValueError:
        return None


class SpotifySource:
    """Spotify Web API.

    Client credentials enable catalogue search; a user OAuth token additionally
    unlocks saved tracks and audio features, which are the strongest taste
    signal available from any provider.
    """

    id = "spotify"
    label = "Spotify (your library)"
    kind = "personal"

    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._token: str | None = None
        self._token_expires_at = 0.0
        self._http = httpx.Client(
            base_url="https://api.spotify.com/v1",
            timeout=15,
            headers={"User-Agent": USER_AGENT},
        )

    @property
    def configured(self) -> bool:
        return bool(
            self._s.spotify_user_token
            or (self._s.spotify_client_id and self._s.spotify_client_secret)
        )

    @property
    def has_user_scope(self) -> bool:
        return bool(self._s.spotify_user_token)

    def _access_token(self) -> str | None:
        if self._s.spotify_user_token:
            return self._s.spotify_user_token
        if self._token and time.time() < self._token_expires_at:
            return self._token
        if not (self._s.spotify_client_id and self._s.spotify_client_secret):
            return None
        resp = httpx.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            auth=(self._s.spotify_client_id, self._s.spotify_client_secret),
            timeout=15,
        )
        resp.raise_for_status()
        payload = resp.json()
        self._token = payload["access_token"]
        self._token_expires_at = time.time() + payload.get("expires_in", 3600) - 60
        return self._token

    def _headers(self) -> dict[str, str] | None:
        token = self._access_token()
        return {"Authorization": f"Bearer {token}"} if token else None

    def _to_track(self, item: dict[str, Any], from_library: bool = False) -> ExternalTrack:
        album = item.get("album") or {}
        images = album.get("images") or []
        artists = item.get("artists") or []
        popularity = item.get("popularity")
        return ExternalTrack(
            source=self.id,
            source_id=item.get("id") or "",
            title=item.get("name") or "Unknown",
            artist=", ".join(a.get("name", "") for a in artists) or "Unknown",
            album=album.get("name"),
            year=_year(album.get("release_date")),
            duration_seconds=int((item.get("duration_ms") or 0) / 1000) or None,
            artwork_url=images[0]["url"] if images else None,
            preview_url=item.get("preview_url"),
            external_url=(item.get("external_urls") or {}).get("spotify"),
            isrc=(item.get("external_ids") or {}).get("isrc"),
            popularity=popularity / 100 if isinstance(popularity, int) else None,
            from_library=from_library,
        )

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]:
        headers = self._headers()
        if not headers or not query.strip():
            return []
        resp = self._http.get(
            "/search",
            params={"q": query, "type": "track", "limit": min(limit, 50)},
            headers=headers,
        )
        resp.raise_for_status()
        items = (resp.json().get("tracks") or {}).get("items", [])
        return [self._to_track(i) for i in items]

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        if not self.has_user_scope:
            return []
        headers = self._headers()
        if not headers:
            return []
        resp = self._http.get("/me/tracks", params={"limit": min(limit, 50)}, headers=headers)
        resp.raise_for_status()
        return [
            self._to_track(row.get("track") or {}, from_library=True)
            for row in resp.json().get("items", [])
        ]

    def audio_features(self, track_ids: list[str]) -> dict[str, dict[str, float]]:
        """Valence / energy / acousticness — the richest taste signal we can get."""
        headers = self._headers()
        if not headers or not track_ids:
            return {}
        resp = self._http.get(
            "/audio-features", params={"ids": ",".join(track_ids[:100])}, headers=headers
        )
        if resp.status_code != 200:
            return {}
        out: dict[str, dict[str, float]] = {}
        for feature in resp.json().get("audio_features") or []:
            if feature and feature.get("id"):
                out[feature["id"]] = {
                    k: float(feature[k])
                    for k in (
                        "valence",
                        "energy",
                        "acousticness",
                        "danceability",
                        "instrumentalness",
                        "tempo",
                    )
                    if isinstance(feature.get(k), (int, float))
                }
        return out

    def status(self) -> SourceStatus:
        detail = "Not connected."
        if self.has_user_scope:
            detail = "Connected with a user token: saved tracks and audio features available."
        elif self.configured:
            detail = (
                "App credentials only: catalogue search works, personal library needs a user token."
            )
        return SourceStatus(
            id=self.id,
            label=self.label,
            kind="personal",
            configured=self.configured,
            detail=detail,
            required_secrets=["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_USER_TOKEN"],
        )


class AppleMusicSource:
    """Apple Music API — developer JWT plus the user's Music-User-Token."""

    id = "apple_music"
    label = "Apple Music (your library)"
    kind = "personal"

    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._http = httpx.Client(
            base_url="https://api.music.apple.com/v1",
            timeout=15,
            headers={"User-Agent": USER_AGENT},
        )

    @property
    def configured(self) -> bool:
        return bool(self._s.apple_music_developer_token)

    @property
    def has_user_scope(self) -> bool:
        return bool(self._s.apple_music_developer_token and self._s.apple_music_user_token)

    def _headers(self) -> dict[str, str] | None:
        if not self._s.apple_music_developer_token:
            return None
        headers = {"Authorization": f"Bearer {self._s.apple_music_developer_token}"}
        if self._s.apple_music_user_token:
            headers["Music-User-Token"] = self._s.apple_music_user_token
        return headers

    def _to_track(self, item: dict[str, Any], from_library: bool = False) -> ExternalTrack:
        attrs = item.get("attributes") or {}
        artwork = attrs.get("artwork") or {}
        art_url = artwork.get("url")
        if art_url:
            art_url = art_url.replace("{w}", "400").replace("{h}", "400")
        previews = attrs.get("previews") or []
        return ExternalTrack(
            source=self.id,
            source_id=item.get("id") or "",
            title=attrs.get("name") or "Unknown",
            artist=attrs.get("artistName") or "Unknown",
            album=attrs.get("albumName"),
            year=_year(attrs.get("releaseDate")),
            duration_seconds=int((attrs.get("durationInMillis") or 0) / 1000) or None,
            artwork_url=art_url,
            preview_url=previews[0].get("url") if previews else None,
            external_url=attrs.get("url"),
            isrc=attrs.get("isrc"),
            genres=[g for g in (attrs.get("genreNames") or []) if g],
            from_library=from_library,
        )

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]:
        headers = self._headers()
        if not headers or not query.strip():
            return []
        storefront = self._s.apple_music_storefront
        resp = self._http.get(
            f"/catalog/{storefront}/search",
            params={"term": query, "types": "songs", "limit": min(limit, 25)},
            headers=headers,
        )
        resp.raise_for_status()
        songs = ((resp.json().get("results") or {}).get("songs") or {}).get("data", [])
        return [self._to_track(s) for s in songs]

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        headers = self._headers()
        if not headers or not self.has_user_scope:
            return []
        resp = self._http.get(
            "/me/library/songs", params={"limit": min(limit, 100)}, headers=headers
        )
        resp.raise_for_status()
        return [self._to_track(s, from_library=True) for s in resp.json().get("data", [])]

    def status(self) -> SourceStatus:
        detail = "Not connected."
        if self.has_user_scope:
            detail = "Connected: catalogue plus your library."
        elif self.configured:
            detail = (
                "Developer token only: catalogue search works, library needs a Music-User-Token."
            )
        return SourceStatus(
            id=self.id,
            label=self.label,
            kind="personal",
            configured=self.configured,
            detail=detail,
            required_secrets=["APPLE_MUSIC_DEVELOPER_TOKEN", "APPLE_MUSIC_USER_TOKEN"],
        )


class YouTubeMusicSource:
    """YouTube Data API: catalogue search with a key, liked music with OAuth."""

    id = "youtube_music"
    label = "YouTube Music (your library)"
    kind = "personal"

    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._http = httpx.Client(
            base_url="https://www.googleapis.com/youtube/v3",
            timeout=15,
            headers={"User-Agent": USER_AGENT},
        )

    @property
    def configured(self) -> bool:
        return bool(self._s.youtube_api_key or self._s.youtube_oauth_token)

    @property
    def has_user_scope(self) -> bool:
        return bool(self._s.youtube_oauth_token)

    def _auth(self) -> tuple[dict[str, str], dict[str, str]]:
        headers: dict[str, str] = {}
        params: dict[str, str] = {}
        if self._s.youtube_oauth_token:
            headers["Authorization"] = f"Bearer {self._s.youtube_oauth_token}"
        if self._s.youtube_api_key:
            params["key"] = self._s.youtube_api_key
        return headers, params

    def _to_track(self, item: dict[str, Any], from_library: bool = False) -> ExternalTrack:
        snippet = item.get("snippet") or {}
        thumbs = snippet.get("thumbnails") or {}
        best = thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}
        video_id = item.get("id")
        if isinstance(video_id, dict):
            video_id = video_id.get("videoId")
        title = snippet.get("title") or "Unknown"
        channel = snippet.get("videoOwnerChannelTitle") or snippet.get("channelTitle") or "Unknown"
        # YouTube titles are usually "Artist - Track"; split when it is unambiguous.
        artist, _, maybe_title = title.partition(" - ")
        if maybe_title:
            title_out, artist_out = maybe_title.strip(), artist.strip()
        else:
            title_out, artist_out = title, channel.removesuffix(" - Topic")
        return ExternalTrack(
            source=self.id,
            source_id=str(video_id or ""),
            title=title_out,
            artist=artist_out,
            year=_year(snippet.get("publishedAt")),
            artwork_url=best.get("url"),
            external_url=f"https://music.youtube.com/watch?v={video_id}" if video_id else None,
            from_library=from_library,
        )

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]:
        if not self.configured or not query.strip():
            return []
        headers, params = self._auth()
        resp = self._http.get(
            "/search",
            params={
                **params,
                "q": query,
                "part": "snippet",
                "type": "video",
                "videoCategoryId": "10",  # Music
                "maxResults": min(limit, 25),
            },
            headers=headers,
        )
        resp.raise_for_status()
        return [self._to_track(i) for i in resp.json().get("items", [])]

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        if not self.has_user_scope:
            return []
        headers, params = self._auth()
        resp = self._http.get(
            "/videos",
            params={**params, "part": "snippet", "myRating": "like", "maxResults": min(limit, 50)},
            headers=headers,
        )
        resp.raise_for_status()
        return [self._to_track(i, from_library=True) for i in resp.json().get("items", [])]

    def status(self) -> SourceStatus:
        detail = "Not connected."
        if self.has_user_scope:
            detail = "Connected with OAuth: liked music available."
        elif self.configured:
            detail = "API key only: search works, liked music needs an OAuth token."
        return SourceStatus(
            id=self.id,
            label=self.label,
            kind="personal",
            configured=self.configured,
            detail=detail,
            required_secrets=["YOUTUBE_API_KEY", "YOUTUBE_OAUTH_TOKEN"],
        )


class TelegramSource:
    """Telegram as a music source.

    Reads audio documents the user (or a channel they own) has sent to the bot.
    Telegram audio carries `performer`/`title` ID3 metadata, which is enough to
    normalize into a track and reconcile with catalogue sources by ISRC-less key.
    """

    id = "telegram"
    label = "Telegram (shared audio)"
    kind = "personal"

    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._http = httpx.Client(timeout=20, headers={"User-Agent": USER_AGENT})

    @property
    def configured(self) -> bool:
        return bool(self._s.telegram_bot_token)

    def _url(self, method: str) -> str:
        return f"https://api.telegram.org/bot{self._s.telegram_bot_token}/{method}"

    @staticmethod
    def _to_track(audio: dict[str, Any]) -> ExternalTrack:
        return ExternalTrack(
            source="telegram",
            source_id=str(audio.get("file_unique_id") or audio.get("file_id") or ""),
            title=audio.get("title") or audio.get("file_name") or "Untitled audio",
            artist=audio.get("performer") or "Unknown",
            duration_seconds=audio.get("duration"),
            from_library=True,
            raw={"file_id": audio.get("file_id"), "mime": audio.get("mime_type")},
        )

    def library(self, limit: int = 50) -> list[ExternalTrack]:
        """Audio the bot has received. Telegram keeps updates for ~24h."""
        if not self.configured:
            return []
        resp = self._http.get(self._url("getUpdates"), params={"limit": 100, "timeout": 0})
        resp.raise_for_status()
        tracks: list[ExternalTrack] = []
        seen: set[str] = set()
        for update in resp.json().get("result", []):
            message = update.get("message") or update.get("channel_post") or {}
            audio = message.get("audio")
            if not audio:
                continue
            track = self._to_track(audio)
            if track.source_id in seen:
                continue
            seen.add(track.source_id)
            tracks.append(track)
            if len(tracks) >= limit:
                break
        return tracks

    def search(self, query: str, limit: int = 10) -> list[ExternalTrack]:
        """Telegram has no catalogue search; filter what the bot has received."""
        q = query.lower().strip()
        if not q:
            return []
        return [
            t for t in self.library(limit=100) if q in t.title.lower() or q in t.artist.lower()
        ][:limit]

    def status(self) -> SourceStatus:
        return SourceStatus(
            id=self.id,
            label=self.label,
            kind="personal",
            configured=self.configured,
            detail=(
                "Connected: audio sent to the bot is indexed."
                if self.configured
                else "Not connected."
            ),
            required_secrets=["TELEGRAM_BOT_TOKEN"],
        )
