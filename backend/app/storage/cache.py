"""Cache / session store: in-memory by default, Redis when configured."""

from __future__ import annotations

import json
import threading
import time
from typing import Any, Protocol

from app.config import Settings, get_settings
from app.core.logging import get_logger

log = get_logger(__name__)


class Cache(Protocol):
    def get(self, key: str) -> Any | None: ...
    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None: ...
    def delete(self, key: str) -> None: ...
    def health(self) -> dict[str, Any]: ...


class MemoryCache:
    def __init__(self) -> None:
        self._data: dict[str, tuple[Any, float | None]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if expires_at is not None and expires_at <= time.time():
                del self._data[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        expires_at = time.time() + ttl_seconds if ttl_seconds else None
        with self._lock:
            self._data[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def health(self) -> dict[str, Any]:
        return {"backend": "memory", "status": "up", "keys": len(self._data)}


class RedisCache:
    def __init__(self, settings: Settings) -> None:
        import redis  # type: ignore[import-not-found]

        self._client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        self._client.ping()

    def get(self, key: str) -> Any | None:
        raw = self._client.get(key)
        return json.loads(raw) if raw else None

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        payload = json.dumps(value, ensure_ascii=False)
        if ttl_seconds:
            self._client.setex(key, ttl_seconds, payload)
        else:
            self._client.set(key, payload)

    def delete(self, key: str) -> None:
        self._client.delete(key)

    def health(self) -> dict[str, Any]:
        try:
            self._client.ping()
            return {"backend": "redis", "status": "up"}
        except Exception as exc:
            return {"backend": "redis", "status": "down", "error": str(exc)}


def build_cache(settings: Settings | None = None) -> Cache:
    s = settings or get_settings()
    if s.cache_backend == "redis":
        try:
            return RedisCache(s)
        except Exception as exc:
            log.error("cache.redis_unavailable", error=str(exc))
    return MemoryCache()
