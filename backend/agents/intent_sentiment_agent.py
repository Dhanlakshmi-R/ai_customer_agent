import re
from typing import Dict, Any

class IntentSentimentAgent:
    def analyze(self, text: str) -> Dict[str, Any]:
        """Analyzes text for intent, emotion, sentiment, urgency, frustration, and confidence score."""
        lowered = text.lower()

        # Intent Detection
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

        # Sentiment & Emotion Detection
        sentiment = "Neutral"
        emotion = "Calm"
        frustration = 0.2
        urgency = "Low"

        negative_keywords = ["angry", "ridiculous", "unacceptable", "terrible", "slow", "urgent", "frustrated", "hate", "waiting", "fail", "broken"]
        urgent_keywords = ["immediately", "asap", "urgent", "now", "critical", "blocked", "halted", "30 minutes"]
        stress_keywords = ["worried", "stressed", "help me", "scared", "fear", "lost"]

        neg_count = sum(1 for w in negative_keywords if w in lowered)
        urg_count = sum(1 for w in urgent_keywords if w in lowered)
        str_count = sum(1 for w in stress_keywords if w in lowered)

        if neg_count >= 2 or "!" in text:
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
            "confidence_score": confidence_score
        }
