from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.repository import Repository
from backend.authentication.rbac import get_current_user
from backend.database.models import User

router = APIRouter(prefix="/session", tags=["Session Configuration"])

class CreateSessionSchema(BaseModel):
    mode: str # simulator, manual, replay
    product: str
    category: str
    scenario: str
    persona: str
    difficulty: Optional[str] = "medium"
    conversation_length: Optional[int] = 10

@router.post("/create")
async def create_session(
    data: CreateSessionSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    session = await repo.create_session(
        user_id=current_user.id,
        mode=data.mode,
        product=data.product,
        category=data.category,
        scenario=data.scenario,
        persona=data.persona,
        difficulty=data.difficulty,
        conversation_length=data.conversation_length
    )
    return {
        "id": session.id,
        "mode": session.mode,
        "product": session.product,
        "category": session.category,
        "scenario": session.scenario,
        "persona": session.persona,
        "difficulty": session.difficulty,
        "conversation_length": session.conversation_length,
        "status": session.status,
        "created_at": session.created_at
    }

@router.get("/list")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    sessions = await repo.list_sessions(user_id=current_user.id if current_user.role == "agent" else None)
    return [
        {
            "id": s.id,
            "mode": s.mode,
            "product": s.product,
            "category": s.category,
            "scenario": s.scenario,
            "persona": s.persona,
            "status": s.status,
            "message_count": len(s.messages),
            "created_at": s.created_at
        }
        for s in sessions
    ]

@router.get("/{session_id}")
async def get_session_details(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    messages = []
    for msg in session.messages:
        analysis_data = None
        if msg.analysis:
            analysis_data = {
                "intent": msg.analysis.intent,
                "sentiment": msg.analysis.sentiment,
                "emotion": msg.analysis.emotion,
                "urgency": msg.analysis.urgency,
                "frustration": msg.analysis.frustration,
                "confidence_score": msg.analysis.confidence_score,
                "tone_score": msg.analysis.tone_score,
                "grammar_score": msg.analysis.grammar_score,
                "empathy_score": msg.analysis.empathy_score,
                "escalation_risk": msg.analysis.escalation_risk,
                "suggested_reply": msg.analysis.suggested_reply,
                "reasoning": msg.analysis.reasoning,
                "knowledge_citations": msg.analysis.knowledge_citations
            }
        messages.append({
            "id": msg.id,
            "sender": msg.sender,
            "content": msg.content,
            "turn_index": msg.turn_index,
            "timestamp": msg.timestamp,
            "analysis": analysis_data
        })

    return {
        "id": session.id,
        "mode": session.mode,
        "product": session.product,
        "category": session.category,
        "scenario": session.scenario,
        "persona": session.persona,
        "difficulty": session.difficulty,
        "conversation_length": session.conversation_length,
        "status": session.status,
        "created_at": session.created_at,
        "messages": messages
    }

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    success = await repo.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"message": "Session deleted successfully."}
