import pytest
import asyncio
from unittest.mock import patch

from backend.agents.intent_sentiment_agent import IntentSentimentAgent
from backend.agents.coaching_agent import CoachingAgent
from backend.agents.escalation_agent import EscalationRiskAgent
from backend.agents.simulator_agent import CustomerSimulatorAgent
from backend.rag.chunker import chunk_text

def test_intent_sentiment_classification():
    agent = IntentSentimentAgent()
    res = agent.analyze("I was charged twice for my subscription and this is unacceptable! I want a refund!")
    assert res["intent"] == "Billing & Refund"
    assert res["sentiment"] == "Negative"
    assert res["frustration"] >= 0.4

def test_coaching_evaluation():
    agent = CoachingAgent()
    res = agent.evaluate_and_suggest(
        customer_message="My system crashed",
        intent="Technical Issue",
        sentiment="Negative",
        knowledge_citations=[{"snippet": "Check TLS config"}]
    )
    assert res["tone_score"] > 80.0
    assert "technical" in res["suggested_reply"].lower() or "check" in res["suggested_reply"].lower()

def test_coaching_agent_injects_feedback_context():
    """Agent Feedback Loop: aggregate ratings must reach the LLM prompt."""
    agent = CoachingAgent()
    captured = {}

    def fake_llm_json(system, user, temperature):
        captured["user"] = user
        return {
            "tone_score": 88, "grammar_score": 91, "empathy_score": 90,
            "suggested_reply": "Let me help you resolve that now.",
            "reasoning": "Direct and empathetic.",
            "improvement_tips": ["Acknowledge concern", "Offer next step"],
        }

    with patch("backend.agents.coaching_agent.llm_json", side_effect=fake_llm_json):
        res = agent.evaluate_and_suggest(
            customer_message="You double charged me!",
            intent="Billing & Refund",
            sentiment="Negative",
            knowledge_citations=[],
            feedback_context="Agent feedback loop: 10 ratings, 80% helpful. Prefer short replies.",
        )

    assert res["tone_score"] == 88.0
    assert "feedback" in captured["user"].lower()
    assert "80% helpful" in captured["user"]

def test_escalation_risk():
    agent = EscalationRiskAgent()
    res = agent.evaluate_risk(
        intent="Billing & Refund",
        sentiment="Negative",
        frustration=0.9,
        urgency="High",
        customer_message="I will talk to my supervisor and legal team!"
    )
    assert res["escalation_risk"] == "Critical"
    assert "Manager escalation" in res["recommended_action"]

def test_customer_simulator():
    sim = CustomerSimulatorAgent()
    msg = sim.generate_next_turn(
        persona="Confused",
        scenario="Password Reset",
        product="Cloud SaaS",
        conversation_history=[]
    )
    assert len(msg) > 10

def test_text_chunker():
    text = "Sample text. " * 100
    metadata = {"doc_id": "test_1", "title": "Test Doc"}
    chunks = chunk_text(text, metadata, chunk_size=200, chunk_overlap=30)
    assert len(chunks) > 1
    assert chunks[0]["metadata"]["chunk_id"] == "test_1_chunk_0"
