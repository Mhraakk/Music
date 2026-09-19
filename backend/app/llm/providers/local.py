"""Offline grounded generator.

This provider needs no API key and no model download, so the whole stack runs in
CI and on a laptop. It performs extractive, citation-preserving synthesis over
the retrieved context: sentences are scored against the question, the best ones
are ordered and stitched into an answer that keeps its [n] references.

It is intentionally conservative — if the context does not support an answer it
says so rather than inventing one. Swap in OpenAI/Anthropic/Ollama via
`LLM_PROVIDER` for fluent generation.
"""

from __future__ import annotations

import re
from typing import Any

from app.llm.base import ChatMessage, LLMResponse
from app.rag.embeddings import tokenize

_SENTENCE = re.compile(r"\s*\n\s*")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?؟])\s+")
_REF_HEADER = re.compile(r"^\[(\d+)\]\s*(.*)$")


_HEADING_LINE = re.compile(r"^\s*#{1,6}\s+")
_BULLET_LINE = re.compile(r"^\s*[-*•]\s+")


def _candidate_units(body: str) -> list[str]:
    """Split a context block into quotable units.

    Prose becomes sentences; bullet/key-value lines (as produced by tool results)
    stay whole, because "total: 60" is evidence even though it is short. Heading
    lines are dropped — the block header already carries the section name.
    """
    units: list[str] = []
    prose: list[str] = []

    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped or _HEADING_LINE.match(stripped):
            continue
        if _BULLET_LINE.match(stripped):
            unit = _BULLET_LINE.sub("", stripped).strip()
            if len(unit) >= 5:
                units.append(unit)
        else:
            prose.append(stripped)

    if prose:
        flattened = " ".join(prose)
        for sentence in _SENTENCE_SPLIT.split(flattened):
            sentence = sentence.strip(" -•\t")
            # short sentences often carry the key fact ("The default threshold is 0.35."),
            # so gate on content-word count rather than raw length alone
            if len(sentence) >= 25 and len(tokenize(sentence)) >= 3:
                units.append(sentence)

    return units


def _is_duplicate(tokens: set[str], kept: list[set[str]], threshold: float = 0.6) -> bool:
    """Chunk overlap produces near-identical sentences; drop them by Jaccard."""
    if not tokens:
        return True
    for other in kept:
        union = tokens | other
        if not union:
            continue
        if len(tokens & other) / len(union) >= threshold:
            return True
    return False


def _split_context_blocks(context: str) -> list[tuple[int, str, str]]:
    """Returns (ref, header, body) for each '[n] Title\\ntext' block."""
    blocks: list[tuple[int, str, str]] = []
    for raw in context.split("\n\n---\n\n"):
        raw = raw.strip()
        if not raw:
            continue
        first, _, rest = raw.partition("\n")
        match = _REF_HEADER.match(first.strip())
        if match:
            blocks.append((int(match.group(1)), match.group(2).strip(), rest.strip()))
        else:
            blocks.append((len(blocks) + 1, "", raw))
    return blocks


def _score_sentence(sentence: str, query_tokens: set[str]) -> float:
    tokens = set(tokenize(sentence))
    if not tokens or not query_tokens:
        return 0.0
    overlap = len(tokens & query_tokens)
    if overlap == 0:
        return 0.0
    # favour informative sentences without rewarding walls of text
    length_penalty = 1.0 if len(sentence) < 320 else 0.75
    return (overlap / len(query_tokens)) * length_penalty


class LocalGroundedLLM:
    name = "local"

    def __init__(self, model: str = "resonant-local-v1") -> None:
        self.model = model

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        user_msg = next((m for m in reversed(messages) if m.role == "user"), None)
        if user_msg is None:
            return LLMResponse(text="", provider=self.name, model=self.model, finish_reason="empty")

        content = user_msg.content
        question = self._extract(content, "QUESTION:")
        context = self._extract(content, "CONTEXT:")

        if not context or context.startswith("No relevant passages"):
            text = (
                "I could not find anything in the knowledge base that answers this. "
                "Try asking about RESONANT's recommendation engine, its taste graph, "
                "the track catalog, or the platform architecture."
            )
            return LLMResponse(
                text=text,
                provider=self.name,
                model=self.model,
                finish_reason="no_context",
                metadata={"grounded": False},
            )

        answer = self._synthesize(question, context, max_tokens or 800)
        return LLMResponse(
            text=answer,
            provider=self.name,
            model=self.model,
            prompt_tokens=len(content.split()),
            completion_tokens=len(answer.split()),
            metadata={"grounded": True, "strategy": "extractive"},
        )

    @staticmethod
    def _extract(content: str, marker: str) -> str:
        if marker not in content:
            return ""
        after = content.split(marker, 1)[1]
        for other in ("CONTEXT:", "QUESTION:", "KNOWN ABOUT THE USER:"):
            if other != marker and other in after:
                after = after.split(other, 1)[0]
        return after.strip()

    def _synthesize(self, question: str, context: str, max_chars: int) -> str:
        query_tokens = set(tokenize(question))
        scored: list[tuple[float, int, str, set[str]]] = []

        for position, (ref, header, body) in enumerate(_split_context_blocks(context)):
            # blocks arrive rank-ordered; earlier blocks are better evidence
            rank_bonus = max(0.0, 0.25 - 0.05 * position)
            header_score = _score_sentence(header, query_tokens) if header else 0.0
            for sentence in _candidate_units(body):
                unit_score = _score_sentence(sentence, query_tokens)
                # a strong header match (e.g. a tool block) makes its units eligible
                if unit_score <= 0 and header_score <= 0:
                    continue
                score = unit_score + 0.25 * header_score + rank_bonus
                scored.append((score, ref, sentence, set(tokenize(sentence))))

        if not scored:
            return (
                "The retrieved passages do not directly answer that question. "
                "Try narrowing the question or asking about a specific component."
            )

        scored.sort(key=lambda item: item[0], reverse=True)

        selected: list[tuple[int, str]] = []
        kept_tokens: list[set[str]] = []
        budget = min(max_chars, 900)
        used = 0

        for _score, ref, sentence, tokens in scored:
            if _is_duplicate(tokens, kept_tokens):
                continue
            if used + len(sentence) > budget and selected:
                break
            selected.append((ref, sentence))
            kept_tokens.append(tokens)
            used += len(sentence)
            if len(selected) >= 4:
                break

        lines: list[str] = []
        for ref, sentence in selected:
            clean = sentence.strip()
            if not clean.endswith((".", "!", "?", "؟", ":")):
                clean += "."
            lines.append(f"- {clean} [{ref}]")

        refs = sorted({ref for ref, _ in selected})
        footer = "Sources: " + ", ".join(f"[{r}]" for r in refs)
        return "\n".join(lines) + "\n\n" + footer

    def health(self) -> dict[str, Any]:
        return {"provider": self.name, "model": self.model, "status": "up", "requires_key": False}
