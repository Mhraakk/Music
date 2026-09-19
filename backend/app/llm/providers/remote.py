"""Hosted / self-hosted LLM providers: OpenAI, Anthropic, Ollama (vLLM-compatible)."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.llm.base import ChatMessage, LLMResponse


class OpenAIProvider:
    name = "openai"

    def __init__(self, settings: Settings) -> None:
        self.model = settings.llm_model
        self._settings = settings
        self._client = httpx.Client(
            base_url=settings.openai_base_url,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            timeout=60,
        )

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        payload = {
            "model": self.model,
            "messages": [m.as_dict() for m in messages],
            "temperature": temperature
            if temperature is not None
            else self._settings.llm_temperature,
            "max_tokens": max_tokens or self._settings.llm_max_tokens,
        }
        resp = self._client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        choice = data["choices"][0]
        usage = data.get("usage", {})
        return LLMResponse(
            text=choice["message"]["content"],
            provider=self.name,
            model=self.model,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            finish_reason=choice.get("finish_reason", "stop"),
        )

    def health(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "model": self.model,
            "status": "configured",
            "requires_key": True,
        }


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, settings: Settings) -> None:
        self.model = settings.llm_model
        self._settings = settings
        self._client = httpx.Client(
            base_url="https://api.anthropic.com/v1",
            headers={
                "x-api-key": settings.anthropic_api_key or "",
                "anthropic-version": "2023-06-01",
            },
            timeout=60,
        )

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        system = "\n".join(m.content for m in messages if m.role == "system")
        convo = [m.as_dict() for m in messages if m.role in ("user", "assistant")]
        payload = {
            "model": self.model,
            "system": system,
            "messages": convo,
            "max_tokens": max_tokens or self._settings.llm_max_tokens,
            "temperature": temperature
            if temperature is not None
            else self._settings.llm_temperature,
        }
        resp = self._client.post("/messages", json=payload)
        resp.raise_for_status()
        data = resp.json()
        text = "".join(block.get("text", "") for block in data.get("content", []))
        usage = data.get("usage", {})
        return LLMResponse(
            text=text,
            provider=self.name,
            model=self.model,
            prompt_tokens=usage.get("input_tokens", 0),
            completion_tokens=usage.get("output_tokens", 0),
            finish_reason=data.get("stop_reason", "stop"),
        )

    def health(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "model": self.model,
            "status": "configured",
            "requires_key": True,
        }


class OllamaProvider:
    """Works with Ollama and any OpenAI-compatible local server (e.g. vLLM)."""

    name = "ollama"

    def __init__(self, settings: Settings) -> None:
        self.model = settings.llm_model
        self._settings = settings
        self._client = httpx.Client(base_url=settings.ollama_base_url, timeout=120)

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        payload = {
            "model": self.model,
            "messages": [m.as_dict() for m in messages],
            "stream": False,
            "options": {
                "temperature": temperature
                if temperature is not None
                else self._settings.llm_temperature,
                "num_predict": max_tokens or self._settings.llm_max_tokens,
            },
        }
        resp = self._client.post("/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return LLMResponse(
            text=data.get("message", {}).get("content", ""),
            provider=self.name,
            model=self.model,
            finish_reason=data.get("done_reason", "stop"),
        )

    def health(self) -> dict[str, Any]:
        try:
            resp = self._client.get("/api/tags", timeout=3)
            return {
                "provider": self.name,
                "model": self.model,
                "status": "up" if resp.status_code == 200 else "down",
            }
        except Exception as exc:
            return {"provider": self.name, "model": self.model, "status": "down", "error": str(exc)}
