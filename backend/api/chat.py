from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.repository import Repository
from backend.agents.orchestrator import orchestrator
from backend.agents.simulator_agent import simulator_agent
from backend.authentication.rbac import get_current_user
from backend.database.models import User

router = APIRouter(prefix="/chat", tags=["Chat & Live Coaching"])

class ChatMessageSchema(BaseModel):
    session_id: str
    sender: str # customer, agent
    content: str
    agent_draft: Optional[str] = ""

class ReplayTranscriptSchema(BaseModel):
    session_id: str
    transcript_messages: List[Dict[str, str]] # [{sender, content}]

@router.post("/message")
async def process_chat_message(
    data: ChatMessageSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process incoming chat message (customer or agent) and trigger multi-agent coaching pipeline."""
    repo = Repository(db)
    session = await repo.get_session(data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    turn_index = len(session.messages) + 1
    
    # Save incoming message
    msg = await repo.add_message(
        session_id=session.id,
        sender=data.sender,
        content=data.content,
        turn_index=turn_index
    )

    # Run Multi-Agent Orchestrator if message is from customer or agent draft review requested
    analysis_data = None
    if data.sender == "customer" or data.agent_draft:
        target_content = data.content if data.sender == "customer" else data.agent_draft
        pipeline_output = orchestrator.run_turn_pipeline(
            session_id=session.id,
            customer_message=target_content,
            agent_draft=data.agent_draft
        )

        analysis = await repo.add_coaching_analysis(
            message_id=msg.id,
            intent=pipeline_output["intent"],
            sentiment=pipeline_output["sentiment"],
            emotion=pipeline_output["emotion"],
            urgency=pipeline_output["urgency"],
            frustration=pipeline_output["frustration"],
            confidence_score=pipeline_output["confidence_score"],
            tone_score=pipeline_output["tone_score"],
            grammar_score=pipeline_output["grammar_score"],
            empathy_score=pipeline_output["empathy_score"],
            escalation_risk=pipeline_output["escalation_risk"],
            suggested_reply=pipeline_output["suggested_reply"],
            reasoning=pipeline_output["reasoning"],
            knowledge_citations=pipeline_output["knowledge_citations"]
        )

        analysis_data = {
            "intent": analysis.intent,
            "sentiment": analysis.sentiment,
            "emotion": analysis.emotion,
            "urgency": analysis.urgency,
            "frustration": analysis.frustration,
            "confidence_score": analysis.confidence_score,
            "tone_score": analysis.tone_score,
            "grammar_score": analysis.grammar_score,
            "empathy_score": analysis.empathy_score,
            "escalation_risk": analysis.escalation_risk,
            "suggested_reply": analysis.suggested_reply,
            "reasoning": analysis.reasoning,
            "knowledge_citations": analysis.knowledge_citations
        }

    return {
        "message": {
            "id": msg.id,
            "sender": msg.sender,
            "content": msg.content,
            "turn_index": msg.turn_index,
            "timestamp": msg.timestamp
        },
        "coaching": analysis_data
    }

@router.post("/simulator-next")
async def trigger_simulator_next(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates the next customer turn message using Customer Simulator Agent."""
    repo = Repository(db)
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    history = [{"sender": m.sender, "content": m.content} for m in session.messages]

    next_customer_msg = simulator_agent.generate_next_turn(
        persona=session.persona,
        scenario=session.scenario,
        product=session.product,
        conversation_history=history
    )

    # Process through pipeline
    turn_index = len(session.messages) + 1
    msg = await repo.add_message(
        session_id=session.id,
        sender="customer",
        content=next_customer_msg,
        turn_index=turn_index
    )

    pipeline_output = orchestrator.run_turn_pipeline(
        session_id=session.id,
        customer_message=next_customer_msg
    )

    analysis = await repo.add_coaching_analysis(
        message_id=msg.id,
        intent=pipeline_output["intent"],
        sentiment=pipeline_output["sentiment"],
        emotion=pipeline_output["emotion"],
        urgency=pipeline_output["urgency"],
        frustration=pipeline_output["frustration"],
        confidence_score=pipeline_output["confidence_score"],
        tone_score=pipeline_output["tone_score"],
        grammar_score=pipeline_output["grammar_score"],
        empathy_score=pipeline_output["empathy_score"],
        escalation_risk=pipeline_output["escalation_risk"],
        suggested_reply=pipeline_output["suggested_reply"],
        reasoning=pipeline_output["reasoning"],
        knowledge_citations=pipeline_output["knowledge_citations"]
    )

    return {
        "message": {
            "id": msg.id,
            "sender": msg.sender,
            "content": msg.content,
            "turn_index": msg.turn_index,
            "timestamp": msg.timestamp
        },
        "coaching": {
            "intent": analysis.intent,
            "sentiment": analysis.sentiment,
            "emotion": analysis.emotion,
            "urgency": analysis.urgency,
            "frustration": analysis.frustration,
            "confidence_score": analysis.confidence_score,
            "tone_score": analysis.tone_score,
            "grammar_score": analysis.grammar_score,
            "empathy_score": analysis.empathy_score,
            "escalation_risk": analysis.escalation_risk,
            "suggested_reply": analysis.suggested_reply,
            "reasoning": analysis.reasoning,
            "knowledge_citations": analysis.knowledge_citations
        }
    }

@router.post("/manual")
async def run_manual_coaching(
    data: ChatMessageSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manual Mode endpoint where agent pastes customer message and receives immediate real-time coaching."""
    return await process_chat_message(data=data, db=db, current_user=current_user)

@router.post("/replay")
async def replay_transcript(
    data: ReplayTranscriptSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Replay Mode endpoint to process pre-loaded transcript turn-by-turn."""
    repo = Repository(db)
    session = await repo.get_session(data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    results = []
    for idx, item in enumerate(data.transcript_messages, 1):
        msg = await repo.add_message(
            session_id=session.id,
            sender=item.get("sender", "customer"),
            content=item.get("content", ""),
            turn_index=idx
        )
        
        analysis_data = None
        if item.get("sender") == "customer":
            pipeline_output = orchestrator.run_turn_pipeline(
                session_id=session.id,
                customer_message=item.get("content", "")
            )

            analysis = await repo.add_coaching_analysis(
                message_id=msg.id,
                intent=pipeline_output["intent"],
                sentiment=pipeline_output["sentiment"],
                emotion=pipeline_output["emotion"],
                urgency=pipeline_output["urgency"],
                frustration=pipeline_output["frustration"],
                confidence_score=pipeline_output["confidence_score"],
                tone_score=pipeline_output["tone_score"],
                grammar_score=pipeline_output["grammar_score"],
                empathy_score=pipeline_output["empathy_score"],
                escalation_risk=pipeline_output["escalation_risk"],
                suggested_reply=pipeline_output["suggested_reply"],
                reasoning=pipeline_output["reasoning"],
                knowledge_citations=pipeline_output["knowledge_citations"]
            )
            analysis_data = {
                "intent": analysis.intent,
                "sentiment": analysis.sentiment,
                "emotion": analysis.emotion,
                "urgency": analysis.urgency,
                "frustration": analysis.frustration,
                "confidence_score": analysis.confidence_score,
                "tone_score": analysis.tone_score,
                "grammar_score": analysis.grammar_score,
                "empathy_score": analysis.empathy_score,
                "escalation_risk": analysis.escalation_risk,
                "suggested_reply": analysis.suggested_reply,
                "reasoning": analysis.reasoning,
                "knowledge_citations": analysis.knowledge_citations
            }

        results.append({
            "message": {
                "id": msg.id,
                "sender": msg.sender,
                "content": msg.content,
                "turn_index": msg.turn_index,
                "timestamp": msg.timestamp
            },
            "coaching": analysis_data
        })

    return {"session_id": session.id, "replayed_turns": len(results), "turns": results}

@router.websocket("/ws/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            customer_msg = data.get("content", "")
            if customer_msg:
                pipeline_output = orchestrator.run_turn_pipeline(
                    session_id=session_id,
                    customer_message=customer_msg
                )
                await websocket.send_json({
                    "status": "success",
                    "coaching": pipeline_output
                })
    except WebSocketDisconnect:
        pass
