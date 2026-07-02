import os
from openai import OpenAI
from src.core.config import settings

_client = None


def get_groq_client() -> OpenAI | None:
    global _client
    api_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return None
    if _client is None:
        _client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    return _client


def llm_chat(system: str, user: str, temperature: float = 0.7) -> str:
    client = get_groq_client()
    if not client:
        return ""
    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=512,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return ""
