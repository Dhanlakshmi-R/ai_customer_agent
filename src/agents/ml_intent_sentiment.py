import re
import numpy as np
from src.core.models import CustomerIntent, IntentAnalysis, SentimentLabel


import streamlit as st

@st.cache_resource
def load_sentiment_pipeline(model_name):
    from transformers import pipeline
    return pipeline("sentiment-analysis", model=model_name, device=-1, top_k=None)

@st.cache_resource
def load_emotion_pipeline():
    from transformers import pipeline
    return pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", device=-1, top_k=None)

@st.cache_resource
def load_star_pipeline():
    from transformers import pipeline
    return pipeline("text-classification", model="nlptown/bert-base-multilingual-uncased-sentiment", device=-1, top_k=None)


class MLIntentSentimentAgent:
    """
    Analyzes customer messages to determine their Intent (what they want) 
    and Sentiment (how they feel). 
    Uses HuggingFace transformer pipelines for sentiment and emotion detection.
    """
    def __init__(self):
        # Placeholders for our ML models. They are lazy-loaded on first use to save memory.
        self._sentiment_pipeline = None
        self._emotion_pipeline = None
        self._star_pipeline = None
        self._loaded = False

    def _lazy_load(self):
        """
        Loads the HuggingFace models into memory only when they are first needed.
        This prevents the app from taking a long time to start up initially.
        """
        if self._loaded:
            return
        try:
            from src.core.model_config import ModelConfig
            tier = "medium"
            try:
                if hasattr(st, "session_state") and "ml_tier" in st.session_state:
                    tier = st.session_state.ml_tier
            except Exception:
                pass

            model_info = ModelConfig.get_sentiment_model(tier)
            model_name = model_info["name"]

            self._sentiment_pipeline = load_sentiment_pipeline(model_name)
            self._emotion_pipeline = load_emotion_pipeline()
            self._star_pipeline = load_star_pipeline()

            self._loaded = True
        except Exception:
            self._loaded = False

    def analyze(self, message: str, context: str = "") -> IntentAnalysis:
        """
        Takes a customer's raw message and runs it through regex patterns for intent
        and ML models for sentiment to produce a structured IntentAnalysis report.
        """
        self._lazy_load()
        text = message.lower()

        # 1. Figure out what the customer is asking about (Intent)
        intent = self._detect_intent(text)
        
        # 2. Figure out how they are feeling (Sentiment, Frustration, Satisfaction)
        sentiment, frustration, satisfaction = self._detect_sentiment(message, text)

        # 3. Package the results neatly for the Orchestrator
        return IntentAnalysis(
            intent=intent,
            sentiment=sentiment,
            frustration_level=round(float(np.clip(frustration, 0.0, 1.0)), 2),
            satisfaction_trend=round(float(np.clip(satisfaction, -1.0, 1.0)), 2),
            reasoning=self._build_reasoning(intent, sentiment, frustration),
        )

    def _detect_intent(self, text: str) -> CustomerIntent:
        patterns = {
            CustomerIntent.TECHNICAL_ISSUE: [
                r"\b(crash|error|bug|glitch|broken|failed|freeze)\w*\b",
                r"\b(not working|doesn'?t work|can'?t)\b",
            ],
            CustomerIntent.BILLING: [
                r"\b(bill|charge|payment|invoice|price|cost|overcharged)\b",
                r"\bsubscription fee\b",
            ],
            CustomerIntent.ACCOUNT: [
                r"\b(login|password|account|sign\s?in|access|credential|reset|verify)\b",
                r"\b(locked|blocked|disabled|suspended)\b",
            ],
            CustomerIntent.CANCELLATION: [
                r"\bcancel\w*\b", r"\b(terminate|discontinue|unsubscribe)\b",
            ],
            CustomerIntent.REFUND: [
                r"\b(refund|return|reimburs|money back)\b",
            ],
            CustomerIntent.COMPLAINT: [
                r"\b(complain|terrible|worst|unacceptable|disappoint|ridiculous)\b",
                r"\b(manager|supervisor|escalate|speak to)\b",
            ],
            CustomerIntent.FEEDBACK: [
                r"\b(suggest|recommend|feature request|improve)\w*\b",
                r"\b(would like|wish|missing)\b",
            ],
        }
        scores = {}
        for intent, pats in patterns.items():
            score = sum(1 for p in pats for _ in re.finditer(p, text))
            scores[intent] = score

        if not any(scores.values()):
            return CustomerIntent.GENERAL_INQUIRY
        return max(scores, key=scores.get)

    def _detect_sentiment(self, raw: str, lower: str):
        if self._sentiment_pipeline:
            try:
                return self._ml_sentiment(raw, lower)
            except Exception:
                pass
        return self._fallback_sentiment(lower)

    def _ml_sentiment(self, raw: str, lower: str):
        sentiment_results = self._sentiment_pipeline(raw[:512])
        if isinstance(sentiment_results, list) and isinstance(sentiment_results[0], list):
            sentiment_results = sentiment_results[0]

        neg_score = 0.0
        neu_score = 0.0
        pos_score = 0.0
        for r in sentiment_results:
            label = r["label"].upper()
            score = r["score"]
            if "NEGATIVE" in label or "LABEL_0" in label:
                neg_score = score
            elif "NEUTRAL" in label or "LABEL_1" in label:
                neu_score = score
            elif "POSITIVE" in label or "LABEL_2" in label:
                pos_score = score

        emotion_score = 0.0
        dominant_emotion = "neutral"
        if self._emotion_pipeline:
            try:
                emotion_results = self._emotion_pipeline(raw[:512])
                if isinstance(emotion_results, list) and isinstance(emotion_results[0], list):
                    emotion_results = emotion_results[0]
                for r in emotion_results:
                    if r["label"] in ("anger", "disgust", "fear", "sadness"):
                        emotion_score += r["score"]
                    if r["score"] > emotion_score or dominant_emotion == "neutral":
                        if r["label"] not in ("anger", "disgust", "fear", "sadness"):
                            dominant_emotion = r["label"]
                dominant_emotion = max(emotion_results, key=lambda x: x["score"])["label"]
            except Exception:
                pass

        star_score = 3.0
        if self._star_pipeline:
            try:
                star_results = self._star_pipeline(raw[:512])
                if isinstance(star_results, list) and isinstance(star_results[0], list):
                    star_results = star_results[0]
                weighted_sum = sum(int(r["label"][0]) * r["score"] for r in star_results)
                total_weight = sum(r["score"] for r in star_results)
                if total_weight > 0:
                    star_score = weighted_sum / total_weight
            except Exception:
                pass

        anger_words = ["furious", "outraged", "unacceptable", "appalled",
                       "manager", "lawsuit", "attorney", "never", "worst"]
        frustration_words = ["frustrat", "annoy", "irritat", "tired of",
                             "fed up", "useless", "waste", "sick of"]

        has_anger = any(w in lower for w in anger_words)
        has_frustration = any(w in lower for w in frustration_words)
        caps_ratio = sum(1 for c in raw if c.isupper()) / max(len(raw), 1)
        exclaims = raw.count("!")

        combined_neg = (neg_score * 0.5) + (emotion_score * 0.3) + ((5 - star_score) / 4 * 0.2)

        if combined_neg > 0.6 or neg_score > 0.8:
            if has_anger or (caps_ratio > 0.5 and exclaims > 1) or dominant_emotion == "anger":
                sentiment = SentimentLabel.ANGRY
                frustration = min(1.0, combined_neg * 1.2 + 0.2)
            elif has_frustration or combined_neg > 0.7 or dominant_emotion in ("sadness", "fear"):
                sentiment = SentimentLabel.FRUSTRATED
                frustration = min(1.0, combined_neg * 1.1 + 0.1)
            else:
                sentiment = SentimentLabel.NEGATIVE
                frustration = combined_neg * 0.8
            satisfaction = -combined_neg
        elif pos_score > 0.7 or star_score >= 4.0:
            if pos_score > 0.9 or star_score >= 4.5:
                sentiment = SentimentLabel.SATISFIED
            else:
                sentiment = SentimentLabel.POSITIVE
            frustration = max(0.0, 0.2 - pos_score)
            satisfaction = pos_score
        else:
            sentiment = SentimentLabel.NEUTRAL
            frustration = max(0.0, combined_neg * 0.3)
            satisfaction = 0.0

        return sentiment, frustration, satisfaction

    def _fallback_sentiment(self, text: str):
        neg_words = ["bad", "terrible", "awful", "worst", "hate", "useless",
                     "frustrat", "annoy", "angry", "unacceptable", "horrible"]
        pos_words = ["good", "great", "thanks", "perfect", "excellent", "amazing",
                     "helpful", "appreciate", "happy", "solved", "fixed"]

        neg_count = sum(1 for w in neg_words if w in text)
        pos_count = sum(1 for w in pos_words if w in text)

        if neg_count > pos_count:
            return SentimentLabel.NEGATIVE, 0.5, -0.3
        elif pos_count > neg_count:
            return SentimentLabel.POSITIVE, 0.1, 0.5
        return SentimentLabel.NEUTRAL, 0.0, 0.0

    def _build_reasoning(self, intent: CustomerIntent, sentiment: SentimentLabel, frustration: float):
        models_used = []
        if self._sentiment_pipeline:
            models_used.append("roberta-sentiment")
        if self._emotion_pipeline:
            models_used.append("distilroberta-emotion")
        if self._star_pipeline:
            models_used.append("bert-stars")
        model_str = " + ".join(models_used) if models_used else "fallback"
        return (
            f"Intent: {intent.value} (keyword-matched). "
            f"Sentiment: {sentiment.value} via {model_str} "
            f"(frustration: {frustration:.0%})."
        )
