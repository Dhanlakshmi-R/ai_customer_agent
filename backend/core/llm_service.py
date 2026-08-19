"""Reusable environment-configured LLM service for backend agents."""

import os
from functools import lru_cache
from typing import Optional


@lru_cache(maxsize=1)
def _get_client():
    """Create the OpenAI client only when an API key is configured."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    from openai import OpenAI

    return OpenAI(api_key=api_key)


class LLMService:
    """Small, provider-isolated interface that can be reused by any agent."""

    def __init__(self, model: Optional[str] = None) -> None:
        self.model = model or os.getenv("LLM_MODEL", "gpt-4o")

    @property
    def is_configured(self) -> bool:
        """Whether the service has the API key needed for live generation."""
        return _get_client() is not None

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> Optional[str]:
        """Generate text, returning ``None`` when no key is configured."""
        client = _get_client()
        if client is None:
            return None

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip() or None


llm_service = LLMService()
