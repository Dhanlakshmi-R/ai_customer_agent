import streamlit as st
from src.core.models import SessionState, TurnAnalysis, EscalationRisk
from src.core.model_config import HumorEngine


@st.cache_data(show_spinner=False)
def get_tts_audio(text: str):
    try:
        from gtts import gTTS
        import io
        tts = gTTS(text=text, lang='en', tld='co.in')
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()
    except Exception:
        return None

def render_conversation_panel(session: SessionState):
    container = st.container(height=440, border=True)
    with container:
        if not session.messages:
            st.markdown(
                '<div style="text-align:center;padding:40px 0;color:var(--text-muted)">'
                '<div style="font-size:3em;margin-bottom:8px;filter:drop-shadow(0 0 10px rgba(99,102,241,0.3))">💬</div>'
                '<div style="font-weight:600">No messages yet</div>'
                '<div style="font-size:0.8em;margin-top:4px">Start a session to begin</div></div>',
                unsafe_allow_html=True,
            )
            return

        for msg in session.messages:
            if msg.role == "customer":
                st.markdown(
                    '<div class="chat-customer">'
                    '<span class="chat-label chat-label-customer">Customer</span>'
                    f'{msg.content}</div>',
                    unsafe_allow_html=True,
                )
                audio_bytes = get_tts_audio(msg.content)
                if audio_bytes:
                    st.audio(audio_bytes, format="audio/mp3")
            elif msg.role == "agent":
                st.markdown(
                    '<div class="chat-agent">'
                    '<span class="chat-label chat-label-agent">You (Agent)</span>'
                    f'{msg.content}</div>',
                    unsafe_allow_html=True,
                )


