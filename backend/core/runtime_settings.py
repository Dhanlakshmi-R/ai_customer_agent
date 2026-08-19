from typing import Dict, Optional

from backend.config import settings

_runtime: Dict[str, str] = {}


def _seed() -> None:
    _runtime.setdefault("OPENAI_API_KEY", settings.OPENAI_API_KEY or "")
    _runtime.setdefault("GEMINI_API_KEY", settings.GEMINI_API_KEY or "")
    _runtime.setdefault("GROQ_API_KEY", settings.GROQ_API_KEY or "")
    _runtime.setdefault("LLM_MODEL", settings.LLM_MODEL)
    _runtime.setdefault("GROQ_MODEL", settings.GROQ_MODEL)
    _runtime.setdefault("TEMPERATURE", str(settings.TEMPERATURE))


_seed()


def get(key: str) -> Optional[str]:
    return _runtime.get(key)


def set(key: str, value: str) -> None:
    _runtime[key] = value


def unset(key: str) -> None:
    _runtime.pop(key, None)
