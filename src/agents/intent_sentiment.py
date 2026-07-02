import re
from src.core.models import CustomerIntent, IntentAnalysis, SentimentLabel


class IntentSentimentAgent:
    def __init__(self):
        self._intent_patterns = {
            CustomerIntent.TECHNICAL_ISSUE: [
                r"\b(crash|error|bug|glitch|broken|failed|freeze)\w*\b",
                r"\bnot working\b",
                r"\bdoesn'?t work\b",
                r"\b(can'?t|unable to)\s+\w+",
            ],
            CustomerIntent.BILLING: [
                r"\b(bill|charged|payment|invoice|price|cost|subscription)\b",
                r"\bovercharged\b",
                r"\b(double|incorrect|wrong)\s+charge",
            ],
            CustomerIntent.ACCOUNT: [
                r"\b(login|password|account|sign\s?in|access|credential|reset|verify)\b",
                r"\b(locked|blocked|disabled|suspended)\b",
            ],
            CustomerIntent.CANCELLATION: [
                r"\bcancel\w*\b",
                r"\bterminate|discontinue|unsubscribe\b",
            ],
            CustomerIntent.REFUND: [
                r"\b(refund|return|reimburs|repay)\w*\b",
                r"\bmoney back\b",
            ],
            CustomerIntent.COMPLAINT: [
                r"\b(complain|terrible|worst|unacceptable|disappoint|ridiculous|unbelievable)\w*\b",
                r"\b(manager|supervisor|escalate)\b",
                r"\bspeak to\b",
            ],
            CustomerIntent.FEEDBACK: [
                r"\b(suggest|recommend|improve)\w*\b",
                r"\bfeature request\b",
                r"\b(would like|wish)\b",
            ],
        }

        self._sentiment_keywords = {
            SentimentLabel.ANGRY: [
                r"\b(furious|outraged|livid|infuriated)\w*\b",
                r"\bextremely angry\b",
            ],
            SentimentLabel.FRUSTRATED: [
                r"\b(frustrat|annoy|irritat)\w*\b",
                r"\b(sick of|tired of|fed up|useless|waste of time)\b",
            ],
            SentimentLabel.NEGATIVE: [
                r"\b(bad|poor|awful|horrible|unhappy|displeased|unacceptable|terrible)\b",
                r"\bdissatisfied\b",
            ],
            SentimentLabel.SATISFIED: [
                r"\b(great|perfect|excellent|amazing|wonderful|fantastic|thrilled|delighted)\b",
            ],
            SentimentLabel.POSITIVE: [
                r"\b(good|nice|helpful|thanks|appreciate|solved|fixed|happy)\b",
                r"\bworks now\b",
            ],
        }

    def analyze(self, message: str, context: str = "") -> IntentAnalysis:
        text = message.lower()

        intent_scores = {}
        for intent, patterns in self._intent_patterns.items():
            score = 0
            for pat in patterns:
                matches = re.findall(pat, text)
                score += len(matches)
            intent_scores[intent] = score

        if not any(intent_scores.values()):
            intent = CustomerIntent.GENERAL_INQUIRY
        else:
            intent = max(intent_scores, key=intent_scores.get)

        sentiment_scores = {}
        for sentiment, patterns in self._sentiment_keywords.items():
            score = 0
            for pat in patterns:
                matches = re.findall(pat, text)
                score += len(matches)
            sentiment_scores[sentiment] = score

        if message.count("!") > 2:
            sentiment_scores[SentimentLabel.FRUSTRATED] = sentiment_scores.get(SentimentLabel.FRUSTRATED, 0) + 1
        if message.count("?") > 2:
            sentiment_scores[SentimentLabel.FRUSTRATED] = sentiment_scores.get(SentimentLabel.FRUSTRATED, 0) + 1

        caps_ratio = sum(1 for c in message if c.isupper()) / max(len(message), 1)
        if caps_ratio > 0.6 and len(message) > 10:
            sentiment_scores[SentimentLabel.ANGRY] = sentiment_scores.get(SentimentLabel.ANGRY, 0) + 2

        positive_keywords = len(re.findall(r"\b(thanks|thank|appreciate|helpful|great|good|yes|solved|works)\b", text))
        negative_keywords = len(re.findall(r"\b(no|not|can'?t|won'?t|don'?t|doesn'?t|never|nothing|worst|bad|terrible)\b", text))

        if not any(sentiment_scores.values()):
            if positive_keywords > negative_keywords:
                sentiment = SentimentLabel.POSITIVE
            elif negative_keywords > positive_keywords:
                sentiment = SentimentLabel.NEGATIVE
            else:
                sentiment = SentimentLabel.NEUTRAL
        else:
            sentiment = max(sentiment_scores, key=sentiment_scores.get)

        frustration_level = 0.0
        if sentiment in (SentimentLabel.FRUSTRATED, SentimentLabel.ANGRY):
            base = 0.4 if sentiment == SentimentLabel.FRUSTRATED else 0.6
            frustration_level = min(1.0, base + (
                sum(sentiment_scores.values()) * 0.1 +
                (negative_keywords / max(len(text.split()), 1)) * 2
            ))

        satisfaction_trend = 0.0
        if positive_keywords > 0 or sentiment in (SentimentLabel.SATISFIED, SentimentLabel.POSITIVE):
            satisfaction_trend = min(1.0, positive_keywords * 0.3)
        if negative_keywords > 0 or sentiment in (SentimentLabel.FRUSTRATED, SentimentLabel.ANGRY):
            satisfaction_trend = max(-1.0, -negative_keywords * 0.3)

        return IntentAnalysis(
            intent=intent,
            sentiment=sentiment,
            frustration_level=round(frustration_level, 2),
            satisfaction_trend=round(satisfaction_trend, 2),
            reasoning=f"Detected intent '{intent.value}' based on keyword patterns. "
                      f"Sentiment classified as '{sentiment.value}' with frustration at {frustration_level:.0%}.",
        )