def render_coaching_panel(turn_analysis: TurnAnalysis | None, session: SessionState):
    container = st.container(height=500, border=True)
    with container:
        if not turn_analysis:
            st.markdown(
                '<div style="text-align:center;padding:40px 0;color:var(--text-muted)">'
                '<div style="font-size:3em;margin-bottom:8px;animation:float 3s ease-in-out infinite;filter:drop-shadow(0 0 10px rgba(99,102,241,0.3))">🎯</div>'
                '<div style="font-weight:600">Waiting for input...</div>'
                '<div style="font-size:0.8em;margin-top:4px">Send a message to get coaching</div></div>',
                unsafe_allow_html=True,
            )
            return

        humor_on = getattr(st.session_state, "humor_mode", False)
        cf = turn_analysis.coaching_feedback

        if humor_on and cf:
            has_agent_response = bool(turn_analysis.agent_message and turn_analysis.agent_message.strip())
            first_tip = cf.communication_tips[0] if cf.communication_tips else ""

            if not has_agent_response:
                import random
                waiting_roasts = [
                    "Still waiting... even a 'hold on' would be progress.",
                    "The customer is staring at their screen. Any day now.",
                    "Crickets. The customer is typing 'hello?' as we speak.",
                    "Radio silence. The customer is filing a complaint in their mind.",
                    "The void stares back. Type something, anything.",
                ]
                st.markdown(
                    f'<div class="roast-badge" style="margin-bottom:12px">{random.choice(waiting_roasts)}</div>',
                    unsafe_allow_html=True,
                )
            elif cf.communication_tips:
                waiting_phrases = ["Still waiting", "staring at their screen", "Crickets",
                                   "Radio silence", "void stares back"]
                is_waiting = any(p in first_tip for p in waiting_phrases)
                roast_phrases = ["Turing", "grandma", "200% confused", "pizza", "copy-paste",
                                 "robot", "frozen pizza", "chatbot", "novel", "Tldr",
                                 "Terms of Service", "War and Peace", "interrogation",
                                 "job interview", "quiz show", "9000", "Bold strategy",
                                 "fuel to the fire", "empathy", "zero", "Zero",
                                 "warmth of a frozen", "interrogation mode"]
                compliment_phrases = ["THAT", "Beautiful", "Chef", "Textbook", "satisfaction meter",
                                      "raise", "smiling", "Michelin"]
                tip_starters = ["Pro tip:", "Fun fact:", "Hot take:", "Real talk:", "Galaxy brain"]

                is_roast = any(p.lower() in first_tip.lower() for p in roast_phrases) or is_waiting
                is_compliment = any(p.lower() in first_tip.lower() for p in compliment_phrases)
                is_tip = any(first_tip.startswith(s) for s in tip_starters)

                if is_roast:
                    st.markdown(
                        f'<div class="roast-badge" style="margin-bottom:12px">{first_tip}</div>',
                        unsafe_allow_html=True,
                    )
                elif is_compliment:
                    st.markdown(
                        f'<div class="compliment-badge" style="margin-bottom:12px">{first_tip}</div>',
                        unsafe_allow_html=True,
                    )
                else:
                    st.markdown(
                        f'<div class="roasty-tip" style="margin-bottom:12px">{first_tip}</div>',
                        unsafe_allow_html=True,
                    )

        if turn_analysis.intent_analysis:
            ia = turn_analysis.intent_analysis

            if ia.sentiment.value == "angry" or ia.frustration_level > 0.8:
                st.markdown(
                    '<div style="background:linear-gradient(135deg,rgba(220,38,38,0.2),rgba(153,27,27,0.4));'
                    'border:1px solid rgba(220,38,38,0.5);border-radius:12px;padding:12px;margin-bottom:12px;'
                    'box-shadow: 0 4px 15px rgba(220,38,38,0.3); animation: pulse 2s infinite">'
                    '<div style="color:var(--text-danger);font-weight:800;font-size:0.85em;text-transform:uppercase;margin-bottom:4px">'
                    '🚨 SYSTEM MANAGER ALERT</div>'
                    '<div style="color:var(--text-on-card);font-size:0.95em">'
                    'Customer frustration is critically high! De-escalate immediately or offer compensation to prevent churn.'
                    '</div></div>',
                    unsafe_allow_html=True,
                )
            intent_label = ia.intent.value.replace("_", " ").title()
            sent_label = ia.sentiment.value.title()

            colors = {
                "positive": "#10b981", "satisfied": "#10b981", "neutral": "#64748b",
                "negative": "#ef4444", "frustrated": "#f59e0b", "angry": "#ef4444",
                "negative_fallback": "#ef4444", "positive_fallback": "#10b981",
            }
            sc = colors.get(ia.sentiment.value, "#64748b")

            st.markdown(
                f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
                f'<div style="background:linear-gradient(145deg,rgba(99,102,241,0.12),var(--surface-overlay));'
                f'border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:10px;text-align:center">'
                f'<div style="font-size:0.7em;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Intent</div>'
                f'<div style="font-weight:700;color:var(--text);margin-top:4px">{intent_label}</div></div>'
                f'<div style="background:linear-gradient(145deg,rgba({",".join(str(int(sc.lstrip("#")[i:i+2], 16)) for i in (0, 2, 4))},0.12),var(--surface-overlay));'
                f'border:1px solid {sc}22;border-radius:12px;padding:10px;text-align:center">'
                f'<div style="font-size:0.7em;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Sentiment</div>'
                f'<div style="font-weight:700;color:{sc};margin-top:4px">{sent_label}</div></div>'
                f'<div style="background:linear-gradient(145deg,rgba(245,158,11,0.12),var(--surface-overlay));'
                f'border:1px solid rgba(245,158,11,0.15);border-radius:12px;padding:10px;text-align:center">'
                f'<div style="font-size:0.7em;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Frustration</div>'
                f'<div style="font-weight:700;color:var(--text-warning);margin-top:4px">{int(ia.frustration_level * 100)}%</div></div></div>',
                unsafe_allow_html=True,
            )

        if turn_analysis.escalation_assessment:
            ea = turn_analysis.escalation_assessment
            risk_map = {
                EscalationRisk.LOW: ("Low", "#10b981", "risk-low"),
                EscalationRisk.MEDIUM: ("Medium", "#f59e0b", "risk-medium"),
                EscalationRisk.HIGH: ("High", "#ef4444", "risk-high"),
                EscalationRisk.CRITICAL: ("Critical", "#dc2626", "risk-critical"),
            }
            rl, rc, rclass = risk_map.get(ea.risk_level, ("Unknown", "#64748b", ""))
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:10px;margin:8px 0">'
                f'<span style="color:var(--text-muted);font-size:0.85em;font-weight:600">Escalation Risk:</span>'
                f'<span class="{rclass}" style="padding:3px 12px;border-radius:8px;font-size:0.8em;font-weight:700">{rl}</span>'
                f'<span style="color:var(--text-muted);font-size:0.8em">({ea.risk_score:.0%})</span></div>',
                unsafe_allow_html=True,
            )

        if cf:
            calibrator = st.session_state.orchestrator.conversation_manager.calibrator
            should_show, confidence = calibrator.should_intervene(session.config.agent_name, cf)

            if should_show:
                if cf.response_quality_score < 0.4:
                    badge_bg = "linear-gradient(135deg,#dc2626,#ef4444)"
                    badge_text = "Needs Attention"
                else:
                    badge_bg = "linear-gradient(135deg,#d97706,#f59e0b)"
                    badge_text = "Minor Improvements"

                st.markdown(
                    f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
                    f'<span style="background:{badge_bg};color:var(--text-on-accent);padding:4px 14px;'
                    f'border-radius:10px;font-size:0.8em;font-weight:700">{badge_text}</span>'
                    f'<span style="color:var(--text-muted);font-size:0.75em">confidence: {confidence:.0%}</span></div>',
                    unsafe_allow_html=True,
                )

                st.markdown(
                    f'<div style="display:flex;gap:16px;margin-bottom:8px">'
                    f'<div style="color:var(--text-muted);font-size:0.85em"><span style="font-weight:600;color:var(--text)">Clarity:</span> {cf.clarity_score:.0%}</div>'
                    f'<div style="color:var(--text-muted);font-size:0.85em"><span style="font-weight:600;color:var(--text)">Tone:</span> {cf.tone_quality}</div></div>',
                    unsafe_allow_html=True,
                )

                remaining = cf.communication_tips[1:] if cf.communication_tips else []
                if cf.suggested_response:
                    with st.expander("Suggested Response", expanded=False):
                        st.markdown(
                            f'<div style="background:linear-gradient(145deg,rgba(99,102,241,0.08),var(--surface-overlay));'
                            f'padding:12px 16px;border-radius:12px;border-left:4px solid #6366f1;'
                            f'font-size:0.9em;color:var(--text);line-height:1.6">'
                            f'{cf.suggested_response}</div>',
                            unsafe_allow_html=True,
                        )

                if remaining:
                    with st.expander(f"Tips ({len(remaining)})"):
                        for tip in remaining:
                            st.markdown(f"- {tip}")
            else:
                st.markdown(
                    '<div style="display:flex;align-items:center;gap:10px">'
                    '<span style="background:linear-gradient(135deg,#059669,#10b981);color:var(--text-on-accent);'
                    'padding:4px 14px;border-radius:10px;font-size:0.8em;font-weight:700">Well Handled</span>'
                    f'<span style="color:var(--text-muted);font-size:0.75em">confidence: {confidence:.0%}</span></div>'
                    '<div style="color:var(--text-muted);font-size:0.85em;margin-top:8px;font-style:italic">No intervention needed.</div>',
                    unsafe_allow_html=True,
                )

            stats = calibrator.get_agent_stats(session.config.agent_name)
            if stats["sessions"] > 0:
                st.markdown(
                    f'<div style="margin-top:8px;padding:6px 10px;background:var(--surface-overlay);'
                    f'border-radius:8px;font-size:0.7em;color:var(--text-muted)">'
                    f'Coach: {stats["sessions"]} turns | shown: {stats.get("coaching_shown", 0)} | hidden: {stats.get("coaching_hidden", 0)}</div>',
                    unsafe_allow_html=True,
                )


