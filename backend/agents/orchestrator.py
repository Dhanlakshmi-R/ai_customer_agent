import datetime
from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END

from backend.agents.combined_agent import CombinedAnalysisAgent
from backend.agents.knowledge_agent import KnowledgeRecommendationAgent
from backend.agents.simulator_agent import CustomerSimulatorAgent

# Initialize agents
combined_agent = CombinedAnalysisAgent()
knowledge_agent = KnowledgeRecommendationAgent()
simulator_agent = CustomerSimulatorAgent()

class AgentState(TypedDict):
    session_id: str
    customer_message: str
    agent_draft: Optional[str]
    feedback_context: Optional[str]
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

        # Node 1: Knowledge Recommendation RAG — fast, no LLM. Runs first so the
        # combined analysis is grounded in real support docs (and the citations
        # are guaranteed to reach the final state / knowledge panel).
        def process_knowledge(state: AgentState) -> Dict[str, Any]:
            existing = state.get("knowledge_citations") or []
            if existing:
                return {"knowledge_citations": existing}
            query = state["customer_message"]
            citations = knowledge_agent.retrieve(query=query)
            return {"knowledge_citations": citations}

        # Node 2: Combined LLM analysis. A single LLM call returns intent,
        # sentiment, coaching scores, escalation risk and a RAG-grounded reply,
        # so a turn costs one API round-trip (~1.5s) instead of 3-4 serial calls.
        def process_combined(state: AgentState) -> Dict[str, Any]:
            res = combined_agent.analyze(
                customer_message=state["customer_message"],
                agent_draft=state.get("agent_draft", ""),
                knowledge_citations=state.get("knowledge_citations", []),
                feedback_context=state.get("feedback_context", ""),
            )
            return res

        # Add Nodes
        builder.add_node("knowledge_rag", process_knowledge)
        builder.add_node("intent_sentiment", process_combined)

        # Flow Edges: knowledge is a prerequisite of the combined analysis.
        builder.set_entry_point("knowledge_rag")
        builder.add_edge("knowledge_rag", "intent_sentiment")
        builder.add_edge("intent_sentiment", END)

        self.workflow = builder.compile()

    def _initial_state(self, session_id: str, customer_message: str, agent_draft: str, feedback_context: str = "") -> AgentState:
        return {
            "session_id": session_id,
            "customer_message": customer_message,
            "agent_draft": agent_draft,
            "feedback_context": feedback_context,
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
            "recommended_action": None,
        }

    def retrieve_citations(self, customer_message: str) -> List[Dict[str, Any]]:
        """Runs the knowledge RAG node only (fast, no LLM) to fetch support
        citations for a customer message. Used by the instant-refine path so
        the knowledge panel fills in before the full LLM refinement lands."""
        return knowledge_agent.retrieve(query=customer_message)

    def run_turn_pipeline(
        self,
        session_id: str,
        customer_message: str,
        agent_draft: str = "",
        feedback_context: str = "",
        knowledge_citations: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        """Executes full multi-agent pipeline for a single conversation turn."""
        initial_state = self._initial_state(session_id, customer_message, agent_draft, feedback_context)
        if knowledge_citations is not None:
            initial_state["knowledge_citations"] = knowledge_citations

        result_state = self.workflow.invoke(initial_state)
        return result_state

    def stream_turn_pipeline(
        self,
        session_id: str,
        customer_message: str,
        agent_draft: str = "",
        feedback_context: str = ""
    ):
        """Executes multi-agent pipeline in streaming mode, yielding node outputs as they complete."""
        initial_state = self._initial_state(session_id, customer_message, agent_draft, feedback_context)

        for output in self.workflow.stream(initial_state):
            yield output

orchestrator = ConversationOrchestrator()
