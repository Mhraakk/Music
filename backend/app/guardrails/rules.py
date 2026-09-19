"""Individual guardrail rules: content filtering, prompt injection, PII, output shape."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

# --- Content filtering -------------------------------------------------
_BLOCKED_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("weapons", re.compile(r"\b(build|make|construct)\s+(a\s+)?(bomb|explosive|firearm)\b", re.I)),
    (
        "malware",
        re.compile(
            r"\b(write|generate|create)\s+(me\s+)?(a\s+)?(ransomware|keylogger|malware|virus)\b",
            re.I,
        ),
    ),
    ("self_harm", re.compile(r"\b(how\s+to\s+)?(kill|harm)\s+(myself|yourself)\b", re.I)),
    (
        "credentials",
        re.compile(r"\b(steal|dump|exfiltrate)\s+(passwords?|credentials?|api\s*keys?)\b", re.I),
    ),
]

# --- Prompt injection --------------------------------------------------
_INJECTION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "ignore_instructions",
        re.compile(
            r"\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)\b", re.I
        ),
    ),
    (
        "reveal_system_prompt",
        re.compile(
            r"\b(reveal|show|print|repeat|output)\s+(me\s+)?(your\s+)?(system\s+prompt|initial\s+instructions|hidden\s+rules)\b",
            re.I,
        ),
    ),
    (
        "role_override",
        re.compile(
            r"\byou\s+are\s+now\s+(a|an|in)\b.*\b(dan|developer\s+mode|jailbreak|unrestricted)\b",
            re.I,
        ),
    ),
    (
        "disregard_safety",
        re.compile(
            r"\b(disregard|bypass|turn\s+off)\s+(your\s+)?(safety|guardrails?|filters?|restrictions?)\b",
            re.I,
        ),
    ),
    (
        "exfiltrate_context",
        re.compile(
            r"\b(print|dump|list)\s+(all\s+)?(documents?|context|knowledge\s*base)\s+(verbatim|in\s+full)\b",
            re.I,
        ),
    ),
]

# --- PII ---------------------------------------------------------------
_PII_PATTERNS: dict[str, re.Pattern[str]] = {
    "email": re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b"),
    "phone": re.compile(
        r"(?<!\d)(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)"
    ),
    "credit_card": re.compile(r"\b(?:\d[ -]*?){13,16}\b"),
    "iban": re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b"),
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "api_key": re.compile(r"\b(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,})\b"),
}


@dataclass
class RuleHit:
    rule: str
    detail: str = ""
    severity: str = "medium"


@dataclass
class GuardOutcome:
    allowed: bool = True
    text: str = ""
    hits: list[RuleHit] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def rule_names(self) -> list[str]:
        return [h.rule for h in self.hits]


def check_content(text: str) -> list[RuleHit]:
    return [
        RuleHit(rule=f"content:{name}", detail=pattern.search(text).group(0)[:80], severity="high")
        for name, pattern in _BLOCKED_PATTERNS
        if pattern.search(text)
    ]


def check_prompt_injection(text: str) -> list[RuleHit]:
    return [
        RuleHit(
            rule=f"injection:{name}", detail=pattern.search(text).group(0)[:80], severity="high"
        )
        for name, pattern in _INJECTION_PATTERNS
        if pattern.search(text)
    ]


def detect_pii(text: str) -> list[RuleHit]:
    hits: list[RuleHit] = []
    for name, pattern in _PII_PATTERNS.items():
        for match in pattern.finditer(text):
            value = match.group(0)
            if name == "credit_card":
                digits = re.sub(r"\D", "", value)
                if len(digits) < 13 or not _luhn(digits):
                    continue
            hits.append(RuleHit(rule=f"pii:{name}", detail=_mask(value), severity="medium"))
    return hits


def redact_pii(text: str) -> tuple[str, list[RuleHit]]:
    hits = detect_pii(text)
    redacted = text
    for name, pattern in _PII_PATTERNS.items():
        if name == "credit_card":
            redacted = pattern.sub(
                lambda m, _label=name: (
                    f"[REDACTED:{_label}]" if _luhn(re.sub(r"\D", "", m.group(0))) else m.group(0)
                ),
                redacted,
            )
        else:
            redacted = pattern.sub(f"[REDACTED:{name}]", redacted)
    return redacted, hits


def _luhn(digits: str) -> bool:
    total = 0
    parity = len(digits) % 2
    for i, ch in enumerate(digits):
        d = int(ch)
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def _mask(value: str) -> str:
    if len(value) <= 4:
        return "*" * len(value)
    return f"{value[:2]}{'*' * (len(value) - 4)}{value[-2:]}"


def check_groundedness(answer: str, context: str, threshold: float) -> tuple[float, bool]:
    """Fraction of answer tokens supported by the retrieved context."""
    from app.rag.embeddings import tokenize

    answer_tokens = [t for t in tokenize(answer) if len(t) > 2]
    if not answer_tokens:
        return 0.0, False
    context_tokens = set(tokenize(context))
    if not context_tokens:
        return 0.0, False
    supported = sum(1 for t in answer_tokens if t in context_tokens)
    score = supported / len(answer_tokens)
    return round(score, 4), score >= threshold


def has_citations(answer: str) -> bool:
    return bool(re.search(r"\[\d+\]", answer))
