"""Provider selection with automatic fallback to the offline generator."""

from __future__ import annotations

import time

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.observability import LLM_CALLS, LLM_LATENCY
from app.llm.base import ChatMessage, LLMProvider, LLMResponse
from app.llm.providers.local import LocalGroundedLLM
from app.llm.providers.remote import AnthropicProvider, OllamaProvider, OpenAIProvider

log = get_logger(__name__)


def build_llm(settings: Settings | None = None) -> LLMProvider:
    s = settings or get_settings()
    try:
        if s.llm_provider == "openai" and s.openai_api_key:
            return OpenAIProvider(s)
        if s.llm_provider == "anthropic" and s.anthropic_api_key:
            return AnthropicProvider(s)
        if s.llm_provider == "ollama":
            return OllamaProvider(s)
    except Exception as exc:
        log.error("llm.provider_init_failed", provider=s.llm_provider, error=str(exc))
    if s.llm_provider != "local":
        log.warning("llm.falling_back_to_local", requested=s.llm_provider)
    return LocalGroundedLLM(model=s.llm_model if s.llm_provider == "local" else "resonant-local-v1")


class InstrumentedLLM:
    """Wraps a provider with metrics, logging and a hard fallback."""

    def __init__(self, provider: LLMProvider) -> None:
        self.provider = provider
        self._fallback = LocalGroundedLLM()

    @property
    def name(self) -> str:
        return self.provider.name

    @property
    def model(self) -> str:
        return self.provider.model

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        start = time.perf_counter()
        try:
            response = self.provider.complete(
                messages, temperature=temperature, max_tokens=max_tokens
            )
            LLM_CALLS.labels(self.provider.name, self.provider.model, "ok").inc()
            return response
        except Exception as exc:
            LLM_CALLS.labels(self.provider.name, self.provider.model, "error").inc()
            log.error("llm.call_failed", provider=self.provider.name, error=str(exc))
            response = self._fallback.complete(
                messages, temperature=temperature, max_tokens=max_tokens
            )
            response.metadata["fallback_from"] = self.provider.name
            return response
        finally:
            LLM_LATENCY.labels(self.provider.name).observe(time.perf_counter() - start)

    def health(self) -> dict[str, object]:
        return self.provider.health()
