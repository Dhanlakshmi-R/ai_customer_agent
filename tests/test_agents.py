import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.agents.customer_simulator import CustomerSimulatorAgent
from src.agents.intent_sentiment import IntentSentimentAgent
from src.agents.knowledge_recommendation import KnowledgeRecommendationAgent
from src.agents.coaching_suggestion import CoachingSuggestionAgent
from src.agents.escalation_monitor import EscalationMonitorAgent
from src.agents.post_interaction_summary import PostInteractionSummaryAgent
from src.core.models import (
    CustomerIntent,
    EscalationRisk,
    InteractionMode,
    Message,
    Scenario,
    SentimentLabel,
    SessionConfig,
    SessionState,
    TurnAnalysis,
)


def test_customer_simulator():
    agent = CustomerSimulatorAgent()
    scenario = Scenario(
        title="technical_glitch",
        problem_description="technical_glitch",
        customer_persona="Frustrated user",
        product_context="Mobile App",
        emotional_start=SentimentLabel.FRUSTRATED,
    )
    msg = agent.generate_first_message(scenario)
    assert msg.role == "customer"
    assert len(msg.content) > 0
    print(f"[PASS] Customer Simulator: {msg.content[:50]}...")


def test_intent_sentiment():
    agent = IntentSentimentAgent()
    result = agent.analyze("This app keeps crashing every time I try to open it. It's so frustrating!")
    assert result.intent == CustomerIntent.TECHNICAL_ISSUE
    assert result.frustration_level > 0.3
    print(f"[PASS] Intent: {result.intent.value}, Sentiment: {result.sentiment.value}")


def test_intent_billing():
    agent = IntentSentimentAgent()
    result = agent.analyze("I was charged twice for my subscription this month. I want a refund.")
    assert result.intent in (CustomerIntent.BILLING, CustomerIntent.REFUND)
    print(f"[PASS] Billing Intent: {result.intent.value}")


def test_knowledge_recommendation():
    agent = KnowledgeRecommendationAgent()
    results = agent.recommend("I can't reset my password, the email never arrives", top_k=2)
    assert len(results) > 0
    assert results[0].relevance_score > 0
    print(f"[PASS] Knowledge: {len(results)} items, top: {results[0].title}")


def test_coaching_suggestion():
    agent = CoachingSuggestionAgent()
    customer_msg = Message(role="customer", content="This is terrible, I've been waiting for hours!")
    feedback = agent.analyze_response(customer_msg, None, None)
    assert len(feedback.suggested_response) > 0
    assert len(feedback.communication_tips) > 0
    print(f"[PASS] Coaching: tone={feedback.tone_quality}, tips={len(feedback.communication_tips)}")


def test_escalation_monitor():
    agent = EscalationMonitorAgent()
    session = SessionState(
        session_id="test",
        config=SessionConfig(mode=InteractionMode.SIMULATOR),
    )
    session.add_message(Message(role="customer", content="I want to speak to a manager right now! This is completely unacceptable."))

    from src.agents.intent_sentiment import IntentSentimentAgent
    intent = IntentSentimentAgent().analyze("I want to speak to a manager right now! This is completely unacceptable.")
    assessment = agent.assess(session, intent)
    assert assessment.risk_level in (EscalationRisk.MEDIUM, EscalationRisk.HIGH, EscalationRisk.CRITICAL)
    assert len(assessment.recommended_strategies) > 0
    print(f"[PASS] Escalation: risk={assessment.risk_level.value}, score={assessment.risk_score}")


def test_end_to_end_simulator_session():
    from src.modules.conversation_manager import ConversationManager
    from src.modules.session_config import SessionConfigModule

    config_module = SessionConfigModule()
    scenario = Scenario(
        title="billing_dispute",
        problem_description="billing_dispute",
        customer_persona="Concerned customer",
        product_context="SaaS Platform",
        emotional_start=SentimentLabel.NEUTRAL,
    )
    session = config_module.create_session(
        mode=InteractionMode.SIMULATOR,
        agent_name="Test Agent",
        scenario=scenario,
    )

    mgr = ConversationManager()
    simulator = CustomerSimulatorAgent()

    first_msg = simulator.generate_first_message(scenario)
    turn1 = mgr.process_customer_message(session, first_msg)
    assert turn1.intent_analysis is not None
    assert turn1.turn_number == 1

    mgr.process_agent_response(
        session,
        Message(role="agent", content="I understand your concern. Let me look into your billing details right away."),
        turn1,
    )
    assert turn1.agent_message is not None
    assert turn1.coaching_feedback is not None

    reply = mgr.generate_simulator_reply(session, turn1)
    turn2 = mgr.process_customer_message(session, reply)
    assert turn2.turn_number == 2

    print(f"[PASS] E2E Simulator: {session.current_turn} turns completed")


if __name__ == "__main__":
    test_customer_simulator()
    test_intent_sentiment()
    test_intent_billing()
    test_knowledge_recommendation()
    test_coaching_suggestion()
    test_escalation_monitor()
    test_end_to_end_simulator_session()
    print("\nAll agent tests passed!")
