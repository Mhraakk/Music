"""Candidate generation for taste-driven recommendations.

A profile is not a search query. Concatenating a listener's favourite artists
into one string produces a phrase no catalogue can match, so candidates are
gathered from several independent seeds — each favourite artist, each strong
genre — and pooled before ranking. That is also what makes discovery possible:
artist seeds return more of what is already loved, genre seeds return
neighbours the listener has never heard.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.logging import get_logger
from app.sources.registry import MergedTrack, SourceRegistry
from app.taste.profile import TasteProfile

log = get_logger(__name__)

DEFAULT_SEEDS = ["ambient electronic", "modern classical"]


@dataclass
class CandidatePool:
    seeds: list[str]
    tracks: list[MergedTrack]
    errors: dict[str, str]


def build_seeds(profile: TasteProfile, query: str | None = None, max_seeds: int = 5) -> list[str]:
    """Explicit query wins; otherwise expand the profile into separate seeds."""
    if query and query.strip():
        return [query.strip()]

    seeds: list[str] = []
    for artist, _weight in profile.top_artists[:3]:
        if artist and artist != "Unknown":
            seeds.append(artist)
    for genre, _weight in profile.top_genres[:3]:
        if genre and genre not in seeds:
            seeds.append(genre)

    if not seeds:
        seeds = list(DEFAULT_SEEDS)
    return seeds[:max_seeds]


def gather_candidates(
    sources: SourceRegistry,
    profile: TasteProfile,
    *,
    query: str | None = None,
    per_seed: int = 8,
    max_seeds: int = 5,
) -> CandidatePool:
    seeds = build_seeds(profile, query, max_seeds=max_seeds)
    pooled: list[MergedTrack] = []
    errors: dict[str, str] = {}
    seen: set[str] = set()

    for seed in seeds:
        merged, seed_errors = sources.search_all(seed, limit=per_seed)
        errors.update(seed_errors)
        for candidate in merged:
            key = candidate.track.key
            if key in seen:
                continue
            seen.add(key)
            pooled.append(candidate)

    log.info("taste.candidates", seeds=len(seeds), pooled=len(pooled))
    return CandidatePool(seeds=seeds, tracks=pooled, errors=errors)
