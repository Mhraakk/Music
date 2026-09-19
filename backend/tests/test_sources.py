from __future__ import annotations

import pytest

from app.sources.base import ExternalTrack, normalize_key
from app.sources.internet import DeezerSource, ITunesSource, MusicBrainzSource
from app.sources.personal import (
    AppleMusicSource,
    SpotifySource,
    TelegramSource,
    YouTubeMusicSource,
)
from app.sources.registry import SourceRegistry


def track(**kwargs) -> ExternalTrack:
    base = {"source": "itunes", "source_id": "x", "title": "Roygbiv", "artist": "Boards of Canada"}
    return ExternalTrack(**{**base, **kwargs})


class TestIdentity:
    def test_normalizes_case_punctuation_and_articles(self):
        assert normalize_key("The XX") == "xx"
        assert normalize_key("  Sigur Rós  ") == normalize_key("sigur ros")

    def test_strips_remaster_and_feature_noise(self):
        assert normalize_key("Teardrop (feat. Liz Fraser)") == normalize_key("Teardrop")
        assert normalize_key("Kid A - 2009 Remaster") == normalize_key("Kid A")

    def test_key_is_stable_regardless_of_isrc(self):
        # The same song from two providers must share one identity, even when
        # only one of them reports an ISRC.
        without = track()
        with_isrc = track(source="deezer", isrc="GBBPW9800019")
        assert without.key == with_isrc.key

    def test_isrc_is_an_additional_alias(self):
        t = track(isrc="GBBPW9800019")
        assert t.key in t.alias_keys
        assert "isrc:GBBPW9800019" in t.alias_keys


class TestMerging:
    def test_merges_same_track_across_providers(self):
        itunes = track(source="itunes", artwork_url="http://art", preview_url="http://prev")
        deezer = track(source="deezer", isrc="GB123", popularity=0.4)
        merged = SourceRegistry._merge([itunes, deezer])

        assert len(merged) == 1
        entry = merged[0]
        assert set(entry.sources) == {"itunes", "deezer"}
        # Richest field from each provider survives.
        assert entry.track.artwork_url == "http://art"
        assert entry.track.isrc == "GB123"
        assert entry.track.popularity == 0.4

    def test_keeps_distinct_tracks_apart(self):
        merged = SourceRegistry._merge([track(title="Roygbiv"), track(title="Olson")])
        assert len(merged) == 2

    def test_library_membership_propagates(self):
        merged = SourceRegistry._merge(
            [track(source="itunes"), track(source="spotify", from_library=True)]
        )
        assert merged[0].in_library is True

    def test_orders_library_and_corroborated_first(self):
        solo = track(title="Solo Song")
        a = track(title="Shared", source="itunes")
        b = track(title="Shared", source="deezer")
        merged = SourceRegistry._merge([solo, a, b])
        assert merged[0].track.title == "Shared"


class TestConfiguration:
    def test_internet_sources_need_no_credentials(self):
        assert ITunesSource().configured
        assert DeezerSource().configured
        assert MusicBrainzSource().configured

    def test_personal_sources_are_inert_without_secrets(self, settings):
        assert SpotifySource(settings).configured is False
        assert AppleMusicSource(settings).configured is False
        assert YouTubeMusicSource(settings).configured is False
        assert TelegramSource(settings).configured is False

    def test_unconfigured_sources_report_required_secrets(self, settings):
        status = SpotifySource(settings).status()
        assert status.configured is False
        assert "SPOTIFY_CLIENT_ID" in status.required_secrets

    def test_registry_summary_lists_missing_secrets(self, settings):
        summary = SourceRegistry(settings).summary()
        assert summary["total"] == 7
        assert summary["configured"] == 3  # the three keyless internet sources
        assert "TELEGRAM_BOT_TOKEN" in summary["missing_secrets"]
        assert "SPOTIFY_CLIENT_SECRET" in summary["missing_secrets"]

    def test_unconfigured_sources_return_nothing_rather_than_raising(self, settings):
        assert SpotifySource(settings).search("burial") == []
        assert TelegramSource(settings).library() == []
        assert YouTubeMusicSource(settings).library() == []


class TestFanOut:
    def test_one_failing_source_does_not_break_the_query(self, settings, monkeypatch):
        registry = SourceRegistry(settings)

        def boom(self, query, limit=10):
            raise RuntimeError("provider exploded")

        monkeypatch.setattr(MusicBrainzSource, "search", boom)
        monkeypatch.setattr(
            ITunesSource, "search", lambda self, q, limit=10: [track(source="itunes")]
        )
        monkeypatch.setattr(DeezerSource, "search", lambda self, q, limit=10: [])

        merged, errors = registry.search_all("anything", limit=5)
        assert len(merged) == 1
        assert "musicbrainz" in errors

    def test_blank_query_returns_nothing(self):
        assert ITunesSource().search("   ") == []
        assert DeezerSource().search("") == []


@pytest.mark.parametrize("source_cls", [ITunesSource, DeezerSource])
class TestLiveInternetSources:
    """Hits the real keyless APIs; skipped when the network is unavailable."""

    def test_returns_normalized_tracks(self, source_cls):
        source = source_cls()
        try:
            results = source.search("boards of canada", limit=3)
        except Exception as exc:  # offline CI must not fail the suite
            pytest.skip(f"{source.id} unreachable: {exc}")

        assert results, "expected at least one result"
        first = results[0]
        assert first.title
        assert first.artist
        assert first.source == source.id
        assert first.key.startswith("nk:")
