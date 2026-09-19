"""Guardrail orchestration: input guards before the agent, output guards after it."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.observability import GUARDRAIL_BLOCKS
from app.guardrails.rules import (
    GuardOutcome,
    RuleHit,
    check_content,
    check_groundedness,
    check_prompt_injection,
    detect_pii,
    has_citations,
    redact_pii,
)

log = get_logger(__name__)

REFUSAL_CONTENT = "I can't help with that request. It falls outside RESONANT's safety policy."
REFUSAL_INJECTION = (
    "I can't follow instructions that try to override my operating rules. "
    "Ask me about the music catalog, the recommendation engine, or the platform docs instead."
)


@dataclass
class SafetyReport:
    input_hits: list[RuleHit] = field(default_factory=list)
    output_hits: list[RuleHit] = field(default_factory=list)
    groundedness: float = 0.0
    grounded: bool = False
    pii_redacted: bool = False
    blocked: bool = False
    block_reason: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "blocked": self.blocked,
            "block_reason": self.block_reason,
            "input_rules": [h.rule for h in self.input_hits],
            "output_rules": [h.rule for h in self.output_hits],
            "groundedness": self.groundedness,
            "grounded": self.grounded,
            "pii_redacted": self.pii_redacted,
        }


class Guardrails:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def check_input(self, text: str) -> GuardOutcome:
        content_hits = check_content(text)
        if content_hits:
            for hit in content_hits:
                GUARDRAIL_BLOCKS.labels("input", hit.rule).inc()
            log.warning("guardrails.input_blocked", rules=[h.rule for h in content_hits])
            return GuardOutcome(allowed=False, text=REFUSAL_CONTENT, hits=content_hits)

        injection_hits = check_prompt_injection(text)
        if injection_hits:
            for hit in injection_hits:
                GUARDRAIL_BLOCKS.labels("input", hit.rule).inc()
            log.warning("guardrails.injection_blocked", rules=[h.rule for h in injection_hits])
            return GuardOutcome(allowed=False, text=REFUSAL_INJECTION, hits=injection_hits)

        sanitized, pii_hits = redact_pii(text)
        if pii_hits:
            for hit in pii_hits:
                GUARDRAIL_BLOCKS.labels("input", hit.rule).inc()
            log.info("guardrails.input_pii_redacted", count=len(pii_hits))
        return GuardOutcome(allowed=True, text=sanitized, hits=pii_hits)

    def check_output(self, answer: str, context: str) -> GuardOutcome:
        hits: list[RuleHit] = []

        content_hits = check_content(answer)
        if content_hits:
            for hit in content_hits:
                GUARDRAIL_BLOCKS.labels("output", hit.rule).inc()
            return GuardOutcome(allowed=False, text=REFUSAL_CONTENT, hits=content_hits)

        sanitized, pii_hits = redact_pii(answer)
        hits.extend(pii_hits)
        for hit in pii_hits:
            GUARDRAIL_BLOCKS.labels("output", hit.rule).inc()

        score, grounded = check_groundedness(
            sanitized, context, self.settings.groundedness_threshold
        )
        if context and not grounded:
            hits.append(RuleHit(rule="grounding:low_support", detail=f"score={score}"))
            GUARDRAIL_BLOCKS.labels("output", "grounding:low_support").inc()
            sanitized += (
                "\n\n_Note: parts of this answer are weakly supported by the retrieved sources._"
            )

        if context and not has_citations(sanitized):
            hits.append(RuleHit(rule="grounding:missing_citations", severity="low"))

        return GuardOutcome(
            allowed=True,
            text=sanitized,
            hits=hits,
            metadata={"groundedness": score, "grounded": grounded, "pii_redacted": bool(pii_hits)},
        )

    @staticmethod
    def scan_pii(text: str) -> list[RuleHit]:
        return detect_pii(text)
