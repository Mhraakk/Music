"""Authentication and per-client rate limiting for the API gateway (block 2)."""

from __future__ import annotations

import hmac
import threading
import time
from dataclasses import dataclass

from fastapi import Header, HTTPException, Request, status

from app.config import Settings, get_settings


def _constant_time_in(candidate: str, allowed: list[str]) -> bool:
    return any(hmac.compare_digest(candidate, key) for key in allowed)


async def require_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> str:
    """Validates the API key when any key is configured; open in local dev."""
    settings = get_settings()
    if not settings.auth_enabled:
        return "anonymous"
    if not x_api_key or not _constant_time_in(x_api_key, settings.api_keys):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return x_api_key[:8]


@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    retry_after: int


class FixedWindowRateLimiter:
    """Thread-safe in-process limiter. Swap for Redis in multi-replica setups."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._buckets: dict[str, tuple[int, float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> RateLimitResult:
        now = time.time()
        with self._lock:
            count, reset_at = self._buckets.get(key, (0, 0.0))
            if reset_at <= now:
                count, reset_at = 0, now + self.window
            count += 1
            self._buckets[key] = (count, reset_at)
        allowed = count <= self.limit
        return RateLimitResult(
            allowed=allowed,
            limit=self.limit,
            remaining=max(0, self.limit - count),
            retry_after=max(1, int(reset_at - now)),
        )

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


def client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    api_key = request.headers.get("x-api-key")
    if api_key:
        return f"key:{api_key[:12]}"
    return request.client.host if request.client else "anonymous"


def build_rate_limiter(settings: Settings | None = None) -> FixedWindowRateLimiter:
    s = settings or get_settings()
    return FixedWindowRateLimiter(s.rate_limit_requests, s.rate_limit_window_seconds)
