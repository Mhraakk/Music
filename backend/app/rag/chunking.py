"""Chunking with overlap, preferring semantic boundaries.

Splits on headings/paragraphs first, then packs them into size-bounded chunks so
a chunk rarely cuts a sentence in half. Each chunk carries positional metadata
used for citations.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

_HEADING = re.compile(r"^#{1,6}\s+.+$", re.MULTILINE)


@dataclass
class Chunk:
    index: int
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


def _split_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    for paragraph in re.split(r"\n\s*\n", text):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) <= 2000:
            blocks.append(paragraph)
            continue
        # very long paragraph: fall back to sentence boundaries
        sentences = re.split(r"(?<=[.!?؟])\s+", paragraph)
        buffer = ""
        for sentence in sentences:
            if len(buffer) + len(sentence) + 1 > 2000 and buffer:
                blocks.append(buffer.strip())
                buffer = sentence
            else:
                buffer = f"{buffer} {sentence}".strip()
        if buffer:
            blocks.append(buffer.strip())
    return blocks


def _current_heading(text: str, upto: int) -> str | None:
    headings = [m.group(0).strip("# ").strip() for m in _HEADING.finditer(text[:upto])]
    return headings[-1] if headings else None


def chunk_text(
    text: str,
    chunk_size: int = 900,
    overlap: int = 150,
    base_metadata: dict[str, Any] | None = None,
) -> list[Chunk]:
    if not text.strip():
        return []
    overlap = max(0, min(overlap, chunk_size // 2))
    blocks = _split_blocks(text)
    chunks: list[Chunk] = []
    buffer = ""
    cursor = 0

    def flush(buf: str, position: int) -> None:
        if not buf.strip():
            return
        meta: dict[str, Any] = dict(base_metadata or {})
        heading = _current_heading(text, position)
        if heading:
            meta["section"] = heading
        meta["char_start"] = max(0, position - len(buf))
        meta["char_end"] = position
        chunks.append(Chunk(index=len(chunks), text=buf.strip(), metadata=meta))

    for block in blocks:
        cursor = text.find(block, cursor)
        cursor = cursor if cursor >= 0 else len(text)
        end = cursor + len(block)
        if buffer and len(buffer) + len(block) + 2 > chunk_size:
            flush(buffer, cursor)
            tail = buffer[-overlap:] if overlap else ""
            buffer = f"{tail}\n\n{block}".strip() if tail else block
        else:
            buffer = f"{buffer}\n\n{block}".strip() if buffer else block
        cursor = end

    flush(buffer, len(text))
    return chunks
