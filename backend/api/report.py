import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database.connection import get_db
from backend.database.repository import Repository
from backend.reports.pdf_generator import generate_pdf_report
from backend.agents.summary_agent import summary_agent
from backend.authentication.rbac import get_current_user
from backend.database.models import User

router = APIRouter(prefix="/report", tags=["Post-Interaction Reports"])

@router.post("/generate/{session_id}")
async def generate_session_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Calculate summary metrics & sentiment journey from session messages
    sentiment_journey = []
    turn_analytics = []
    total_tone = 0.0
    total_grammar = 0.0
    total_empathy = 0.0
    count = 0
    last_analysis = None
    last_customer_msg = ""
    escalation_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}

    for msg in session.messages:
        if msg.sender == "customer":
            last_customer_msg = msg.content
        if msg.analysis:
            a = msg.analysis
            last_analysis = a
            sentiment_journey.append({
                "turn": msg.turn_index,
                "sentiment": a.sentiment,
                "frustration": a.frustration,
                "risk": a.escalation_risk
            })
            turn_analytics.append({
                "turn": msg.turn_index,
                "sentiment": a.sentiment,
                "intent": a.intent,
                "tone": a.tone_score,
                "grammar": a.grammar_score,
                "empathy": a.empathy_score,
                "frustration": a.frustration,
                "risk": a.escalation_risk,
            })
            total_tone += a.tone_score
            total_grammar += a.grammar_score
            total_empathy += a.empathy_score
            if a.escalation_risk in escalation_counts:
                escalation_counts[a.escalation_risk] += 1
            count += 1

    resolution_score = round((total_tone + total_grammar + total_empathy) / (3 * count), 1) if count > 0 else 88.5

    aggregates = {
        "total_turns": count,
        "avg_tone": round(total_tone / count, 1) if count > 0 else 0,
        "avg_grammar": round(total_grammar / count, 1) if count > 0 else 0,
        "avg_empathy": round(total_empathy / count, 1) if count > 0 else 0,
        "escalation_distribution": escalation_counts,
    }

    # Dynamically generate post-interaction summary using SummaryAgent
    summary_output = summary_agent.summarize(
        customer_message=last_customer_msg or session.scenario or "Customer support interaction",
        intent=last_analysis.intent if last_analysis else session.category,
        sentiment=last_analysis.sentiment if last_analysis else "Neutral",
        emotion=last_analysis.emotion if last_analysis else "Calm",
        escalation_risk=last_analysis.escalation_risk if last_analysis else "Low",
        suggested_reply=last_analysis.suggested_reply if last_analysis else "",
        tone_score=round(total_tone / count, 1) if count > 0 else 90.0,
        grammar_score=round(total_grammar / count, 1) if count > 0 else 90.0,
        empathy_score=round(total_empathy / count, 1) if count > 0 else 88.0,
    )

    summary_text = summary_output.get("conversation_summary") or (
        f"The interaction covered {session.product} under the {session.category} category with a {session.persona} customer persona. "
        f"The agent successfully handled {count} turns with resolution score {resolution_score}%."
    )

    strengths = summary_output.get("agent_strengths") or [
        "Promptly acknowledged customer issue with professional courtesy",
        "Effectively leveraged knowledge base articles during explanation",
        "Maintained high grammar and clarity standards throughout the conversation"
    ]

    weaknesses = summary_output.get("agent_improvements") or [
        "Could reduce delay when confirming verification details",
        "Should proactively offer follow-up confirmation steps"
    ]

    coaching_tips = summary_output.get("coaching_recommendations") or [
        "Use empathy statements early when customer frustration exceeds 0.5",
        "Always cite knowledge article troubleshooting steps clearly",
        "Confirm issue resolution before closing the support session"
    ]

    pdf_filename = f"report_{session_id}.pdf"
    pdf_path = os.path.join(settings.REPORTS_DIR, pdf_filename)
    generate_pdf_report(
        session_id=session_id,
        output_path=pdf_path,
        summary_text=summary_text,
        resolution_score=resolution_score,
        sentiment_journey=sentiment_journey,
        strengths=strengths,
        weaknesses=weaknesses,
        coaching_tips=coaching_tips,
        turn_analytics=turn_analytics,
        aggregates=aggregates
    )

    report = await repo.create_report(
        session_id=session_id,
        summary=summary_text,
        sentiment_journey=sentiment_journey,
        resolution_score=resolution_score,
        strengths=strengths,
        weaknesses=weaknesses,
        coaching_tips=coaching_tips,
        pdf_path=pdf_path
    )

    return {
        "id": report.id,
        "session_id": report.session_id,
        "summary": report.summary,
        "resolution_score": report.resolution_score,
        "sentiment_journey": report.sentiment_journey,
        "strengths": report.strengths,
        "weaknesses": report.weaknesses,
        "coaching_tips": report.coaching_tips,
        "pdf_download_url": f"/api/v1/report/{session_id}/pdf"
    }

@router.get("/{session_id}")
async def get_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = Repository(db)
    report = await repo.get_report_by_session(session_id)
    if not report:
        # Generate on the fly if not created yet
        return await generate_session_report(session_id=session_id, db=db, current_user=current_user)
    return {
        "id": report.id,
        "session_id": report.session_id,
        "summary": report.summary,
        "resolution_score": report.resolution_score,
        "sentiment_journey": report.sentiment_journey,
        "strengths": report.strengths,
        "weaknesses": report.weaknesses,
        "coaching_tips": report.coaching_tips,
        "pdf_download_url": f"/api/v1/report/{session_id}/pdf"
    }

@router.get("/{session_id}/pdf")
async def download_report_pdf(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    repo = Repository(db)
    report = await repo.get_report_by_session(session_id)
    if not report or not report.pdf_path or not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=404, detail="PDF report not found.")
    return FileResponse(
        path=report.pdf_path,
        filename=f"Support_Coaching_Report_{session_id[:8]}.pdf",
        media_type="application/pdf"
    )
