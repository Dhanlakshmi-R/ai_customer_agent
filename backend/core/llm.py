import json
import re
from typing import Any, Dict, Optional

from backend.config import settings
from backend.core import runtime_settings

_openai_client = None
_gemini_configured = False
_groq_client = None


def _get_openai_client():
    global _openai_client
    api_key = runtime_settings.get("OPENAI_API_KEY")
    if not api_key:
        return None
    if _openai_client is None:
        from openai import OpenAI

        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


def _get_groq_client():
    global _groq_client
    api_key = runtime_settings.get("GROQ_API_KEY")
    if not api_key:
        return None
    if _groq_client is None:
        from openai import OpenAI

        _groq_client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    return _groq_client


def _configure_gemini() -> bool:
    global _gemini_configured
    api_key = runtime_settings.get("GEMINI_API_KEY")
    if not api_key:
        return False
    if not _gemini_configured:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        _gemini_configured = True
    return True


def is_llm_available() -> bool:
    return bool(
        runtime_settings.get("OPENAI_API_KEY")
        or runtime_settings.get("GEMINI_API_KEY")
        or runtime_settings.get("GROQ_API_KEY")
    )


def parse_json_response(raw: str) -> Optional[Dict[str, Any]]:
    if not raw or not raw.strip():
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                return None
    return None


def _chat_openai(system: str, user: str, temperature: float, json_mode: bool) -> str:
    client = _get_openai_client()
    if not client:
        return ""

    kwargs: Dict[str, Any] = {
        "model": runtime_settings.get("LLM_MODEL") or "gpt-4o",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": 1024,
    }
    if json_mode and str(runtime_settings.get("LLM_MODEL") or "").startswith("gpt-"):
        kwargs["response_format"] = {"type": "json_object"}

    try:
        response = client.chat.completions.create(**kwargs)
        return (response.choices[0].message.content or "").strip()
    except Exception:
        return ""


def _chat_groq(system: str, user: str, temperature: float, json_mode: bool) -> str:
    client = _get_groq_client()
    if not client:
        return ""

    # Candidate models in order of preference: the explicitly configured model
    # first, then known-working fallbacks so a bad model name never silently
    # disables the LLM (which used to fall back to canned, repetitive replies).
    llm_model = (runtime_settings.get("LLM_MODEL") or "").strip()
    requested = (
        llm_model
        if llm_model.startswith("llama") or llm_model.startswith("mixtral") or llm_model.startswith("openai/") or llm_model.startswith("meta-")
        else (runtime_settings.get("GROQ_MODEL") or "")
    )
    candidates = [m for m in [requested, "openai/gpt-oss-120b", "openai/gpt-oss-20b"] if m]

    last_error = None
    for groq_model in candidates:
        kwargs: Dict[str, Any] = {
            "model": groq_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": 1024,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = client.chat.completions.create(**kwargs)
            content = (response.choices[0].message.content or "").strip()
            if content:
                return content
            last_error = "empty response"
        except Exception as e:
            last_error = str(e)
            continue

    # Surface the failure in logs instead of silently pretending the LLM is idle.
    print(f"[llm] Groq chat failed for all candidate models: {last_error}")
    return ""


def _chat_gemini(system: str, user: str, temperature: float) -> str:
    if not _configure_gemini():
        return ""

    import google.generativeai as genai

    model_name = runtime_settings.get("LLM_MODEL") or "gemini-1.5-flash"
    if model_name.startswith("gpt-"):
        model_name = "gemini-1.5-flash"

    try:
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system,
        )
        response = model.generate_content(
            user,
            generation_config=genai.types.GenerationConfig(temperature=temperature),
        )
        return (response.text or "").strip()
    except Exception:
        return ""


def llm_chat(
    system: str,
    user: str,
    temperature: Optional[float] = None,
    json_mode: bool = False,
) -> str:
    temp = settings.TEMPERATURE if temperature is None else temperature

    if runtime_settings.get("GROQ_API_KEY"):
        result = _chat_groq(system, user, temp, json_mode)
        if result:
            return result

    if runtime_settings.get("OPENAI_API_KEY"):
        result = _chat_openai(system, user, temp, json_mode)
        if result:
            return result

    if runtime_settings.get("GEMINI_API_KEY"):
        return _chat_gemini(system, user, temp)

    return ""


def llm_json(system: str, user: str, temperature: Optional[float] = None) -> Optional[Dict[str, Any]]:
    raw = llm_chat(system, user, temperature=temperature, json_mode=True)
    return parse_json_response(raw)
