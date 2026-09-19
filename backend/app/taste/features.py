"""Understanding: turn any external track into RESONANT's emotional vector.

The local catalogue is hand-annotated on six axes — darkness, warmth, organic
texture, energy, mainstream gravity and sadness. Tracks arriving from Spotify,
Apple Music, YouTube, Telegram or the open internet have none of that, so this
module infers it from whatever each provider does give us:

1. Spotify audio features (valence, energy, acousticness…) — the strongest
   signal, used directly when present.
2. Genre and tag vocabulary — mapped through a lexicon of axis contributions.
3. Title/album wording, release decade and popularity — weak priors that still
   separate "Doomjazz" from "Summer Party Hits".

Every inference reports a confidence so downstream ranking can trust provider
features more than text heuristics.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.sources.base import ExternalTrack

AXES = ("d", "w", "o", "e", "m", "s")

Vector = dict[str, float]

NEUTRAL: Vector = {"d": 0.5, "w": 0.5, "o": 0.5, "e": 0.5, "m": 0.5, "s": 0.5}


@dataclass
class InferredVector:
    vector: Vector
    confidence: float
    basis: str

    def as_dict(self) -> dict[str, object]:
        return {"vector": self.vector, "confidence": round(self.confidence, 3), "basis": self.basis}


# Genre / tag vocabulary → per-axis nudges in [-1, 1].
GENRE_LEXICON: dict[str, Vector] = {
    # dark / heavy
    "doom": {"d": 0.45, "e": -0.15, "s": 0.3, "m": -0.3},
    "darkjazz": {"d": 0.45, "o": 0.2, "e": -0.25, "m": -0.35},
    "noir": {"d": 0.4, "s": 0.25, "m": -0.2},
    "industrial": {"d": 0.35, "o": -0.3, "e": 0.25, "w": -0.25},
    "black metal": {"d": 0.5, "e": 0.4, "w": -0.4, "m": -0.3},
    "metal": {"d": 0.3, "e": 0.4, "w": -0.2},
    "gothic": {"d": 0.4, "s": 0.3, "m": -0.2},
    "witch house": {"d": 0.4, "o": -0.2, "m": -0.35},
    # ambient / calm
    "ambient": {"e": -0.4, "o": 0.1, "m": -0.25},
    "drone": {"e": -0.45, "d": 0.2, "m": -0.4},
    "new age": {"e": -0.35, "w": 0.25, "o": 0.2, "m": -0.15},
    "meditation": {"e": -0.4, "w": 0.2, "m": -0.2},
    "field recording": {"o": 0.45, "e": -0.35, "m": -0.45},
    "lo-fi": {"w": 0.25, "e": -0.2, "o": 0.15, "m": -0.1},
    "slowcore": {"e": -0.35, "s": 0.35, "m": -0.3},
    # organic / acoustic
    "classical": {"o": 0.45, "m": -0.1, "e": -0.1},
    "modern classical": {"o": 0.45, "e": -0.2, "m": -0.25, "s": 0.15},
    "piano": {"o": 0.4, "e": -0.2},
    "acoustic": {"o": 0.45, "w": 0.2, "e": -0.15},
    "folk": {"o": 0.4, "w": 0.25, "e": -0.1},
    "jazz": {"o": 0.35, "w": 0.2, "m": -0.2},
    "blues": {"o": 0.3, "w": 0.2, "s": 0.3},
    "soul": {"w": 0.4, "o": 0.25, "m": 0.1},
    # electronic
    "electronic": {"o": -0.3, "e": 0.15},
    "techno": {"o": -0.4, "e": 0.4, "d": 0.2},
    "house": {"o": -0.3, "e": 0.3, "w": 0.3},
    "deep house": {"o": -0.2, "e": 0.15, "w": 0.35, "d": 0.1},
    "idm": {"o": -0.25, "e": 0.1, "m": -0.35},
    "dub": {"d": 0.2, "e": -0.1, "w": 0.2, "m": -0.2},
    "dubstep": {"d": 0.3, "e": 0.35, "o": -0.35},
    "drum and bass": {"e": 0.5, "o": -0.3},
    "trip hop": {"d": 0.25, "s": 0.25, "e": -0.15, "m": -0.1},
    "downtempo": {"e": -0.3, "w": 0.15, "m": -0.15},
    "synthwave": {"o": -0.35, "e": 0.2, "w": 0.15},
    "shoegaze": {"w": 0.25, "s": 0.25, "d": 0.2, "m": -0.2},
    "post-rock": {"o": 0.25, "s": 0.25, "e": 0.05, "m": -0.25},
    "post-punk": {"d": 0.3, "e": 0.25, "m": -0.15},
    "experimental": {"m": -0.45, "o": 0.1},
    "avant-garde": {"m": -0.5, "o": 0.15},
    "minimal": {"e": -0.2, "m": -0.3},
    # bright / mainstream
    "pop": {"m": 0.45, "w": 0.25, "e": 0.25, "s": -0.2},
    "dance": {"m": 0.35, "e": 0.45, "w": 0.2},
    "hip hop": {"e": 0.25, "m": 0.25, "o": -0.15},
    "rap": {"e": 0.3, "m": 0.25, "o": -0.2},
    "r&b": {"w": 0.35, "m": 0.25},
    "rock": {"e": 0.3, "o": 0.15, "m": 0.2},
    "indie": {"m": -0.2, "o": 0.15},
    "country": {"o": 0.35, "w": 0.25, "m": 0.15},
    "latin": {"w": 0.35, "e": 0.35, "m": 0.2},
    "reggae": {"w": 0.3, "e": 0.1, "m": 0.1},
    "soundtrack": {"o": 0.2, "m": -0.1, "s": 0.15},
    "score": {"o": 0.3, "e": -0.15, "m": -0.2},
}

# Title/album wording gives a weaker but useful prior.
TEXT_LEXICON: dict[str, Vector] = {
    "night": {"d": 0.2, "s": 0.1},
    "midnight": {"d": 0.3, "s": 0.15},
    "dark": {"d": 0.3},
    "black": {"d": 0.25},
    "shadow": {"d": 0.25},
    "winter": {"d": 0.15, "w": -0.25, "s": 0.2},
    "cold": {"w": -0.35},
    "ice": {"w": -0.3, "d": 0.1},
    "sun": {"w": 0.3, "s": -0.2},
    "summer": {"w": 0.35, "e": 0.2, "s": -0.25},
    "warm": {"w": 0.35},
    "love": {"w": 0.25, "s": -0.1},
    "cry": {"s": 0.35},
    "tears": {"s": 0.35},
    "sad": {"s": 0.4},
    "lonely": {"s": 0.35, "d": 0.15},
    "dream": {"e": -0.2, "s": 0.1},
    "sleep": {"e": -0.4},
    "calm": {"e": -0.35, "w": 0.15},
    "slow": {"e": -0.3},
    "rise": {"e": 0.25},
    "fire": {"e": 0.3, "w": 0.25},
    "party": {"e": 0.4, "m": 0.35, "s": -0.3},
    "remix": {"o": -0.2, "e": 0.15},
    "live": {"o": 0.25},
    "acoustic": {"o": 0.4, "e": -0.15},
    "piano": {"o": 0.4, "e": -0.2},
    "requiem": {"s": 0.4, "d": 0.3, "o": 0.3},
}

_WORD = re.compile(r"[a-z0-9&+-]+")


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _apply(vector: Vector, nudges: Vector, weight: float) -> None:
    for axis, delta in nudges.items():
        vector[axis] = vector[axis] + delta * weight


def _tokens(text: str) -> list[str]:
    return _WORD.findall((text or "").lower())


def _from_audio_features(features: dict[str, float]) -> Vector | None:
    """Spotify's feature space maps almost directly onto ours."""
    if not features:
        return None
    valence = features.get("valence")
    energy = features.get("energy")
    acousticness = features.get("acousticness")
    if valence is None and energy is None and acousticness is None:
        return None

    vector = dict(NEUTRAL)
    if valence is not None:
        vector["s"] = _clamp(1.0 - valence)
        vector["w"] = _clamp(0.35 + valence * 0.5)
    if energy is not None:
        vector["e"] = _clamp(energy)
        vector["d"] = _clamp(0.35 + (1.0 - (valence if valence is not None else 0.5)) * 0.5)
    if acousticness is not None:
        vector["o"] = _clamp(acousticness)
    instrumentalness = features.get("instrumentalness")
    if instrumentalness is not None:
        # instrumental music tends to sit further from chart gravity
        vector["m"] = _clamp(vector["m"] - instrumentalness * 0.3)
    return vector


