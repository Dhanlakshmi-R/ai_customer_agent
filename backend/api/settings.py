from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.repository import Repository
from backend.authentication.rbac import get_current_user
from backend.database.models import User
from backend.config import settings
from backend.core import runtime_settings

router = APIRouter(prefix="/settings", tags=["Settings Configuration"])

class SettingsUpdateSchema(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    embedding_model: Optional[str] = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size: Optional[int] = 800
    chunk_overlap: Optional[int] = 150
    llm_model: Optional[str] = "gpt-4o"
    temperature: Optional[float] = 0.7
    theme: Optional[str] = "dark"
    language: Optional[str] = "en"

@router.get("/")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    
    openai_key = await repo.get_setting("openai_api_key") or runtime_settings.get("OPENAI_API_KEY") or ""
    gemini_key = await repo.get_setting("gemini_api_key") or runtime_settings.get("GEMINI_API_KEY") or ""
    groq_key = await repo.get_setting("groq_api_key") or runtime_settings.get("GROQ_API_KEY") or ""
    embedding_model = await repo.get_setting("embedding_model") or settings.EMBEDDING_MODEL
    chunk_size = await repo.get_setting("chunk_size") or str(settings.CHUNK_SIZE)
    chunk_overlap = await repo.get_setting("chunk_overlap") or str(settings.CHUNK_OVERLAP)
    llm_model = await repo.get_setting("llm_model") or settings.LLM_MODEL
    temperature = await repo.get_setting("temperature") or str(settings.TEMPERATURE)
    theme = await repo.get_setting("theme") or "dark"
    language = await repo.get_setting("language") or "en"

    # Mask API keys for security
    masked_openai = f"{openai_key[:4]}...{openai_key[-4:]}" if len(openai_key) > 8 else ""
    masked_gemini = f"{gemini_key[:4]}...{gemini_key[-4:]}" if len(gemini_key) > 8 else ""
    masked_groq = f"{groq_key[:4]}...{groq_key[-4:]}" if len(groq_key) > 8 else ""

    return {
        "openai_api_key": masked_openai,
        "gemini_api_key": masked_gemini,
        "groq_api_key": masked_groq,
        "embedding_model": embedding_model,
        "chunk_size": int(chunk_size),
        "chunk_overlap": int(chunk_overlap),
        "llm_model": llm_model,
        "temperature": float(temperature),
        "theme": theme,
        "language": language
    }

@router.post("/")
async def update_settings(
    data: SettingsUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    
    if data.openai_api_key:
        await repo.set_setting("openai_api_key", data.openai_api_key, current_user.id)
        runtime_settings.set("OPENAI_API_KEY", data.openai_api_key)
    if data.gemini_api_key:
        await repo.set_setting("gemini_api_key", data.gemini_api_key, current_user.id)
        runtime_settings.set("GEMINI_API_KEY", data.gemini_api_key)
    if data.groq_api_key:
        await repo.set_setting("groq_api_key", data.groq_api_key, current_user.id)
        runtime_settings.set("GROQ_API_KEY", data.groq_api_key)
    if data.embedding_model:
        await repo.set_setting("embedding_model", data.embedding_model, current_user.id)
    if data.chunk_size:
        await repo.set_setting("chunk_size", str(data.chunk_size), current_user.id)
    if data.chunk_overlap:
        await repo.set_setting("chunk_overlap", str(data.chunk_overlap), current_user.id)
    if data.llm_model:
        await repo.set_setting("llm_model", data.llm_model, current_user.id)
        runtime_settings.set("LLM_MODEL", data.llm_model)
    if data.temperature:
        await repo.set_setting("temperature", str(data.temperature), current_user.id)
        runtime_settings.set("TEMPERATURE", str(data.temperature))
    if data.theme:
        await repo.set_setting("theme", data.theme, current_user.id)
    if data.language:
        await repo.set_setting("language", data.language, current_user.id)

    return {"message": "Settings updated successfully."}
