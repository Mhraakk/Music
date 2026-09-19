"""Structured JSON logging with request-scoped correlation IDs."""

from __future__ import annotations

import contextvars
import json
import logging
import sys
import uuid
from typing import Any

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


def new_request_id() -> str:
    return uuid.uuid4().hex[:16]


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "event": record.getMessage(),
            "request_id": request_id_ctx.get(),
        }
        extra = getattr(record, "fields", None)
        if isinstance(extra, dict):
            payload.update(extra)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    # uvicorn's access log is redundant with our request middleware
    logging.getLogger("uvicorn.access").disabled = True


class BoundLogger:
    """Thin wrapper so call sites can pass structured fields."""

    def __init__(self, name: str) -> None:
        self._log = logging.getLogger(name)

    def _emit(self, level: int, event: str, **fields: Any) -> None:
        self._log.log(level, event, extra={"fields": fields})

    def debug(self, event: str, **f: Any) -> None:
        self._emit(logging.DEBUG, event, **f)

    def info(self, event: str, **f: Any) -> None:
        self._emit(logging.INFO, event, **f)

    def warning(self, event: str, **f: Any) -> None:
        self._emit(logging.WARNING, event, **f)

    def error(self, event: str, **f: Any) -> None:
        self._emit(logging.ERROR, event, **f)


def get_logger(name: str) -> BoundLogger:
    return BoundLogger(name)
