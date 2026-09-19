"""Document parsing + cleaning (Knowledge & Data block).

Supported inputs: plain text, Markdown, HTML and PDF. Each parser returns clean
UTF-8 text plus any structural metadata worth keeping for citations.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_HTML_TAG = re.compile(r"<[^>]+>")
_SCRIPT_STYLE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_MULTI_SPACE = re.compile(r"[ \t\u00a0]+")
_MULTI_NEWLINE = re.compile(r"\n{3,}")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


@dataclass
class ParsedDocument:
    text: str
    content_type: str
    metadata: dict[str, Any] = field(default_factory=dict)


_STRUCTURAL_LINE = re.compile(r"^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|\||```)")


def unwrap_hard_wraps(text: str) -> str:
    """Join hard-wrapped lines back into single-line paragraphs.

    Source documents are often wrapped at ~80 columns. Left as-is, every wrap
    looks like a sentence boundary downstream, which shreds both chunk metadata
    and extractive generation. Headings, list items and code fences are kept on
    their own lines.
    """
    out: list[str] = []
    for paragraph in text.split("\n\n"):
        lines = [ln.strip() for ln in paragraph.split("\n") if ln.strip()]
        if not lines:
            continue
        merged: list[str] = []
        for line in lines:
            if not merged or _STRUCTURAL_LINE.match(line) or _STRUCTURAL_LINE.match(merged[-1]):
                merged.append(line)
            else:
                merged[-1] = f"{merged[-1]} {line}"
        out.append("\n".join(merged))
    return "\n\n".join(out)


def clean_text(raw: str) -> str:
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    text = _CONTROL.sub("", text)
    text = _MULTI_SPACE.sub(" ", text)
    text = _MULTI_NEWLINE.sub("\n\n", text)
    text = "\n".join(line.strip() for line in text.split("\n")).strip()
    return unwrap_hard_wraps(text)


def parse_html(raw: str) -> ParsedDocument:
    body = _SCRIPT_STYLE.sub(" ", raw)
    title_match = re.search(r"<title[^>]*>(.*?)</title>", body, re.DOTALL | re.IGNORECASE)
    text = _HTML_TAG.sub(" ", body)
    meta: dict[str, Any] = {}
    if title_match:
        meta["html_title"] = clean_text(title_match.group(1))
    return ParsedDocument(text=clean_text(text), content_type="text/html", metadata=meta)


def parse_pdf(data: bytes) -> ParsedDocument:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return ParsedDocument(
        text=clean_text("\n\n".join(pages)),
        content_type="application/pdf",
        metadata={"page_count": len(reader.pages)},
    )


def parse_markdown(raw: str) -> ParsedDocument:
    headings = re.findall(r"^#{1,6}\s+(.+)$", raw, re.MULTILINE)
    return ParsedDocument(
        text=clean_text(raw),
        content_type="text/markdown",
        metadata={"headings": headings[:20]},
    )


def parse_bytes(filename: str, data: bytes) -> ParsedDocument:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return parse_pdf(data)
    decoded = data.decode("utf-8", errors="replace")
    if suffix in {".html", ".htm"}:
        return parse_html(decoded)
    if suffix in {".md", ".markdown"}:
        return parse_markdown(decoded)
    return ParsedDocument(text=clean_text(decoded), content_type="text/plain")


def parse_text(raw: str, content_type: str = "text/plain") -> ParsedDocument:
    if content_type == "text/html":
        return parse_html(raw)
    if content_type == "text/markdown":
        return parse_markdown(raw)
    return ParsedDocument(text=clean_text(raw), content_type=content_type)
