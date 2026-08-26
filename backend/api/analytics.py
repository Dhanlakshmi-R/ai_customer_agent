from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.repository import Repository
from backend.analytics.metrics import AnalyticsEngine
from backend.authentication.rbac import get_current_user
from backend.database.models import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])

class CoachingFeedbackSchema(BaseModel):
    analysis_id: str
    rating: str  # helpful | not_helpful

@router.post("/coaching-feedback")
async def submit_coaching_feedback(
    data: CoachingFeedbackSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Records an agent's helpful/not-helpful vote on a coaching suggestion."""
    if data.rating not in {"helpful", "not_helpful"}:
        raise HTTPException(status_code=422, detail="rating must be 'helpful' or 'not_helpful'")
    repo = Repository(db)
    feedback = await repo.add_coaching_feedback(data.analysis_id, current_user.id, data.rating)
    return {
        "id": feedback.id,
        "analysis_id": feedback.analysis_id,
        "rating": feedback.rating,
    }

@router.get("/summary")
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = AnalyticsEngine(db)
    summary = await engine.get_dashboard_summary(user_id=current_user.id)
    return summary
