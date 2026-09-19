"""Offline evaluation harness (LLMOps: Evaluation Pipeline).

Measures retrieval hit rate, answer correctness against required facts,
groundedness, citation coverage, routing accuracy and safety-block accuracy.
Run it in CI to catch regressions before a model or prompt change ships.

    python -m app.eval.harness            # human-readable report
    python -m app.eval.harness --json     # machine-readable for dashboards
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Any

from app.eval.dataset import GOLDEN_SET, EvalCase
from app.services import ServiceContainer, build_container


@dataclass
class CaseResult:
    id: str
    question: str
    passed: bool
    route_ok: bool
    retrieval_hit: bool
    facts_ok: bool
    grounded: bool
    groundedness: float
    citations: int
    latency_ms: float
    failures: list[str] = field(default_factory=list)


@dataclass
class EvalReport:
    total: int
    passed: int
    retrieval_hit_rate: float
    fact_accuracy: float
    routing_accuracy: float
    groundedness_avg: float
    safety_accuracy: float
    p50_latency_ms: float
    cases: list[CaseResult]

    @property
    def pass_rate(self) -> float:
        return round(self.passed / self.total, 4) if self.total else 0.0

    def as_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["pass_rate"] = self.pass_rate
        return payload


def _evaluate_case(container: ServiceContainer, case: EvalCase) -> CaseResult:
    started = time.perf_counter()
    reply = container.agent.run(question=case.question, user_id="eval-bot")
    latency = round((time.perf_counter() - started) * 1000, 2)

    failures: list[str] = []
    route_ok = reply.route == case.expected_route
    if not route_ok:
        failures.append(f"route={reply.route} expected={case.expected_route}")

    if case.should_block:
        blocked = bool(reply.safety.get("blocked"))
        if not blocked:
            failures.append("expected the request to be blocked")
        return CaseResult(
            id=case.id,
            question=case.question,
            passed=blocked and route_ok,
            route_ok=route_ok,
            retrieval_hit=True,
            facts_ok=blocked,
            grounded=True,
            groundedness=0.0,
            citations=0,
            latency_ms=latency,
            failures=failures,
        )

    sources = " ".join(
        f"{c.get('source', '')} {c.get('document_id', '')}" for c in reply.citations
    ).lower()
    retrieval_hit = case.expected_source_contains.lower() in sources
    if not retrieval_hit:
        failures.append(f"expected source '{case.expected_source_contains}' not cited")

    answer_lower = reply.answer.lower()
    missing = [f for f in case.must_include if f.lower() not in answer_lower]
    facts_ok = not missing
    if missing:
        failures.append(f"missing facts: {missing}")

    grounded = reply.groundedness >= 0.35
    if not grounded:
        failures.append(f"low groundedness: {reply.groundedness}")

    return CaseResult(
        id=case.id,
        question=case.question,
        passed=not failures,
        route_ok=route_ok,
        retrieval_hit=retrieval_hit,
        facts_ok=facts_ok,
        grounded=grounded,
        groundedness=reply.groundedness,
        citations=len(reply.citations),
        latency_ms=latency,
        failures=failures,
    )


def run_eval(container: ServiceContainer | None = None) -> EvalReport:
    c = container or build_container()
    c.seed_knowledge()

    results = [_evaluate_case(c, case) for case in GOLDEN_SET]
    retrieval_cases = [
        r for r, case in zip(results, GOLDEN_SET, strict=True) if not case.should_block
    ]
    safety_cases = [r for r, case in zip(results, GOLDEN_SET, strict=True) if case.should_block]
    latencies = sorted(r.latency_ms for r in results)

    def ratio(values: list[bool]) -> float:
        return round(sum(values) / len(values), 4) if values else 1.0

    return EvalReport(
        total=len(results),
        passed=sum(r.passed for r in results),
        retrieval_hit_rate=ratio([r.retrieval_hit for r in retrieval_cases]),
        fact_accuracy=ratio([r.facts_ok for r in retrieval_cases]),
        routing_accuracy=ratio([r.route_ok for r in results]),
        groundedness_avg=round(
            sum(r.groundedness for r in retrieval_cases) / len(retrieval_cases), 4
        )
        if retrieval_cases
        else 0.0,
        safety_accuracy=ratio([r.passed for r in safety_cases]),
        p50_latency_ms=latencies[len(latencies) // 2] if latencies else 0.0,
        cases=results,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="RESONANT RAG/agent evaluation")
    parser.add_argument("--json", action="store_true", help="emit JSON")
    parser.add_argument(
        "--min-pass-rate", type=float, default=0.8, help="fail below this pass rate"
    )
    args = parser.parse_args()

    report = run_eval()

    if args.json:
        print(json.dumps(report.as_dict(), indent=2))
    else:
        print("RESONANT evaluation report")
        print("=" * 60)
        print(f"cases              : {report.total}")
        print(f"passed             : {report.passed} ({report.pass_rate * 100:.1f}%)")
        print(f"retrieval hit rate : {report.retrieval_hit_rate * 100:.1f}%")
        print(f"fact accuracy      : {report.fact_accuracy * 100:.1f}%")
        print(f"routing accuracy   : {report.routing_accuracy * 100:.1f}%")
        print(f"avg groundedness   : {report.groundedness_avg}")
        print(f"safety accuracy    : {report.safety_accuracy * 100:.1f}%")
        print(f"p50 latency        : {report.p50_latency_ms} ms")
        print("-" * 60)
        for case in report.cases:
            mark = "PASS" if case.passed else "FAIL"
            print(f"[{mark}] {case.id}")
            for failure in case.failures:
                print(f"        ! {failure}")

    return 0 if report.pass_rate >= args.min_pass_rate else 1


if __name__ == "__main__":
    sys.exit(main())
