from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import OrderedDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database.models import Session, Message, CoachingAnalysis, Document

class AnalyticsEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_summary(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Real, DB-derived analytics for the executive dashboard, scoped to a user."""

        # Per-user session and message counts
        session_q = select(func.count(Session.id))
        msg_q = select(func.count(Message.id))
        if user_id:
            session_q = session_q.where(Session.user_id == user_id)
            msg_q = msg_q.join(Session, Session.id == Message.session_id).where(Session.user_id == user_id)

        total_sessions = (await self.db.execute(session_q)).scalar() or 0
        total_messages = (await self.db.execute(msg_q)).scalar() or 0
        total_documents = (await self.db.execute(select(func.count(Document.id)))).scalar() or 0

        # Coaching analyses scoped to user's sessions
        analysis_q = select(CoachingAnalysis).join(Message, Message.id == CoachingAnalysis.message_id).join(Session, Session.id == Message.session_id)
        if user_id:
            analysis_q = analysis_q.where(Session.user_id == user_id)
        analyses = (await self.db.execute(analysis_q)).scalars().all()

        # Active sessions count
        active_q = select(func.count(Session.id)).where(Session.status == "active")
        if user_id:
            active_q = active_q.where(Session.user_id == user_id)
        active_sessions = (await self.db.execute(active_q)).scalar() or 0

        intent_counts: Dict[str, int] = {}
        sentiment_counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
        escalation_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
        total_empathy = 0.0
        total_tone = 0.0
        total_grammar = 0.0
        total_confidence = 0.0
        n = len(analyses)

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
            total_confidence += a.confidence_score

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

        # Recent sessions for the user
        recent_q = select(Session).order_by(Session.created_at.desc()).limit(5)
        if user_id:
            recent_q = recent_q.where(Session.user_id == user_id)
        recent_sessions_raw = (await self.db.execute(recent_q)).scalars().all()
        recent_sessions = []
        for s in recent_sessions_raw:
            msg_count = (await self.db.execute(
                select(func.count(Message.id)).where(Message.session_id == s.id)
            )).scalar() or 0
            recent_sessions.append({
                "id": s.id,
                "mode": s.mode,
                "persona": s.persona,
                "status": s.status,
                "scenario": s.scenario,
                "message_count": msg_count,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            })

        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "total_messages": total_messages,
            "total_documents": total_documents,
            "total_analyses": n,
            "avg_empathy_score": round(total_empathy / n, 1) if n else 0,
            "avg_tone_score": round(total_tone / n, 1) if n else 0,
            "avg_grammar_score": round(total_grammar / n, 1) if n else 0,
            "avg_confidence_score": round(total_confidence / n, 1) if n else 0,
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
            "recent_sessions": recent_sessions,
        }
