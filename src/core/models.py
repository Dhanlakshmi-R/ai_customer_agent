from __future__ import annotations

import json
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class InteractionMode(str, Enum):
    SIMULATOR = "simulator"
    MANUAL = "manual"
    REPLAY = "replay"


class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    FRUSTRATED = "frustrated"
    ANGRY = "angry"
    SATISFIED = "satisfied"


class CustomerIntent(str, Enum):
    TECHNICAL_ISSUE = "technical_issue"
    BILLING = "billing"
    ACCOUNT = "account"
    GENERAL_INQUIRY = "general_inquiry"
    COMPLAINT = "complaint"
    FEEDBACK = "feedback"
    CANCELLATION = "cancellation"
    REFUND = "refund"
    OTHER = "other"


class EscalationRisk(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Message(BaseModel):
    role: str  # "customer" | "agent" | "system"
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)

    def model_dump(self) -> dict:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
        }


class Scenario(BaseModel):
    title: str
    customer_persona: str
    problem_description: str
    product_context: str
    emotional_start: SentimentLabel = SentimentLabel.NEUTRAL


class SessionConfig(BaseModel):
    mode: InteractionMode
    scenario: Optional[Scenario] = None
    product_context: str = ""
    agent_name: str = "Agent"
    transcript_path: Optional[str] = None


class IntentAnalysis(BaseModel):
    intent: CustomerIntent
    sentiment: SentimentLabel
    frustration_level: float = Field(ge=0.0, le=1.0)
    satisfaction_trend: float = Field(ge=-1.0, le=1.0)
    reasoning: str = ""


class KnowledgeItem(BaseModel):
    title: str
    content: str
    relevance_score: float = Field(ge=0.0, le=1.0)
    source: str = ""


class CoachingFeedback(BaseModel):
    tone_quality: str = ""
    clarity_score: float = Field(ge=0.0, le=1.0)
    communication_tips: list[str] = []
    suggested_response: str = ""
    response_quality_score: float = Field(ge=0.0, le=1.0)


class EscalationAssessment(BaseModel):
    risk_level: EscalationRisk
    risk_score: float = Field(ge=0.0, le=1.0)
    reasoning: str = ""
    recommended_strategies: list[str] = []


class TurnAnalysis(BaseModel):
    turn_number: int
    customer_message: str
    agent_message: Optional[str] = None
    intent_analysis: Optional[IntentAnalysis] = None
    knowledge_items: list[KnowledgeItem] = []
    coaching_feedback: Optional[CoachingFeedback] = None
    escalation_assessment: Optional[EscalationAssessment] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ResolutionQuality(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    issue_resolved: bool = False
    customer_satisfied: bool = False
    escalation_needed: bool = False


class PerformanceReport(BaseModel):
    session_id: str
    agent_name: str = ""
    interaction_mode: InteractionMode
    total_turns: int = 0
    sentiment_journey: list[dict] = []
    resolution_quality: Optional[ResolutionQuality] = None
    overall_score: float = Field(default=0.0, ge=0.0, le=1.0)
    coaching_recommendations: list[str] = []
    escalation_triggers: list[str] = []
    knowledge_gaps: list[str] = []
    generated_at: datetime = Field(default_factory=datetime.now)


class SessionState(BaseModel):
    session_id: str
    config: SessionConfig
    messages: list[Message] = []
    turn_analyses: list[TurnAnalysis] = []
    current_turn: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)

    def add_message(self, message: Message):
        self.messages.append(message)

    def get_conversation_context(self, window: int = 5) -> str:
        recent = self.messages[-window:] if len(self.messages) > window else self.messages
        return "\n".join(f"{m.role}: {m.content}" for m in recent)

    def model_dump(self) -> dict:
        return {
            "session_id": self.session_id,
            "config": self.config.model_dump() if hasattr(self.config, 'model_dump') else self.config.__dict__,
            "messages": [m.model_dump() for m in self.messages],
            "current_turn": self.current_turn,
            "is_active": self.is_active,
        }
