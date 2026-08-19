import uuid
import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
from sqlalchemy.orm import selectinload

from backend.database.models import User, Session, Message, Document, CoachingAnalysis, CoachingFeedback, Report, SystemSetting
from backend.authentication.passlib_utils import get_password_hash

class Repository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # User operations
    async def create_user(self, email: str, password: str, full_name: str, role: str = "agent") -> User:
        user_id = str(uuid.uuid4())
        hashed_pwd = get_password_hash(password)
        user = User(
            id=user_id,
            email=email,
            hashed_password=hashed_pwd,
            full_name=full_name,
            role=role
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_user_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    # Session operations
    async def create_session(
        self,
        user_id: str,
        mode: str,
        product: str,
        category: str,
        scenario: str,
        persona: str,
        difficulty: str = "medium",
        conversation_length: int = 10
    ) -> Session:
        session_id = str(uuid.uuid4())
        sess = Session(
            id=session_id,
            user_id=user_id,
            mode=mode,
            product=product,
            category=category,
            scenario=scenario,
            persona=persona,
            difficulty=difficulty,
            conversation_length=conversation_length,
            status="active"
        )
        self.db.add(sess)
        await self.db.commit()
        await self.db.refresh(sess)
        return sess

    async def get_session(self, session_id: str) -> Optional[Session]:
        result = await self.db.execute(
            select(Session)
            .options(selectinload(Session.messages).selectinload(Message.analysis))
            .where(Session.id == session_id)
        )
        return result.scalars().first()

    async def list_sessions(self, user_id: Optional[str] = None, limit: int = 50) -> List[Session]:
        query = select(Session).options(selectinload(Session.messages)).order_by(desc(Session.created_at)).limit(limit)
        if user_id:
            query = query.where(Session.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_session_status(self, session_id: str, status: str) -> Optional[Session]:
        sess = await self.get_session(session_id)
        if sess:
            sess.status = status
            await self.db.commit()
            await self.db.refresh(sess)
        return sess

    async def delete_session(self, session_id: str) -> bool:
        result = await self.db.execute(delete(Session).where(Session.id == session_id))
        await self.db.commit()
        return result.rowcount > 0

    # Message & Analysis operations
    async def get_session_messages(self, session_id: str) -> List[Message]:
        """Fetches the freshest message list for a session straight from the DB."""
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.turn_index)
        )
        return list(result.scalars().all())

    async def add_message(self, session_id: str, sender: str, content: str, turn_index: int) -> Message:
        msg_id = str(uuid.uuid4())
        msg = Message(
            id=msg_id,
            session_id=session_id,
            sender=sender,
            content=content,
            turn_index=turn_index,
            timestamp=datetime.datetime.utcnow()
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def add_coaching_analysis(
        self,
        message_id: str,
        intent: str,
        sentiment: str,
        emotion: str,
        urgency: str,
        frustration: float,
        confidence_score: float,
        tone_score: float,
        grammar_score: float,
        empathy_score: float,
        escalation_risk: str,
        suggested_reply: str,
        reasoning: str,
        knowledge_citations: list
    ) -> CoachingAnalysis:
        analysis_id = str(uuid.uuid4())
        analysis = CoachingAnalysis(
            id=analysis_id,
            message_id=message_id,
            intent=intent,
            sentiment=sentiment,
            emotion=emotion,
            urgency=urgency,
            frustration=frustration,
            confidence_score=confidence_score,
            tone_score=tone_score,
            grammar_score=grammar_score,
            empathy_score=empathy_score,
            escalation_risk=escalation_risk,
            suggested_reply=suggested_reply,
            reasoning=reasoning,
            knowledge_citations=knowledge_citations
        )
        self.db.add(analysis)
        await self.db.commit()
        await self.db.refresh(analysis)
        return analysis

    async def update_coaching_analysis(self, analysis_id: str, **fields) -> Optional[CoachingAnalysis]:
        """Refines an existing analysis record in place (used by the instant-then-LLM refine path)."""
        analysis = await self.db.get(CoachingAnalysis, analysis_id)
        if not analysis:
            return None
        for key, value in fields.items():
            if hasattr(analysis, key):
                setattr(analysis, key, value)
        await self.db.commit()
        await self.db.refresh(analysis)
        return analysis

    # Feedback operations
    async def add_coaching_feedback(self, analysis_id: str, user_id: Optional[str], rating: str) -> CoachingFeedback:
        """Upserts a single helpful/not-helpful vote per analysis (per user)."""
        result = await self.db.execute(
            select(CoachingFeedback).where(
                CoachingFeedback.analysis_id == analysis_id,
                CoachingFeedback.user_id == user_id
            )
        )
        existing = result.scalars().first()
        if existing:
            existing.rating = rating
            feedback = existing
        else:
            feedback = CoachingFeedback(
                id=str(uuid.uuid4()),
                analysis_id=analysis_id,
                user_id=user_id,
                rating=rating
            )
            self.db.add(feedback)
        await self.db.commit()
        await self.db.refresh(feedback)
        return feedback

    async def get_coaching_feedback_context(self) -> str:
        """Builds a short LLM directive from aggregate agent feedback so future
        coaching suggestions are weighted toward what agents found helpful."""
        result = await self.db.execute(
            select(
                CoachingFeedback.rating,
                CoachingAnalysis.intent,
                func.count(CoachingFeedback.id)
            )
            .join(CoachingAnalysis, CoachingAnalysis.id == CoachingFeedback.analysis_id)
            .group_by(CoachingFeedback.rating, CoachingAnalysis.intent)
        )
        rows = result.all()
        if not rows:
            return ""
        by_intent: dict = {}
        total_helpful = 0
        total_votes = 0
        for rating, intent, count in rows:
            by_intent.setdefault(intent, {"helpful": 0, "not_helpful": 0})
            by_intent[intent][rating] += count
            total_votes += count
            if rating == "helpful":
                total_helpful += count
        acceptance = round(100.0 * total_helpful / total_votes)

        rank = sorted(
            by_intent.items(),
            key=lambda kv: kv[1]["helpful"] - kv[1]["not_helpful"],
            reverse=True
        )
        best, worst = rank[0][0], rank[-1][0]
        best_helpful = rank[0][1]["helpful"]
        best_total = rank[0][1]["helpful"] + rank[0][1]["not_helpful"]
        best_rate = round(100.0 * best_helpful / best_total)
        worst_helpful = rank[-1][1]["helpful"]
        worst_total = rank[-1][1]["helpful"] + rank[-1][1]["not_helpful"]
        worst_rate = round(100.0 * worst_helpful / worst_total)

        guidance = [
            f"Agent feedback loop: {total_votes} ratings recorded, {acceptance}% accepted as helpful.",
            f"Suggestions for '{best}' were accepted most often ({best_rate}% helpful).",
        ]
        if len(rank) > 1 and worst_rate < best_rate:
            guidance.append(
                f"Suggestions for '{worst}' were rejected most often ({worst_rate}% helpful) — "
                "be more cautious and specific there."
            )
        guidance.append(
            "Tune your reasoning and suggested reply toward the styles agents accepted."
        )
        return " ".join(guidance)

    # Document operations
    async def add_document(
        self,
        title: str,
        file_path: str,
        file_type: str,
        category: str,
        chunk_count: int,
        topic: str = None,
        keywords: str = None,
        version: str = "1.0"
    ) -> Document:
        doc_id = str(uuid.uuid4())
        doc = Document(
            id=doc_id,
            title=title,
            file_path=file_path,
            file_type=file_type,
            category=category,
            chunk_count=chunk_count,
            topic=topic,
            keywords=keywords,
            version=version
        )
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        return doc

    async def list_documents(self) -> List[Document]:
        result = await self.db.execute(select(Document).order_by(desc(Document.created_at)))
        return result.scalars().all()

    async def delete_document(self, doc_id: str) -> bool:
        result = await self.db.execute(delete(Document).where(Document.id == doc_id))
        await self.db.commit()
        return result.rowcount > 0

    # Report operations
    async def create_report(
        self,
        session_id: str,
        summary: str,
        sentiment_journey: list,
        resolution_score: float,
        strengths: list,
        weaknesses: list,
        coaching_tips: list,
        pdf_path: Optional[str] = None
    ) -> Report:
        report_id = str(uuid.uuid4())
        report = Report(
            id=report_id,
            session_id=session_id,
            summary=summary,
            sentiment_journey=sentiment_journey,
            resolution_score=resolution_score,
            strengths=strengths,
            weaknesses=weaknesses,
            coaching_tips=coaching_tips,
            pdf_path=pdf_path
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def get_report_by_session(self, session_id: str) -> Optional[Report]:
        result = await self.db.execute(select(Report).where(Report.session_id == session_id))
        return result.scalars().first()

    # Settings operations
    async def get_setting(self, key: str) -> Optional[str]:
        result = await self.db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalars().first()
        return setting.value if setting else None

    async def set_setting(self, key: str, value: str, user_id: Optional[str] = None) -> SystemSetting:
        result = await self.db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalars().first()
        if setting:
            setting.value = value
        else:
            setting = SystemSetting(id=str(uuid.uuid4()), user_id=user_id, key=key, value=value)
            self.db.add(setting)
        await self.db.commit()
        await self.db.refresh(setting)
        return setting