def render_knowledge_panel(turn_analysis: TurnAnalysis | None, session: SessionState):
    container = st.container(height=440, border=True)
    with container:
        if not turn_analysis or not turn_analysis.knowledge_items:
            st.markdown(
                '<div style="text-align:center;padding:40px 0;color:var(--text-muted)">'
                '<div style="font-size:3em;margin-bottom:8px;animation:float 3s ease-in-out infinite;filter:drop-shadow(0 0 10px rgba(6,182,212,0.3))">📚</div>'
                '<div style="font-weight:600">Relevant articles</div>'
                '<div style="font-size:0.8em;margin-top:4px">Will appear here as you chat</div></div>',
                unsafe_allow_html=True,
            )
            return

        for item in turn_analysis.knowledge_items:
            pct = int(item.relevance_score * 100)
            st.markdown(
                f'<div class="kb-card">'
                f'<div style="font-weight:700;color:var(--text);margin-bottom:6px">{item.title}</div>'
                f'<div class="progress-bar"><div class="progress-fill" style="width:{pct}%"></div></div>'
                f'<div style="display:flex;justify-content:space-between;margin:4px 0">'
                f'<span style="font-size:0.75em;color:var(--text-accent);font-weight:600">{pct}% match</span></div>'
                f'<div style="font-size:0.85em;color:var(--text-muted);line-height:1.5">{item.content[:180]}{"..." if len(item.content) > 180 else ""}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


def render_performance_report(report):
    if not report:
        return

    overall = report.overall_score
    if overall >= 0.7:
        grade, gc = "Excellent", "#10b981"
        emoji = "star"
    elif overall >= 0.5:
        grade, gc = "Good", "#f59e0b"
        emoji = "thumbsup"
    elif overall >= 0.3:
        grade, gc = "Needs Improvement", "#f97316"
        emoji = "chart"
    else:
        grade, gc = "Poor", "#ef4444"
        emoji = "alert"

    st.markdown(
        f'<div class="score-ring" style="color:{gc}">{overall:.0%}</div>'
        f'<div style="text-align:center;margin-bottom:20px">'
        f'<span style="background:{gc};color:var(--text-on-accent);padding:4px 16px;border-radius:10px;'
        f'font-weight:700;font-size:0.9em">{grade}</span></div>',
        unsafe_allow_html=True,
    )

    mcols = st.columns(4)
    mcols[0].metric("Resolution", "%d%%" % (report.resolution_quality.score * 100) if report.resolution_quality else "N/A")
    mcols[1].metric("Turns", str(report.total_turns))
    mcols[2].metric("Resolved", "Yes" if report.resolution_quality and report.resolution_quality.issue_resolved else "No")
    mcols[3].metric("Escalated", "Yes" if report.resolution_quality and report.resolution_quality.escalation_needed else "No")

    st.markdown("#### Sentiment Journey")
    if report.sentiment_journey:
        import pandas as pd
        df = pd.DataFrame(report.sentiment_journey)
        if "turn" in df.columns and "frustration" in df.columns:
            st.line_chart(df, x="turn", y="frustration", color="#f44336")

        flow = " -> ".join(s["sentiment"].title() for s in report.sentiment_journey)
        st.markdown(f"**Flow:** `{flow}`")

    col_a, col_b = st.columns(2)
    with col_a:
        if report.escalation_triggers:
            with st.expander(f"Escalation Triggers ({len(report.escalation_triggers)})"):
                for t in report.escalation_triggers:
                    st.markdown(f"- {t}")
    with col_b:
        if report.knowledge_gaps:
            with st.expander(f"Knowledge Gaps ({len(report.knowledge_gaps)})"):
                for g in report.knowledge_gaps:
                    st.markdown(f"- {g}")

    if report.coaching_recommendations:
        st.markdown("#### Coaching Recommendations")
        for rec in report.coaching_recommendations:
            st.markdown(f"- {rec}")
