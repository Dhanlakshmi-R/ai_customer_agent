import datetime
from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END

from backend.agents.intent_sentiment_agent import IntentSentimentAgent
from backend.agents.knowledge_agent import KnowledgeRecommendationAgent
from backend.agents.coaching_agent import CoachingAgent
from backend.agents.escalation_agent import EscalationRiskAgent
from backend.agents.simulator_agent import CustomerSimulatorAgent

# Initialize agents
intent_sentiment_agent = IntentSentimentAgent()
knowledge_agent = KnowledgeRecommendationAgent()
coaching_agent = CoachingAgent()
escalation_agent = EscalationRiskAgent()
simulator_agent = CustomerSimulatorAgent()

class AgentState(TypedDict):
    session_id: str
    customer_message: str
    agent_draft: Optional[str]
    intent: Optional[str]
    sentiment: Optional[str]
    emotion: Optional[str]
    urgency: Optional[str]
    frustration: Optional[float]
    confidence_score: Optional[float]
    knowledge_citations: Optional[List[Dict[str, Any]]]
    tone_score: Optional[float]
    grammar_score: Optional[float]
    empathy_score: Optional[float]
    suggested_reply: Optional[str]
    reasoning: Optional[str]
    improvement_tips: Optional[List[str]]
    escalation_risk: Optional[str]
    escalation_reason: Optional[str]
    recommended_action: Optional[str]

class ConversationOrchestrator:
    def __init__(self):
        self._build_graph()

    def _build_graph(self):
        """Constructs LangGraph multi-agent orchestration workflow."""
        builder = StateGraph(AgentState)

        # Node 1: Intent & Sentiment
        def process_intent_sentiment(state: AgentState) -> Dict[str, Any]:
            res = intent_sentiment_agent.analyze(state["customer_message"])
            return res

        # Node 2: Knowledge Recommendation RAG
        def process_knowledge(state: AgentState) -> Dict[str, Any]:
            query = state["customer_message"]
            intent = state.get("intent", "General")
            citations = knowledge_agent.retrieve(query=query, intent=intent)
            return {"knowledge_citations": citations}

        # Node 3: Coaching & Response Suggestion
        def process_coaching(state: AgentState) -> Dict[str, Any]:
            res = coaching_agent.evaluate_and_suggest(
                customer_message=state["customer_message"],
                intent=state.get("intent", "General"),
                sentiment=state.get("sentiment", "Neutral"),
                knowledge_citations=state.get("knowledge_citations", []),
                agent_draft=state.get("agent_draft", "")
            )
            return res

        # Node 4: Escalation Risk Monitor
        def process_escalation(state: AgentState) -> Dict[str, Any]:
            res = escalation_agent.evaluate_risk(
                intent=state.get("intent", "General"),
                sentiment=state.get("sentiment", "Neutral"),
                frustration=state.get("frustration", 0.0),
                urgency=state.get("urgency", "Low"),
                customer_message=state["customer_message"]
            )
            return {
                "escalation_risk": res["escalation_risk"],
                "escalation_reason": res["reason"],
                "recommended_action": res["recommended_action"]
            }

        # Add Nodes
        builder.add_node("intent_sentiment", process_intent_sentiment)
        builder.add_node("knowledge_rag", process_knowledge)
        builder.add_node("coaching", process_coaching)
        builder.add_node("escalation", process_escalation)

        # Flow Edges
        builder.set_entry_point("intent_sentiment")
        builder.add_edge("intent_sentiment", "knowledge_rag")
        builder.add_edge("knowledge_rag", "coaching")
        builder.add_edge("coaching", "escalation")
        builder.add_edge("escalation", END)

        self.workflow = builder.compile()

    def run_turn_pipeline(
        self,
        session_id: str,
        customer_message: str,
        agent_draft: str = ""
    ) -> Dict[str, Any]:
        """Executes full multi-agent pipeline for a single conversation turn."""
        initial_state: AgentState = {
            "session_id": session_id,
            "customer_message": customer_message,
            "agent_draft": agent_draft,
            "intent": None,
            "sentiment": None,
            "emotion": None,
            "urgency": None,
            "frustration": None,
            "confidence_score": None,
            "knowledge_citations": None,
            "tone_score": None,
            "grammar_score": None,
            "empathy_score": None,
            "suggested_reply": None,
            "reasoning": None,
            "improvement_tips": None,
            "escalation_risk": None,
            "escalation_reason": None,
            "recommended_action": None
        }

        result_state = self.workflow.invoke(initial_state)
        return result_state

orchestrator = ConversationOrchestrator()