def infer_vector(track: ExternalTrack) -> InferredVector:
    """Best-effort emotional vector for a track from any source."""
    from_features = _from_audio_features(track.audio_features)
    if from_features is not None:
        # Genres still refine mainstream gravity and texture.
        vector = dict(from_features)
        matched = _apply_genres(vector, track, weight=0.35)
        _apply_popularity(vector, track)
        return InferredVector(
            vector={k: round(_clamp(v), 4) for k, v in vector.items()},
            confidence=0.9,
            basis="provider audio features" + (f" + {matched} genre tags" if matched else ""),
        )

    vector = dict(NEUTRAL)
    matched_genres = _apply_genres(vector, track, weight=1.0)
    matched_text = _apply_text(vector, track)
    _apply_popularity(vector, track)
    _apply_decade(vector, track)

    confidence = 0.25 + min(0.4, matched_genres * 0.12) + min(0.15, matched_text * 0.05)
    basis_parts = []
    if matched_genres:
        basis_parts.append(f"{matched_genres} genre tags")
    if matched_text:
        basis_parts.append(f"{matched_text} title cues")
    if track.popularity is not None:
        basis_parts.append("popularity")
    basis = ", ".join(basis_parts) or "neutral prior"

    return InferredVector(
        vector={k: round(_clamp(v), 4) for k, v in vector.items()},
        confidence=round(min(confidence, 0.75), 3),
        basis=basis,
    )


