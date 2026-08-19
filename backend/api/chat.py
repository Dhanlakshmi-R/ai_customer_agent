import os
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import AsyncSessionLocal, get_db
from backend.database.repository import Repository
from backend.agents.orchestrator import orchestrator
from backend.agents.simulator_agent import simulator_agent
from backend.agents.combined_agent import combined_agent
from backend.authentication.rbac import get_current_user
from backend.authentication.jwt import decode_access_token
from backend.database.models import User
from backend.core.llm import llm_json, is_llm_available

router = APIRouter(prefix="/chat", tags=["Chat & Live Coaching"])

class ChatMessageSchema(BaseModel):
    session_id: str
    sender: str # customer, agent
    content: str
    agent_draft: Optional[str] = ""

class ReplayTranscriptSchema(BaseModel):
    session_id: str
    transcript_messages: List[Dict[str, str]] # [{sender, content}]

class TranslateSchema(BaseModel):
    target_language: str  # Hindi, Hinglish, Kannada, Telugu, Tamil, Marathi, Bengali
    messages: List[Dict[str, str]]  # [{id, text}]

TRANSLATE_SYSTEM_PROMPT = (
    "You are a professional translator for a customer support conversation. "
    "Translate each message faithfully into the requested target language. "
    "Keep the meaning, tone, and any product terms intact. "
    "Return valid JSON only with the exact structure: "
    '{"translations": [{"id": "<message id>", "text": "<translated text>"}]}'
)

# In-process translation cache keyed by `${lang.lower()}:${text}` so repeated or
# already-translated messages return instantly instead of hitting the LLM again.
_TRANSLATE_CACHE: Dict[str, str] = {}
_TRANSLATE_CACHE_MAX = 4000

def _pipeline_context(sender: str, content: str, agent_draft: str, history) -> tuple[str, str]:
    """Determines (customer_message, agent_draft) for the pipeline given any message.

    Customer messages drive the pipeline directly. Agent messages are analyzed as a
    scored reply against the latest customer context, so every turn gets analytics.
    """
    if sender == "customer":
        return content, agent_draft
    context = ""
    for m in reversed(history):
        m_sender = m.sender if hasattr(m, "sender") else m.get("sender")
        if m_sender == "customer":
            context = m.content if hasattr(m, "content") else m.get("content", "")
            break
    return context or content, content

def _analysis_data(analysis) -> Dict[str, Any]:
    """Serializes a CoachingAnalysis ORM object into the API payload shape,
    including the analysis id so the frontend can submit coaching feedback."""
    return {
        "id": analysis.id,
        "message_id": analysis.message_id,
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
        "knowledge_citations": analysis.knowledge_citations or [],
    }

async def _feedback_context(db) -> str:
    repo = Repository(db)
    return await repo.get_coaching_feedback_context()

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

    # Run Multi-Agent Orchestrator for every message so each turn gets analytics
    customer_message, draft = _pipeline_context(data.sender, data.content, data.agent_draft, session.messages)
    feedback_context = await _feedback_context(db)
    pipeline_output = orchestrator.run_turn_pipeline(
        session_id=session.id,
        customer_message=customer_message,
        agent_draft=draft,
        feedback_context=feedback_context
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
        "coaching": _analysis_data(analysis)
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
        customer_message=next_customer_msg,
        feedback_context=await _feedback_context(db)
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
        "coaching": _analysis_data(analysis)
    }

