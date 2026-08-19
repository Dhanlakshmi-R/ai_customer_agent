import json
from typing import Dict, Any

from backend.core.llm import llm_json

INTENT_OPTIONS = [
    "Billing & Refund",
    "Technical Issue",
    "Account Cancellation",
    "Account & Authentication",
    "Product Guidance",
    "General Inquiry",
]
SENTIMENT_OPTIONS = ["Positive", "Neutral", "Negative"]
URGENCY_OPTIONS = ["Low", "Medium", "High"]

SYSTEM_PROMPT = (
    "You are an intent and sentiment analysis agent for customer support coaching.\n"
    "Analyze the customer message and return JSON with exactly these keys:\n"
    '- "intent": one of ' + json.dumps(INTENT_OPTIONS) + "\n"
    '- "sentiment": one of ' + json.dumps(SENTIMENT_OPTIONS) + "\n"
    '- "emotion": short label (e.g. "Frustrated / Angry", "Calm", "Anxious / Worried", "Satisfied")\n'
    '- "urgency": one of ' + json.dumps(URGENCY_OPTIONS) + "\n"
    '- "frustration": float 0.0 to 1.0\n'
    '- "confidence_score": float 0.0 to 1.0\n'
    "Return valid JSON only."
)


class IntentSentimentAgent:
    def analyze(self, text: str) -> Dict[str, Any]:
        """Analyzes text for intent, emotion, sentiment, urgency, frustration, and confidence score."""
        result = self._llm_analyze(text)
        if result:
            return result
        return self._fallback_analyze(text)

    def _llm_analyze(self, text: str) -> Dict[str, Any] | None:
        data = llm_json(SYSTEM_PROMPT, f"Customer message:\n{text}", temperature=0.2)
        if not data:
            return None

        intent = data.get("intent", "General Inquiry")
        if intent not in INTENT_OPTIONS:
            intent = "General Inquiry"

        sentiment = data.get("sentiment", "Neutral")
        if sentiment not in SENTIMENT_OPTIONS:
            sentiment = "Neutral"

        urgency = data.get("urgency", "Low")
        if urgency not in URGENCY_OPTIONS:
            urgency = "Low"

        try:
            frustration = float(data.get("frustration", 0.2))
            frustration = max(0.0, min(1.0, frustration))
        except (TypeError, ValueError):
            frustration = 0.2

        try:
            confidence_score = float(data.get("confidence_score", 0.85))
            confidence_score = round(max(0.0, min(1.0, confidence_score)), 2)
        except (TypeError, ValueError):
            confidence_score = 0.85

        return {
            "intent": intent,
            "sentiment": sentiment,
            "emotion": str(data.get("emotion", "Calm")),
            "urgency": urgency,
            "frustration": frustration,
            "confidence_score": confidence_score,
        }

    def _fallback_analyze(self, text: str) -> Dict[str, Any]:
        lowered = text.lower()

        intent = "General Inquiry"
        if any(w in lowered for w in ["refund", "billing", "charged", "invoice", "payment", "money"]):
            intent = "Billing & Refund"
        elif any(w in lowered for w in ["error", "bug", "crash", "504", "500", "403", "broken", "fail", "slow"]):
            intent = "Technical Issue"
        elif any(w in lowered for w in ["cancel", "close account", "unsubscribe", "downgrade"]):
            intent = "Account Cancellation"
        elif any(w in lowered for w in ["password", "login", "auth", "token", "locked"]):
            intent = "Account & Authentication"
        elif any(w in lowered for w in ["feature", "how to", "where is", "config", "settings"]):
            intent = "Product Guidance"

        sentiment = "Neutral"
        emotion = "Calm"
        frustration = 0.2
        urgency = "Low"

        negative_keywords = [
            "angry", "ridiculous", "unacceptable", "terrible", "slow", "urgent",
            "frustrated", "hate", "waiting", "fail", "broken",
        ]
        urgent_keywords = ["immediately", "asap", "urgent", "now", "critical", "blocked", "halted", "30 minutes"]
        stress_keywords = ["worried", "stressed", "help me", "scared", "fear", "lost"]

        neg_count = sum(1 for w in negative_keywords if w in lowered)
        urg_count = sum(1 for w in urgent_keywords if w in lowered)
        str_count = sum(1 for w in stress_keywords if w in lowered)

        if neg_count >= 2 or (neg_count >= 1 and "!" in text):
            sentiment = "Negative"
            emotion = "Frustrated / Angry"
            frustration = min(0.95, 0.4 + neg_count * 0.15)
        elif str_count >= 1:
            sentiment = "Negative"
            emotion = "Anxious / Worried"
            frustration = 0.65
        elif any(w in lowered for w in ["thanks", "thank you", "great", "awesome", "perfect"]):
            sentiment = "Positive"
            emotion = "Satisfied"
            frustration = 0.05

        if urg_count >= 1 or neg_count >= 2:
            urgency = "High" if urg_count >= 2 or neg_count >= 3 else "Medium"

        confidence_score = round(min(0.98, 0.82 + (len(text.split()) * 0.01)), 2)

        return {
            "intent": intent,
            "sentiment": sentiment,
            "emotion": emotion,
            "urgency": urgency,
            "frustration": frustration,
            "confidence_score": confidence_score,
        }
