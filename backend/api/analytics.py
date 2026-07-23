from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.analytics.metrics import AnalyticsEngine
from backend.authentication.rbac import get_current_user
from backend.database.models import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])

@router.get("/summary")
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = AnalyticsEngine(db)
    summary = await engine.get_dashboard_summary()
    return summary
