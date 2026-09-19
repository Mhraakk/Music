from __future__ import annotations

import pytest

from app.sources.base import ExternalTrack
from app.sources.registry import MergedTrack
from app.taste.features import distance, infer_vector, obscurity_of
from app.taste.profile import TasteMemory
from app.taste.rank import rank_for_profile
from app.taste.recommend import build_seeds


def t(**kwargs) -> ExternalTrack:
    base = {"source": "itunes", "source_id": "1", "title": "Untitled", "artist": "Someone"}
    return ExternalTrack(**{**base, **kwargs})


def merged(track: ExternalTrack, sources: list[str] | None = None, in_library: bool = False):
    return MergedTrack(track=track, sources=sources or [track.source], in_library=in_library)


class TestUnderstanding:
    def test_dark_genres_produce_a_dark_low_energy_vector(self):
        inferred = infer_vector(t(genres=["darkjazz", "doom"], title="Midnight Black"))
        assert inferred.vector["d"] > 0.7
        assert inferred.vector["e"] < 0.4

    def test_dance_pop_reads_as_mainstream_and_energetic(self):
        inferred = infer_vector(t(genres=["dance", "pop"], popularity=0.95))
        assert inferred.vector["m"] > 0.7
        assert inferred.vector["e"] > 0.6

    def test_acoustic_reads_as_organic(self):
        assert infer_vector(t(genres=["acoustic", "folk"])).vector["o"] > 0.65

    def test_provider_audio_features_win_over_heuristics(self):
        inferred = infer_vector(
            t(audio_features={"valence": 0.05, "energy": 0.9, "acousticness": 0.02})
        )
        assert inferred.confidence >= 0.9
        assert inferred.vector["s"] > 0.8  # low valence => sad
        assert inferred.vector["e"] > 0.8
        assert inferred.vector["o"] < 0.2

    def test_unknown_track_stays_neutral_with_low_confidence(self):
        inferred = infer_vector(t(title="Zzz", artist="Unknown"))
        assert inferred.confidence < 0.4
        assert 0.4 <= inferred.vector["d"] <= 0.6

    def test_obscurity_is_the_inverse_of_popularity(self):
        assert obscurity_of(t(popularity=0.9)) == pytest.approx(0.1, abs=0.01)
        assert obscurity_of(t(popularity=0.1)) == pytest.approx(0.9, abs=0.01)

    def test_distance_is_zero_for_identical_vectors(self):
        v = infer_vector(t(genres=["ambient"])).vector
        assert distance(v, v) == 0


class TestMemory:
    def test_learns_a_profile_from_signals(self, container):
        memory = TasteMemory(container.db)
        for track in [
            t(title="A", artist="Stars of the Lid", genres=["drone", "ambient"], popularity=0.1),
            t(title="B", artist="Bohren", genres=["darkjazz"], popularity=0.1),
        ]:
            memory.record_signal(user_id="u1", track=track, kind="like")

        profile = memory.build_profile("u1")
        assert profile.signal_count == 2
        assert profile.attract["e"] < 0.45
        assert profile.obscurity_preference > 0.7
        assert "Stars of the Lid" in [a for a, _ in profile.top_artists]
        assert profile.voice != ""

    def test_dislikes_build_an_avoidance_centre(self, container):
        memory = TasteMemory(container.db)
        memory.record_signal(user_id="u2", track=t(genres=["ambient"]), kind="like")
        memory.record_signal(
            user_id="u2",
            track=t(title="Anthem", artist="DJ", genres=["dance", "pop"], popularity=0.97),
            kind="dislike",
            reason="mainstream",
        )
        profile = memory.build_profile("u2")
        assert profile.avoid is not None
        assert profile.avoid["m"] > 0.7

    def test_never_reason_creates_a_hard_veto(self, container):
        memory = TasteMemory(container.db)
        victim = t(title="Never", artist="Nope")
        memory.record_signal(user_id="u3", track=victim, kind="dislike", reason="never")
        profile = memory.build_profile("u3")
        assert victim.key in profile.vetoed_keys

    def test_profile_is_empty_for_an_unknown_user(self, container):
        profile = TasteMemory(container.db).build_profile("nobody")
        assert profile.signal_count == 0
        assert profile.describe() == "No taste signals recorded yet."

    def test_forget_removes_every_signal(self, container):
        memory = TasteMemory(container.db)
        memory.record_signal(user_id="u4", track=t(), kind="like")
        assert memory.build_profile("u4").signal_count == 1

        removed = memory.forget("u4")
        assert removed == 1
        assert memory.build_profile("u4").signal_count == 0

    def test_signals_from_every_source_are_attributed(self, container):
        memory = TasteMemory(container.db)
        for source in ["spotify", "apple_music", "youtube_music", "telegram"]:
            memory.record_signal(user_id="u5", track=t(source=source, title=source), kind="like")
        profile = memory.build_profile("u5")
        assert set(profile.source_mix) == {"spotify", "apple_music", "youtube_music", "telegram"}