@router.post("/manual")
async def run_manual_coaching(
    data: ChatMessageSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manual Mode endpoint where agent pastes customer message and receives immediate real-time coaching."""
    return await process_chat_message(data=data, db=db, current_user=current_user)

@router.post("/translate")
async def translate_messages(
    data: TranslateSchema,
    current_user: User = Depends(get_current_user)
):
    """Translates a batch of conversation messages into the requested target language using the LLM."""
    target = data.target_language.strip() or "English"
    if not data.messages:
        return {"target_language": target, "translations": [], "llm_available": is_llm_available()}

    # Already in the target language? Nothing to translate — return instantly.
    if target.lower() == "english":
        return {
            "target_language": target,
            "translations": [{"id": m.get("id", ""), "text": m.get("text", "")} for m in data.messages],
            "llm_available": True,
        }

    if not is_llm_available():
        return {
            "target_language": target,
            "translations": [{"id": m.get("id", ""), "text": m.get("text", "")} for m in data.messages],
            "llm_available": False,
        }

    def cache_key(text: str) -> str:
        return f"{target.lower()}:{text}"

    # Serve cached translations instantly; only new text hits the LLM.
    result_map: Dict[str, str] = {}
    to_translate: List[Dict[str, str]] = []
    for m in data.messages:
        mid = str(m.get("id", ""))
        text = m.get("text", "")
        hit = _TRANSLATE_CACHE.get(cache_key(text))
        if hit is not None:
            result_map[mid] = hit
        else:
            to_translate.append({"id": mid, "text": text})

    if to_translate:
        payload = json.dumps(to_translate, ensure_ascii=False)
        user_prompt = (
            f"Target language: {target}\n\n"
            f'Translate each message into {target}. Keep ids unchanged. Return JSON strictly as '
            f'{{"translations": [{{"id": ..., "text": ...}}]}}\n\n'
            f"Messages: {payload}"
        )
        parsed = llm_json(TRANSLATE_SYSTEM_PROMPT, user_prompt, temperature=0.2)
        source_by_id = {str(m["id"]): m["text"] for m in to_translate}
        if parsed and isinstance(parsed.get("translations"), list):
            for t in parsed["translations"]:
                if not isinstance(t, dict):
                    continue
                tid = str(t.get("id", ""))
                ttext = str(t.get("text", ""))
                if not ttext:
                    continue
                result_map[tid] = ttext
                _remember_translation(cache_key(source_by_id.get(tid, "")), ttext)

    # Preserve original order/ids, falling back to original text when the model skips one.
    translations = []
    for m in data.messages:
        mid = str(m.get("id", ""))
        translations.append({"id": mid, "text": result_map.get(mid, m.get("text", ""))})

    return {"target_language": target, "translations": translations, "llm_available": True}

def _remember_translation(key: str, text: str) -> None:
    """Stores a translation in the bounded in-process cache."""
    if not key or not text:
        return
    _TRANSLATE_CACHE[key] = text
    if len(_TRANSLATE_CACHE) > _TRANSLATE_CACHE_MAX:
        # Simple bounded eviction: drop the oldest quarter of entries.
        excess = list(_TRANSLATE_CACHE.keys())[:_TRANSLATE_CACHE_MAX // 4]
        for k in excess:
            _TRANSLATE_CACHE.pop(k, None)


def _normalize_transcript_messages(messages):
    """Maps transcript items into a uniform {sender, content} shape."""
    normalized = []
    for item in messages:
        if not isinstance(item, dict):
            continue
        content = item.get("content", "")
        sender = item.get("sender") or item.get("role") or "customer"
        if sender not in {"customer", "agent"}:
            sender = "customer" if sender in {"user", "customer"} else "agent"
        normalized.append({"sender": sender, "content": content})
    return normalized


@router.get("/transcripts")
async def list_transcripts():
    """Lists available transcript files from data/transcripts/ for Replay Mode."""
    items = []
    for fname in _list_transcript_files():
        item = _load_transcript(fname)
        if item:
            items.append(item)
    return items

def _transcripts_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "..", "..", "data", "transcripts")

def _list_transcript_files() -> List[str]:
    transcripts_dir = _transcripts_dir()
    if not os.path.isdir(transcripts_dir):
        return []
    return [f for f in sorted(os.listdir(transcripts_dir)) if f.endswith(".json")]

def _scenario_suggestion(messages: List[Dict[str, str]]) -> str:
    """Derives a short scenario hint from a transcript since files carry no metadata."""
    for m in messages:
        if m.get("sender") == "customer":
            text = (m.get("content") or "").strip()
            return text[:140] + ("…" if len(text) > 140 else "")
    return ""

def _load_transcript(transcript_id: str) -> Optional[Dict[str, Any]]:
    """Safely loads and normalizes a transcript, guarding against path traversal."""
    if not transcript_id:
        return None
    # Only allow a bare filename within the transcripts dir.
    if os.path.basename(transcript_id) != transcript_id or not transcript_id.endswith(".json"):
        return None
    transcripts_dir = _transcripts_dir()
    real = os.path.realpath(os.path.join(transcripts_dir, transcript_id))
    if not real.startswith(os.path.realpath(transcripts_dir)):
        return None
    if transcript_id not in _list_transcript_files():
        return None
    try:
        with open(real, "r", encoding="utf-8") as f:
            content = json.load(f)
    except Exception:
        return None
    raw = content if isinstance(content, list) else content.get("messages", [])
    normalized = _normalize_transcript_messages(raw)
    title = transcript_id.replace("_", " ").replace(".json", "").title()
    return {
        "id": transcript_id,
        "filename": transcript_id,
        "title": title,
        "turn_count": len(normalized),
        "messages": normalized,
        "scenario_suggestion": _scenario_suggestion(normalized),
    }

@router.get("/transcripts/{transcript_id}")
async def get_transcript(transcript_id: str):
    """Returns the full content of one transcript for Replay/Simulator use."""
    item = _load_transcript(transcript_id)
    if not item:
        raise HTTPException(status_code=404, detail="Transcript not found.")
    return item

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
    normalized_messages = _normalize_transcript_messages(data.transcript_messages)
    feedback_context = await _feedback_context(db)
    for idx, item in enumerate(normalized_messages, 1):
        msg = await repo.add_message(
            session_id=session.id,
            sender=item["sender"],
            content=item["content"],
            turn_index=idx
        )

        customer_message, draft = _pipeline_context(item["sender"], item["content"], "", normalized_messages[:idx - 1])
        pipeline_output = orchestrator.run_turn_pipeline(
            session_id=session.id,
            customer_message=customer_message,
            agent_draft=draft,
            feedback_context=feedback_context
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
        results.append({
            "message": {
                "id": msg.id,
                "sender": msg.sender,
                "content": msg.content,
                "turn_index": msg.turn_index,
                "timestamp": msg.timestamp
            },
            "coaching": _analysis_data(analysis)
        })

    return {"session_id": session.id, "replayed_turns": len(results), "turns": results}

def _websocket_token(websocket: WebSocket) -> Optional[str]:
    """Accept the existing URL plus an optional JWT query/header credential."""
    token = websocket.query_params.get("token")
    if token:
        return token
    authorization = websocket.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


async def _send_websocket_error(websocket: WebSocket, code: str, message: str) -> None:
    await websocket.send_json({"status": "error", "error": {"code": code, "message": message}})


def _coaching_response(analysis) -> Dict[str, Any]:
    return {
        "id": analysis.id,
        "message_id": analysis.message_id,
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
        "knowledge_citations": analysis.knowledge_citations or [],
    }


async def _send_refine(websocket: WebSocket, analysis) -> None:
    """Pushes a refined coaching payload over the websocket, swallowing
    disconnect errors (the client may have navigated away by then)."""
    try:
        await websocket.send_json({
            "event": "coaching_refine",
            "message_id": analysis.message_id,
            "analysis_id": analysis.id,
            "coaching": _coaching_response(analysis),
        })
    except Exception:
        pass


async def _refine_analysis(
    websocket: WebSocket,
    session_id: str,
    analysis_id: str,
    customer_message: str,
    draft: str,
) -> None:
    """Runs the LLM pipeline in the background and streams a refined coaching
    payload back over the same websocket after the instant provisional result."""
    import asyncio

    feedback_context = ""
    try:
        async with AsyncSessionLocal() as db:
            repo = Repository(db)
            feedback_context = await repo.get_coaching_feedback_context()

            # Phase 1: fetch RAG citations only (fast, no LLM) and push them to
            # the client immediately, so the knowledge panel fills in well under
            # a second instead of waiting for the full LLM refinement. The LLM
            # pipeline then supersedes this with the grounded result.
            citations = await asyncio.to_thread(
                orchestrator.retrieve_citations,
                customer_message=customer_message,
            )
            if citations:
                provisional = await repo.update_coaching_analysis(
                    analysis_id,
                    knowledge_citations=citations,
                )
                if provisional is not None:
                    await _send_refine(websocket, provisional)

            # Phase 2: full LLM pipeline. The combined agent is grounded with
            # the same citations and echoes them back into the final state, so
            # the persisted record always carries the RAG results.
            pipeline_output = await asyncio.to_thread(
                orchestrator.run_turn_pipeline,
                session_id=session_id,
                customer_message=customer_message,
                agent_draft=draft,
                feedback_context=feedback_context,
                knowledge_citations=citations,
            )
            analysis = await repo.update_coaching_analysis(
                analysis_id,
                intent=pipeline_output["intent"],
                sentiment=pipeline_output["sentiment"],
                emotion=pipeline_output["emotion"],
                urgency=pipeline_output["urgency"],
                frustration=float(pipeline_output["frustration"]),
                confidence_score=float(pipeline_output["confidence_score"]),
                tone_score=float(pipeline_output["tone_score"]),
                grammar_score=float(pipeline_output["grammar_score"]),
                empathy_score=float(pipeline_output["empathy_score"]),
                escalation_risk=pipeline_output["escalation_risk"],
                suggested_reply=pipeline_output["suggested_reply"],
                reasoning=pipeline_output["reasoning"],
                knowledge_citations=pipeline_output["knowledge_citations"],
            )
    except Exception as e:
        print(f"[refine] LLM refinement failed, keeping provisional result: {e}")
        return

    if analysis is not None:
        await _send_refine(websocket, analysis)


@router.websocket("/ws/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str):
    """Authenticated, persisted real-time coaching using the REST chat schema."""
    await websocket.accept()
    token = _websocket_token(websocket)
    payload = decode_access_token(token) if token else None
    user_id = payload.get("sub") if payload else None
    if not user_id:
        await _send_websocket_error(websocket, "unauthorized", "A valid JWT token is required.")
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        repo = Repository(db)
        user = await repo.get_user_by_id(user_id)
        if not user:
            await _send_websocket_error(websocket, "unauthorized", "Authenticated user was not found.")
            await websocket.close(code=1008)
            return

        session = await repo.get_session(session_id)
        if not session:
            await _send_websocket_error(websocket, "session_not_found", "Session not found.")
            await websocket.close(code=1008)
            return
        if session.user_id != user.id:
            await _send_websocket_error(websocket, "forbidden", "You do not have access to this session.")
            await websocket.close(code=1008)
            return

        turn_index = len(session.messages)
        try:
            while True:
                try:
                    data = await websocket.receive_json()
                except ValueError:
                    await _send_websocket_error(websocket, "invalid_payload", "Message payload must be valid JSON.")
                    continue

                action = data.get("action", "send_message")
                sender = data.get("sender", "customer")
                content = data.get("content", "")
                agent_draft = data.get("agent_draft", "")

                if action == "simulator_next":
                    # Refresh session message history from the DB so the simulator
                    # advances with the conversation (ORM identity map can go stale).
                    history = [
                        {"sender": m.sender, "content": m.content}
                        for m in await repo.get_session_messages(session.id)
                    ]
                    content = simulator_agent.generate_next_turn(
                        persona=session.persona,
                        scenario=session.scenario,
                        product=session.product,
                        conversation_history=history
                    )
                    sender = "customer"

                if sender not in {"customer", "agent"}:
                    await _send_websocket_error(websocket, "invalid_sender", "Sender must be 'customer' or 'agent'.")
                    continue
                if not isinstance(content, str) or not content.strip():
                    await _send_websocket_error(websocket, "invalid_content", "Message content is required.")
                    continue
                if not isinstance(agent_draft, str):
                    await _send_websocket_error(websocket, "invalid_agent_draft", "Agent draft must be text.")
                    continue

                turn_index += 1
                message = await repo.add_message(
                    session_id=session.id,
                    sender=sender,
                    content=content.strip(),
                    turn_index=turn_index,
                )

                # Push every message immediately so the conversation panel renders
                # the bubble instantly instead of waiting for the LLM pipeline.
                await websocket.send_json({
                    "event": "customer_message",
                    "message": {
                        "id": message.id,
                        "sender": message.sender,
                        "content": message.content,
                        "turn_index": message.turn_index,
                        "timestamp": message.timestamp.isoformat(),
                    },
                })

                # Every message gets analytics. Agent messages are scored as a reply
                # against the latest customer context in the conversation.
                if sender == "customer":
                    customer_message = content.strip()
                    draft = agent_draft
                else:
                    context_history = await repo.get_session_messages(session.id)
                    context = ""
                    for m in reversed(context_history):
                        if m.sender == "customer":
                            context = m.content
                            break
                    customer_message = context or content.strip()
                    draft = content.strip()

                # Instant provisional analysis (rule-based, no LLM round-trip) so
                # turn_complete arrives in well under a second. The LLM pipeline
                # then refines the same record in the background.
                provisional = combined_agent._rule_based(customer_message, draft)
                analysis = await repo.add_coaching_analysis(
                    message_id=message.id,
                    intent=provisional.get("intent", "General Inquiry"),
                    sentiment=provisional.get("sentiment", "Neutral"),
                    emotion=provisional.get("emotion", "Calm"),
                    urgency=provisional.get("urgency", "Low"),
                    frustration=float(provisional.get("frustration", 0.0)),
                    confidence_score=float(provisional.get("confidence_score", 0.9)),
                    tone_score=float(provisional.get("tone_score", 85.0)),
                    grammar_score=float(provisional.get("grammar_score", 90.0)),
                    empathy_score=float(provisional.get("empathy_score", 85.0)),
                    escalation_risk=provisional.get("escalation_risk", "Low"),
                    suggested_reply=provisional.get("suggested_reply", ""),
                    reasoning=provisional.get("reasoning", ""),
                    knowledge_citations=[],
                )
                coaching = _coaching_response(analysis)

                await websocket.send_json({
                    "event": "turn_complete",
                    "status": "success",
                    "message": {
                        "id": message.id,
                        "sender": message.sender,
                        "content": message.content,
                        "turn_index": message.turn_index,
                        "timestamp": message.timestamp.isoformat(),
                    },
                    "coaching": coaching,
                })

                # Refine with the real LLM pipeline in the background; the client
                # already unlocked the conversation on the provisional result.
                asyncio.ensure_future(
                    _refine_analysis(
                        websocket=websocket,
                        session_id=session.id,
                        analysis_id=analysis.id,
                        customer_message=customer_message,
                        draft=draft,
                    )
                )
        except WebSocketDisconnect:
            return
        except Exception:
            await _send_websocket_error(websocket, "processing_error", "Unable to process the chat message.")
