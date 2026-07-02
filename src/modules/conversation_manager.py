from src.core.models import (
    CoachingFeedback,
    IntentAnalysis,
    Message,
    SessionState,
    TurnAnalysis,
)

from src.agents.customer_simulator import CustomerSimulatorAgent
from src.agents.ml_intent_sentiment import MLIntentSentimentAgent
from src.agents.knowledge_recommendation import KnowledgeRecommendationAgent
from src.agents.coaching_suggestion import CoachingSuggestionAgent
from src.agents.escalation_monitor import EscalationMonitorAgent
from src.agents.coach_calibrator import CoachCalibrator


class ConversationManager:
    """
    Manages the logic for each turn of the conversation.
    This class invokes the appropriate agents (Intent, Knowledge, Coaching, Escalation)
    whenever a new message is received from either the customer or the support agent.
    """
    def __init__(self):
        # Initialize the specialized agents used during the live conversation
        self.simulator = CustomerSimulatorAgent()
        self.intent_agent = MLIntentSentimentAgent()
        self.knowledge_agent = KnowledgeRecommendationAgent()
        self.coaching_agent = CoachingSuggestionAgent()
        self.escalation_agent = EscalationMonitorAgent()
        self.calibrator = CoachCalibrator()
        
        # Configuration flag for humor mode (easter egg)
        self.humor_mode = False

    def process_customer_message(
        self, session: SessionState, customer_message: Message
    ) -> TurnAnalysis:
        """
        Processes an incoming message from the customer.
        Runs the message through our NLP and RAG pipelines to generate coaching tips
        and escalate if necessary.
        """
        session.add_message(customer_message)
        session.current_turn += 1
        context = session.get_conversation_context()

        # 1. Analyze the customer's intent and emotional state
        intent_analysis = self.intent_agent.analyze(customer_message.content, context)
        
        # 2. Retrieve relevant articles using Agentic RAG
        knowledge_items = self.knowledge_agent.recommend(customer_message.content)
        
        # 3. Generate proactive coaching advice for the agent
        coaching = self._generate_coaching(session, customer_message, intent_analysis)
        
        # 4. Assess if the customer is becoming a flight risk
        escalation = self.escalation_agent.assess(session, intent_analysis)

        # Package the analysis into a single Turn object
        turn_analysis = TurnAnalysis(
            turn_number=session.current_turn,
            customer_message=customer_message.content,
            intent_analysis=intent_analysis,
            knowledge_items=knowledge_items,
            coaching_feedback=coaching,
            escalation_assessment=escalation,
        )
        session.turn_analyses.append(turn_analysis)
        return turn_analysis

    def process_agent_response(
        self, session: SessionState, agent_message: Message, last_turn_analysis: TurnAnalysis
    ):
        session.add_message(agent_message)
        last_turn_analysis.agent_message = agent_message.content
        last_turn_analysis.coaching_feedback = self.coaching_agent.analyze_response(
            Message(role="customer", content=last_turn_analysis.customer_message),
            agent_message,
            last_turn_analysis.intent_analysis,
            humor_mode=self.humor_mode,
        )

    def _generate_coaching(
        self, session: SessionState, customer_message: Message, intent_analysis: IntentAnalysis,
    ) -> CoachingFeedback:
        return self.coaching_agent.analyze_response(customer_message, None, intent_analysis, humor_mode=self.humor_mode)

    def should_show_coaching(
        self, agent_name: str, coaching: CoachingFeedback
    ) -> tuple[bool, float]:
        return self.calibrator.should_intervene(agent_name, coaching)

    def record_coaching_effect(
        self,
        agent_name: str,
        coaching: CoachingFeedback | None,
        was_shown: bool,
        next_sentiment=None,
    ):
        self.calibrator.record_turn(agent_name, coaching, was_shown, next_sentiment)

    def generate_simulator_reply(self, session: SessionState, last_turn: TurnAnalysis) -> Message:
        scenario = session.config.scenario
        prev_sentiment = (
            last_turn.intent_analysis.sentiment
            if last_turn and last_turn.intent_analysis
            else (scenario.emotional_start if scenario else None)
        )
        agent_quality = (
            last_turn.coaching_feedback.response_quality_score
            if last_turn and last_turn.coaching_feedback
            else 0.5
        )
        hinglish = getattr(self, "hinglish_mode", False)
        return self.simulator.generate_reply(
            scenario, session.get_conversation_context(), prev_sentiment, agent_quality, hinglish_mode=hinglish
        )