def _apply_genres(vector: Vector, track: ExternalTrack, weight: float) -> int:
    matched = 0
    haystack = " ".join(track.genres).lower()
    if not haystack:
        return 0
    for genre, nudges in GENRE_LEXICON.items():
        if genre in haystack:
            _apply(vector, nudges, weight)
            matched += 1
    return matched


def _apply_text(vector: Vector, track: ExternalTrack) -> int:
    matched = 0
    words = set(_tokens(f"{track.title} {track.album or ''}"))
    for word, nudges in TEXT_LEXICON.items():
        if word in words:
            _apply(vector, nudges, 0.6)
            matched += 1
    return matched


def _apply_popularity(vector: Vector, track: ExternalTrack) -> None:
    if track.popularity is None:
        return
    # Popularity is exactly the "mainstream gravity" axis.
    vector["m"] = _clamp(0.35 * vector["m"] + 0.65 * track.popularity)


def _apply_decade(vector: Vector, track: ExternalTrack) -> None:
    if not track.year:
        return
    if track.year < 1980:
        _apply(vector, {"o": 0.2, "m": -0.05}, 1.0)
    elif track.year >= 2015:
        _apply(vector, {"o": -0.1, "e": 0.05}, 1.0)


def obscurity_of(track: ExternalTrack) -> float:
    """0..1 distance from chart music, mirroring the local catalogue field."""
    if track.popularity is not None:
        return round(_clamp(1.0 - track.popularity), 4)
    # No popularity signal: corroboration by many providers implies reach.
    return 0.6


def distance(a: Vector, b: Vector) -> float:
    """Weighted emotional distance, matching the local engine's weighting."""
    weights = {"d": 1.45, "w": 1.55, "o": 1.05, "e": 1.7, "m": 0.75, "s": 1.55}
    total = 0.0
    for axis, weight in weights.items():
        delta = a.get(axis, 0.5) - b.get(axis, 0.5)
        total += delta * delta * weight
    return total**0.5
