from dataclasses import dataclass, field
from typing import Literal


Role = Literal["user", "assistant"]


@dataclass
class ConversationMessage:
    role: Role
    content: str


@dataclass
class LLMRequest:
    system_prompt: str
    user_prompt: str
    history: list[ConversationMessage] = field(default_factory=list)
    context_chunks: list[dict] = field(default_factory=list)
    temperature: float = 0.2
    max_tokens: int = 900

    def openai_messages(self) -> list[dict[str, str]]:
        context = "\n\n".join(
            f"Source: {chunk.get('source', 'institutional source')}\n{chunk.get('content', '')}"
            for chunk in self.context_chunks
        )
        system = self.system_prompt
        if context:
            system += (
                "\n\nVerified institutional context follows. Use only these facts. "
                "Do not invent missing policy details.\n\n" + context
            )

        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        messages.extend(
            {"role": message.role, "content": message.content}
            for message in self.history
            if message.role in {"user", "assistant"} and message.content.strip()
        )
        messages.append({"role": "user", "content": self.user_prompt})
        return messages


@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str
    latency_ms: int
