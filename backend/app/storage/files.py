"""Object/file storage for uploaded documents and generated artifacts.

Local filesystem by default; the same interface maps onto Azure Blob / S3.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from app.config import Settings, get_settings


class LocalFileStorage:
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings or get_settings()
        self.root: Path = s.file_storage_dir
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, data: bytes) -> dict[str, Any]:
        digest = hashlib.sha256(data).hexdigest()[:24]
        safe_name = Path(filename).name.replace("/", "_")
        target = self.root / f"{digest}_{safe_name}"
        target.write_bytes(data)
        return {
            "path": str(target),
            "bytes": len(data),
            "sha256_prefix": digest,
            "filename": safe_name,
        }

    def read(self, path: str) -> bytes:
        return Path(path).read_bytes()

    def health(self) -> dict[str, Any]:
        writable = self.root.exists()
        return {
            "backend": "local-fs",
            "status": "up" if writable else "down",
            "root": str(self.root),
            "files": len(list(self.root.glob("*"))) if writable else 0,
        }