class TestRanking:
    def _profile(self, container, likes: list[ExternalTrack]):
        memory = TasteMemory(container.db)
        for track in likes:
            memory.record_signal(user_id="ranker", track=track, kind="like")
        return memory.build_profile("ranker")

    def test_prefers_tracks_near_the_emotional_centre(self, container):
        profile = self._profile(
            container, [t(title="L", artist="Lid", genres=["drone", "ambient"], popularity=0.1)]
        )
        candidates = [
            merged(t(title="Calm", artist="X", genres=["ambient", "drone"], popularity=0.12)),
            merged(t(title="Banger", artist="Y", genres=["dance", "pop"], popularity=0.97)),
        ]
        ranked = rank_for_profile(candidates, profile, limit=2)
        assert ranked[0].merged.track.title == "Calm"

    def test_hard_veto_is_never_recommended(self, container):
        memory = TasteMemory(container.db)
        banned = t(title="Banned", artist="Nope")
        memory.record_signal(user_id="veto", track=banned, kind="dislike", reason="never")
        profile = memory.build_profile("veto")

        ranked = rank_for_profile([merged(banned), merged(t(title="Fine"))], profile, limit=5)
        assert all(r.merged.track.title != "Banned" for r in ranked)

    def test_playable_tracks_outrank_metadata_only_entries(self, container):
        profile = self._profile(container, [t(genres=["ambient"])])
        playable = merged(
            t(title="Same", artist="A", genres=["ambient"], preview_url="u", artwork_url="a")
        )
        bare = merged(t(title="Same", artist="B", genres=["ambient"], source="musicbrainz"))
        ranked = rank_for_profile([bare, playable], profile, limit=2, diversify=False)
        assert ranked[0].merged.track.artist == "A"

    def test_every_result_explains_itself(self, container):
        profile = self._profile(container, [t(genres=["ambient"])])
        ranked = rank_for_profile([merged(t(title="Any"))], profile, limit=1)
        assert ranked[0].reasons

    def test_diversify_avoids_repeating_one_artist(self, container):
        profile = self._profile(container, [t(genres=["ambient"])])
        candidates = [
            merged(t(title=f"Track {i}", artist="Same Artist", genres=["ambient"])) for i in range(5)
        ]
        candidates.append(merged(t(title="Other", artist="Different", genres=["ambient"])))
        ranked = rank_for_profile(candidates, profile, limit=3)
        assert len({r.merged.track.artist for r in ranked}) > 1


class TestSeeds:
    def test_explicit_query_wins(self, container):
        profile = TasteMemory(container.db).build_profile("seeds")
        assert build_seeds(profile, "burial untrue") == ["burial untrue"]

    def test_profile_expands_into_separate_seeds(self, container):
        memory = TasteMemory(container.db)
        memory.record_signal(
            user_id="seeder",
            track=t(artist="Stars of the Lid", genres=["drone"]),
            kind="like",
        )
        seeds = build_seeds(memory.build_profile("seeder"))
        # Artists and genres must be separate queries; concatenating them
        # produces a phrase no catalogue can match.
        assert "Stars of the Lid" in seeds
        assert "drone" in seeds
        assert all(len(s.split()) < 8 for s in seeds)

    def test_cold_start_falls_back_to_defaults(self, container):
        profile = TasteMemory(container.db).build_profile("cold")
        assert build_seeds(profile) == ["ambient electronic", "modern classical"]
