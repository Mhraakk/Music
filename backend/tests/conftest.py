from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

TMP_ROOT = Path(tempfile.mkdtemp(prefix="resonant-test-"))

os.environ.update(
    {
        "ENVIRONMENT": "test",
        "LOG_LEVEL": "WARNING",
        "DATABASE_URL": f"sqlite:///{TMP_ROOT / 'test.db'}",
        "FILE_STORAGE_DIR": str(TMP_ROOT / "files"),
        "VECTOR_STORE": "memory",
        "CACHE_BACKEND": "memory",
        "LLM_PROVIDER": "local",
        "EMBEDDING_PROVIDER": "local",
    }
)

from app.config import get_settings  # noqa: E402
from app.services import ServiceContainer, build_container, get_container  # noqa: E402


@pytest.fixture(scope="session")
def settings():
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture
def container(settings) -> Iterator[ServiceContainer]:
    c = build_container(settings)
    c.seed_knowledge()
    yield c


@pytest.fixture
def api_client(settings):
    from fastapi.testclient import TestClient

    from app.main import create_app

    get_container.cache_clear()
    app = create_app()
    with TestClient(app) as client:
        yield client
    get_container.cache_clear()
