"""Personalised ranking across every source.

Candidates from Spotify, Apple Music, YouTube, Telegram and the open internet
are scored against the learned profile: emotional distance first, then artist
and genre affinity, obscurity fit, cross-source corroboration and library
membership. Rejection memory is applied as a hard filter, exactly like the
local engine, so a "never again" track can never resurface.

Every result carries the reasons that produced its score, because a
recommendation the listener cannot interrogate is not trustworthy.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.sources.registry import MergedTrack
from app.taste.features import distance, infer_vector, obscurity_of
from app.taste.profile import TasteProfile


@dataclass
class ScoredTrack:
    merged: MergedTrack
    score: float
    vector: dict[str, float]
    reasons: list[str] = field(default_factory=list)
    confidence: float = 0.0

    def as_dict(self) -> dict[str, Any]:
        payload = self.merged.as_dict()
        payload["score"] = round(self.score, 4)
        payload["vector"] = self.vector
        payload["reasons"] = self.reasons
        payload["vector_confidence"] = round(self.confidence, 3)
        return payload


def rank_for_profile(
    candidates: list[MergedTrack],
    profile: TasteProfile,
    *,
    limit: int = 12,
    exclude_known: bool = False,
    diversify: bool = True,
) -> list[ScoredTrack]:
    artist_affinity = {a.lower(): w for a, w in profile.top_artists}
    max_artist = max(artist_affinity.values(), default=1.0) or 1.0
    genre_affinity = {g.lower(): w for g, w in profile.top_genres}
    max_genre = max(genre_affinity.values(), default=1.0) or 1.0

    scored: list[ScoredTrack] = []

    for candidate in candidates:
        track = candidate.track
        key = track.key

        # Rejection memory is absolute.
        if key in profile.vetoed_keys:
            continue
        if exclude_known and key in profile.known_keys:
            continue

        inferred = infer_vector(track)
        vector = inferred.vector
        reasons: list[str] = []

        emotional_distance = distance(profile.attract, vector)
        # 0 distance -> 1.0, far -> 0. The scale matches the local ranker.
        score = max(0.0, 1.6 - emotional_distance * 0.9)
        if emotional_distance < 0.45:
            reasons.append("close to your emotional centre")

        if profile.avoid:
            avoid_distance = distance(profile.avoid, vector)
            if avoid_distance < 0.35:
                score -= 0.55
                reasons.append("sits near music you rejected")

        affinity = artist_affinity.get(track.artist.lower())
        if affinity:
            bonus = 0.5 * (affinity / max_artist)
            score += bonus
            reasons.append(f"you return to {track.artist}")

        matched_genres = [g for g in track.genres if g.lower() in genre_affinity]
        if matched_genres:
            best = max(genre_affinity[g.lower()] for g in matched_genres)
            score += 0.35 * (best / max_genre)
            reasons.append(f"matches your {matched_genres[0].lower()} listening")

        obscurity = obscurity_of(track)
        obscurity_fit = 1.0 - abs(obscurity - profile.obscurity_preference)
        score += 0.3 * obscurity_fit
        if profile.obscurity_preference > 0.65 and obscurity > 0.7:
            reasons.append("deep-catalogue, the way you like it")

        # Independent providers agreeing is evidence the match is real.
        if len(candidate.sources) > 1:
            score += 0.12 * min(len(candidate.sources) - 1, 3)
            reasons.append(f"corroborated by {len(candidate.sources)} sources")

        # A result you cannot actually hear is worth less than one you can.
        # MusicBrainz is a metadata database: great for tags and years, but its
        # bare entries should never outrank a playable catalogue track.
        if track.preview_url:
            score += 0.28
        if track.artwork_url:
            score += 0.15
        if not track.artwork_url and not track.preview_url:
            score -= 0.45
            reasons.append("metadata-only entry")

        if candidate.in_library:
            score += 0.2
            reasons.append("already in your library")

        if key in profile.disliked_keys:
            score -= 0.9
            reasons.append("you pushed this away before")

        # A weakly-understood track should not outrank a well-understood one.
        score *= 0.75 + 0.25 * inferred.confidence

        scored.append(
            ScoredTrack(
                merged=candidate,
                score=score,
                vector=vector,
                reasons=reasons or ["no strong signal yet — exploratory pick"],
                confidence=inferred.confidence,
            )
        )

    scored.sort(key=lambda s: s.score, reverse=True)
    return _diversify(scored, limit) if diversify else scored[:limit]


def _diversify(scored: list[ScoredTrack], limit: int) -> list[ScoredTrack]:
    """Avoid handing back six tracks by the same artist or the same mood."""
    out: list[ScoredTrack] = []
    artists: set[str] = set()

    for item in scored:
        if len(out) >= limit:
            break
        artist = item.merged.track.artist.lower()
        if artist in artists and len(out) < limit - 1:
            continue
        too_close = any(distance(item.vector, kept.vector) < 0.18 for kept in out)
        if too_close and len(out) >= 3:
            continue
        out.append(item)
        artists.add(artist)

    # Never return an empty room.
    if len(out) < min(limit, len(scored)):
        for item in scored:
            if item not in out:
                out.append(item)
            if len(out) >= limit:
                break
    return out[:limit]
