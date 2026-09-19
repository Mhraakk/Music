"""Tool registry with explicit permissions (Guardrails: "Tool Permissions").

Tools are pure callables with a declared schema and permission level. The agent
may only invoke tools whose permission is granted for the current request.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from app.core.logging import get_logger

log = get_logger(__name__)

Permission = Literal["read", "write", "admin"]

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "catalog.json"


@dataclass
class ToolSpec:
    name: str
    description: str
    permission: Permission
    parameters: dict[str, str]
    handler: Callable[..., dict[str, Any]]


@dataclass
class ToolCall:
    name: str
    args: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResult:
    name: str
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


class ToolRegistry:
    def __init__(self, granted: set[Permission] | None = None) -> None:
        self._tools: dict[str, ToolSpec] = {}
        # an explicitly empty set means "grant nothing" — do not fall back to read
        self.granted: set[Permission] = {"read"} if granted is None else set(granted)

    def register(self, spec: ToolSpec) -> None:
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def list_specs(self) -> list[dict[str, Any]]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "permission": t.permission,
                "parameters": t.parameters,
                "allowed": t.permission in self.granted,
            }
            for t in self._tools.values()
        ]

    def invoke(self, call: ToolCall) -> ToolResult:
        spec = self._tools.get(call.name)
        if spec is None:
            return ToolResult(call.name, ok=False, error="unknown_tool")
        if spec.permission not in self.granted:
            log.warning("tools.permission_denied", tool=call.name, required=spec.permission)
            return ToolResult(call.name, ok=False, error="permission_denied")
        try:
            data = spec.handler(**call.args)
            log.info("tools.invoked", tool=call.name)
            return ToolResult(call.name, ok=True, data=data)
        except TypeError as exc:
            return ToolResult(call.name, ok=False, error=f"bad_arguments: {exc}")
        except Exception as exc:
            log.error("tools.failed", tool=call.name, error=str(exc))
            return ToolResult(call.name, ok=False, error=str(exc))


# --------------------------------------------------------------------------
# Domain tools — the music catalog that the RESONANT frontend also serves.
# --------------------------------------------------------------------------
def _load_catalog() -> list[dict[str, Any]]:
    if not CATALOG_PATH.exists():
        return []
    try:
        return json.loads(CATALOG_PATH.read_text("utf-8"))
    except Exception as exc:
        log.error("tools.catalog_load_failed", error=str(exc))
        return []


def catalog_search(query: str = "", limit: int = 5) -> dict[str, Any]:
    """Search the track catalog by title, artist, album, emotion or mood text."""
    catalog = _load_catalog()
    q = (query or "").lower().strip()
    if not q:
        items = catalog[:limit]
    else:
        scored: list[tuple[int, dict[str, Any]]] = []
        for track in catalog:
            haystack = " ".join(
                str(track.get(k, "")) for k in ("title", "artist", "album", "emotion", "why")
            ).lower()
            score = sum(1 for token in q.split() if token in haystack)
            if score:
                scored.append((score, track))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        items = [t for _, t in scored[:limit]]
    return {
        "query": query,
        "count": len(items),
        "tracks": [
            {
                "id": t.get("id"),
                "title": t.get("title"),
                "artist": t.get("artist"),
                "album": t.get("album"),
                "year": t.get("year"),
                "emotion": t.get("emotion"),
            }
            for t in items
        ],
    }


def catalog_stats() -> dict[str, Any]:
    """Aggregate statistics about the catalog."""
    catalog = _load_catalog()
    if not catalog:
        return {"total": 0, "artists": 0}
    artists = {t.get("artist") for t in catalog}
    years = [t.get("year") for t in catalog if isinstance(t.get("year"), int)]
    obscurity = [
        t.get("obscurity") for t in catalog if isinstance(t.get("obscurity"), (int, float))
    ]
    return {
        "total": len(catalog),
        "artists": len(artists),
        "year_min": min(years) if years else None,
        "year_max": max(years) if years else None,
        "avg_obscurity": round(sum(obscurity) / len(obscurity), 3) if obscurity else None,
    }


def recommend_by_mood(mood: str = "", limit: int = 5) -> dict[str, Any]:
    """Recommend tracks matching a mood word (warm, dark, sad, calm, energetic)."""
    catalog = _load_catalog()
    axis_map = {
        "warm": ("w", 1),
        "cozy": ("w", 1),
        "dark": ("d", 1),
        "noir": ("d", 1),
        "sad": ("s", 1),
        "melancholy": ("s", 1),
        "calm": ("e", -1),
        "quiet": ("e", -1),
        "energetic": ("e", 1),
        "fast": ("e", 1),
        "organic": ("o", 1),
        "acoustic": ("o", 1),
    }
    key = None
    direction = 1
    for word, (axis, sign) in axis_map.items():
        if word in (mood or "").lower():
            key, direction = axis, sign
            break
    if key is None:
        return {"mood": mood, "matched_axis": None, "tracks": [], "count": 0}

    def axis_value(track: dict[str, Any]) -> float:
        vec = track.get("v") or {}
        return float(vec.get(key, 0.0)) * direction

    ranked = sorted(catalog, key=axis_value, reverse=True)[:limit]
    return {
        "mood": mood,
        "matched_axis": key,
        "count": len(ranked),
        "tracks": [
            {
                "id": t.get("id"),
                "title": t.get("title"),
                "artist": t.get("artist"),
                "why": t.get("why"),
            }
            for t in ranked
        ],
    }


def build_tool_registry(granted: set[Permission] | None = None) -> ToolRegistry:
    registry = ToolRegistry(granted=granted)
    registry.register(
        ToolSpec(
            name="catalog_search",
            description="Search the RESONANT track catalog by title, artist, album or mood text.",
            permission="read",
            parameters={"query": "string", "limit": "integer"},
            handler=catalog_search,
        )
    )
    registry.register(
        ToolSpec(
            name="catalog_stats",
            description="Aggregate catalog statistics: track count, artists, year range, obscurity.",
            permission="read",
            parameters={},
            handler=catalog_stats,
        )
    )
    registry.register(
        ToolSpec(
            name="recommend_by_mood",
            description="Recommend tracks for a mood (warm, dark, sad, calm, energetic, organic).",
            permission="read",
            parameters={"mood": "string", "limit": "integer"},
            handler=recommend_by_mood,
        )
    )
    return registry
