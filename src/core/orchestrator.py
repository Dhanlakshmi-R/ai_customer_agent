from src.core.models import (
    InteractionMode,
    Message,
    PerformanceReport,
    Scenario,
    SessionState,
    TurnAnalysis,
)
from src.modules.session_config import SessionConfigModule
from src.modules.conversation_manager import ConversationManager
from src.modules.performance_analytics import PerformanceAnalytics
from src.agents.post_interaction_summary import PostInteractionSummaryAgent
from src.agents.customer_simulator import CustomerSimulatorAgent
from src.core.database import database


class Orchestrator:
    """
    The Orchestrator is the central brain of the application. 
    It manages the lifecycle of a coaching session and coordinates 
    communication between all the specialized AI agents.
    """
    def __init__(self):
        # Initialize all the modules and agents needed for the pipeline
        self.session_config_module = SessionConfigModule()
        self.conversation_manager = ConversationManager()
        self.performance_analytics = PerformanceAnalytics()
        self.summary_agent = PostInteractionSummaryAgent()
        self.simulator = CustomerSimulatorAgent()
        
        # Keeps track of the currently running session
        self.active_session: SessionState | None = None

    def start_session(
        self,
        mode: InteractionMode,
        agent_name: str = "Agent",
        product_context: str = "",
        scenario: Scenario | None = None,
        transcript_path: str | None = None,
    ) -> SessionState:
        """
        Kicks off a new coaching session.
        If we are in 'Simulator' mode, it automatically triggers the AI customer 
        to send the first message based on the chosen scenario.
        """
        # Create a fresh session state
        self.active_session = self.session_config_module.create_session(
            mode=mode, agent_name=agent_name, product_context=product_context,
            scenario=scenario, transcript_path=transcript_path,
        )

        # Kickstart the simulator if that mode is selected
        if mode == InteractionMode.SIMULATOR and self.active_session.config.scenario:
            first_msg = self.simulator.generate_first_message(
                self.active_session.config.scenario
            )
            # Process the generated message through our coaching pipeline
            self.conversation_manager.process_customer_message(
                self.active_session, first_msg
            )

        # Persist the session to our database
        database.save_session(self.active_session)
        return self.active_session

    def process_customer_input(self, customer_text: str) -> TurnAnalysis | None:
        if not self.active_session or not self.active_session.is_active:
            return None
        msg = Message(role="customer", content=customer_text)
        turn = self.conversation_manager.process_customer_message(self.active_session, msg)
        database.save_session(self.active_session)
        return turn

    def process_agent_input(self, agent_text: str):
        if not self.active_session or not self.active_session.is_active:
            return
        msg = Message(role="agent", content=agent_text)
        last_turn = (
            self.active_session.turn_analyses[-1]
            if self.active_session.turn_analyses
            else None
        )
        if last_turn:
            self.conversation_manager.process_agent_response(
                self.active_session, msg, last_turn
            )
            coaching = last_turn.coaching_feedback
            should_show, _ = self.conversation_manager.should_show_coaching(
                self.active_session.config.agent_name, coaching
            )
            self.conversation_manager.record_coaching_effect(
                self.active_session.config.agent_name, coaching, should_show, None,
            )
            database.save_session(self.active_session)

    def advance_simulator(self) -> Message | None:
        if not self.active_session or not self.active_session.is_active:
            return None
        last_turn = (
            self.active_session.turn_analyses[-1]
            if self.active_session.turn_analyses
            else None
        )
        if last_turn and last_turn.agent_message is None:
            return None

        if last_turn and last_turn.coaching_feedback:
            coaching = last_turn.coaching_feedback
            agent = self.active_session.config.agent_name

            self.conversation_manager.record_coaching_effect(
                agent, coaching, False, None,
            )

        reply = self.conversation_manager.generate_simulator_reply(
            self.active_session, last_turn
        )
        turn = self.conversation_manager.process_customer_message(
            self.active_session, reply
        )

        if last_turn and last_turn.coaching_feedback:
            self.conversation_manager.record_coaching_effect(
                self.active_session.config.agent_name,
                last_turn.coaching_feedback, False,
                turn.intent_analysis.sentiment if turn and turn.intent_analysis else None,
            )

        database.save_session(self.active_session)
        return reply

    def end_session(self) -> PerformanceReport | None:
        if not self.active_session:
            return None
        self.active_session.is_active = False
        report = self.summary_agent.generate_report(
            self.active_session, self.active_session.turn_analyses
        )
        self.performance_analytics.add_report(report)
        database.save_session(self.active_session)
        database.save_report(report)
        return report

    def get_performance_trends(self) -> dict:
        return self.performance_analytics.get_trends()

    def get_session_history(self) -> list[dict]:
        return database.get_all_sessions()

    def list_scenarios(self) -> dict:
        return self.simulator.list_scenarios()

    def list_transcripts(self) -> list[str]:
        return self.session_config_module.list_replay_transcripts()
