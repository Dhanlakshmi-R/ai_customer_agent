"""Post-interaction summary agent for the FastAPI coaching workflow."""

import json
from typing import Any, Dict, List

from backend.core.llm import llm_json


SUMMARY_LIST_FIELDS = (
    "agent_strengths",
    "agent_improvements",
    "coaching_recommendations",
    "follow_up_actions",
)

SYSTEM_PROMPT = (
    "You are a post-interaction coaching summary agent. "
    "Return valid JSON with exactly these keys:\n"
    '- "conversation_summary": concise interaction summary\n'
    '- "customer_sentiment_summary": concise sentiment and emotion summary\n'
    '- "agent_strengths": array of 2-3 demonstrated strengths\n'
    '- "agent_improvements": array of 2-3 improvement opportunities\n'
    '- "coaching_recommendations": array of 2-3 actionable coaching recommendations\n'
    '- "follow_up_actions": array of 1-3 appropriate next actions\n'
    "Use only the supplied interaction context."
)


class SummaryAgent:
    """Creates a structured coaching summary, with a report-compatible fallback."""

    def summarize(
        self,
        *,
        customer_message: str,
        intent: str,
        sentiment: str,
        emotion: str,
        escalation_risk: str,
        suggested_reply: str,
        tone_score: float,
        grammar_score: float,
        empathy_score: float,
    ) -> Dict[str, Any]:
        result = self._llm_summarize(
            customer_message=customer_message,
            intent=intent,
            sentiment=sentiment,
            emotion=emotion,
            escalation_risk=escalation_risk,
            suggested_reply=suggested_reply,
            tone_score=tone_score,
            grammar_score=grammar_score,
            empathy_score=empathy_score,
        )
        if result:
            return result
        return self._fallback_summary(
            intent=intent,
            sentiment=sentiment,
            emotion=emotion,
            escalation_risk=escalation_risk,
            tone_score=tone_score,
            grammar_score=grammar_score,
            empathy_score=empathy_score,
        )

    def _llm_summarize(self, **context: Any) -> Dict[str, Any] | None:
        user = "Interaction context:\n" + json.dumps(context, ensure_ascii=False)
        data = llm_json(SYSTEM_PROMPT, user, temperature=0.2)
        if not data:
            return None

        conversation_summary = str(data.get("conversation_summary", "")).strip()
        sentiment_summary = str(data.get("customer_sentiment_summary", "")).strip()
        if not conversation_summary or not sentiment_summary:
            return None

        normalized: Dict[str, Any] = {
            "conversation_summary": conversation_summary,
            "customer_sentiment_summary": sentiment_summary,
        }
        for field in SUMMARY_LIST_FIELDS:
            value = data.get(field)
            if not isinstance(value, list) or not value:
                return None
            normalized[field] = [str(item).strip() for item in value[:5] if str(item).strip()]
            if not normalized[field]:
                return None
        return normalized

    def _fallback_summary(
        self,
        *,
        intent: str,
        sentiment: str,
        emotion: str,
        escalation_risk: str,
        tone_score: float,
        grammar_score: float,
        empathy_score: float,
    ) -> Dict[str, Any]:
        """Mirror the existing report's deterministic guidance when no LLM is available."""
        return {
            "conversation_summary": (
                f"The interaction concerns a {intent.lower()} request. "
                f"Current response quality scores are tone {tone_score:.0f}%, "
                f"grammar {grammar_score:.0f}%, and empathy {empathy_score:.0f}%."
            ),
            "customer_sentiment_summary": (
                f"Customer sentiment is {sentiment.lower()} with {emotion.lower()} emotion; "
                f"the escalation risk is {escalation_risk.lower()}."
            ),
            "agent_strengths": [
                "Maintained professional communication standards.",
                "Used available support guidance to progress the interaction.",
                "Provided a clear next step for the customer.",
            ],
            "agent_improvements": [
                "Confirm important verification details promptly.",
                "Proactively state the expected follow-up timeline.",
            ],
            "coaching_recommendations": [
                "Use empathy statements early when frustration is elevated.",
                "Reference relevant troubleshooting or policy steps clearly.",
                "Confirm resolution before closing the interaction.",
            ],
            "follow_up_actions": [
                "Confirm whether the customer issue is resolved.",
                "Document the outcome and any promised follow-up.",
            ],
        }


summary_agent = SummaryAgent()
