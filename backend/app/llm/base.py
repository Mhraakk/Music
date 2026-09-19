"""LLM provider contract shared by every backend (OpenAI, Anthropic, Ollama, local)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

Role = Literal["system", "user", "assistant", "tool"]


@dataclass
class ChatMessage:
    role: Role
    content: str

    def as_dict(self) -> dict[str, str]:
        return {"role": self.role, "content": self.content}


@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    finish_reason: str = "stop"
    metadata: dict[str, Any] = field(default_factory=dict)


class LLMProvider(Protocol):
    name: str
    model: str

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse: ...

    def health(self) -> dict[str, Any]: ...
