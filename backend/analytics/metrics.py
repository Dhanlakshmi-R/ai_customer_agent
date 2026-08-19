from typing import Dict, Any
from datetime import datetime, timedelta
from collections import OrderedDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database.models import Session, Message, CoachingAnalysis, Document

class AnalyticsEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        """Real, DB-derived analytics for the executive dashboard. No synthetic/fallback values."""

        # Totals from the actual database. Sessions are only counted once they contain
        # real messages (auto-created empty sessions are excluded).
        total_sessions = (
            await self.db.execute(select(func.count(func.distinct(Message.session_id))))
        ).scalar() or 0
        total_messages = (await self.db.execute(select(func.count(Message.id)))).scalar() or 0
        total_documents = (await self.db.execute(select(func.count(Document.id)))).scalar() or 0

        # All coaching analyses that have actually run
        analyses = (await self.db.execute(select(CoachingAnalysis))).scalars().all()

        intent_counts: Dict[str, int] = {}
        sentiment_counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
        escalation_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
        total_empathy = 0.0
        total_tone = 0.0
        total_grammar = 0.0
        n = len(analyses)

        # Sentiment per day for the last 7 days (real buckets, 0 when no data)
        today = datetime.utcnow().date()
        day_buckets: "OrderedDict[str, Dict[str, int]]" = OrderedDict()
        for i in range(6, -1, -1):
            day_buckets[(today - timedelta(days=i)).strftime("%Y-%m-%d")] = {
                "Positive": 0, "Neutral": 0, "Negative": 0,
            }

        for a in analyses:
            intent_counts[a.intent] = intent_counts.get(a.intent, 0) + 1
            if a.sentiment in sentiment_counts:
                sentiment_counts[a.sentiment] += 1
            if a.escalation_risk in escalation_counts:
                escalation_counts[a.escalation_risk] += 1

            total_empathy += a.empathy_score
            total_tone += a.tone_score
            total_grammar += a.grammar_score

            day = a.created_at.date().strftime("%Y-%m-%d") if a.created_at else None
            if day and day in day_buckets and a.sentiment in day_buckets[day]:
                day_buckets[day][a.sentiment] += 1

        sentiment_trend = []
        for day, counts in day_buckets.items():
            total = sum(counts.values())
            sentiment_trend.append({
                "date": datetime.strptime(day, "%Y-%m-%d").strftime("%a"),
                "positive": round(counts["Positive"] / total * 100, 1) if total else 0,
                "neutral": round(counts["Neutral"] / total * 100, 1) if total else 0,
                "negative": round(counts["Negative"] / total * 100, 1) if total else 0,
            })

        return {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "total_documents": total_documents,
            "avg_empathy_score": round(total_empathy / n, 1) if n else 0,
            "avg_tone_score": round(total_tone / n, 1) if n else 0,
            "avg_grammar_score": round(total_grammar / n, 1) if n else 0,
            "intent_breakdown": [
                {"name": k, "value": v}
                for k, v in sorted(intent_counts.items(), key=lambda x: -x[1])
            ],
            "sentiment_trend": sentiment_trend,
            "escalation_trends": [
                {"name": "Low Risk", "count": escalation_counts["Low"]},
                {"name": "Medium Risk", "count": escalation_counts["Medium"]},
                {"name": "High Risk", "count": escalation_counts["High"]},
                {"name": "Critical Risk", "count": escalation_counts["Critical"]},
            ],
            "sentiment_distribution": [
                {"name": "Positive", "value": sentiment_counts["Positive"]},
                {"name": "Neutral", "value": sentiment_counts["Neutral"]},
                {"name": "Negative", "value": sentiment_counts["Negative"]},
            ],
        }
