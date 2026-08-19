from typing import Dict, Any, List

from backend.core.llm import llm_json

RISK_LEVELS = ["Low", "Medium", "High", "Critical"]

SYSTEM_PROMPT = (
    "You are a customer support coaching AI analyzing one customer message in a single pass.\n"
    "Return JSON with exactly these keys:\n"
    '- "intent": one of ["Billing & Refund", "Technical Issue", "Account Cancellation", "Account & Authentication", "Product Guidance", "General Inquiry"]\n'
    '- "sentiment": one of ["Positive", "Neutral", "Negative"]\n'
    '- "emotion": short label (e.g. "Frustrated / Angry", "Calm", "Anxious / Worried", "Satisfied")\n'
    '- "urgency": one of ["Low", "Medium", "High"]\n'
    '- "frustration": float 0.0 to 1.0\n'
    '- "confidence_score": float 0.0 to 1.0\n'
    '- "tone_score": float 0-100\n'
    '- "grammar_score": float 0-100\n'
    '- "empathy_score": float 0-100\n'
    '- "suggested_reply": concise professional support agent reply (AT MOST 2 short sentences, maximum 30 words, maximum 220 characters)\n'
    '- "reasoning": brief explanation of why this reply works (1 sentence)\n'
    '- "improvement_tips": array of 2-3 short actionable coaching tips\n'
    '- "escalation_risk": one of ["Low", "Medium", "High", "Critical"]\n'
    '- "escalation_reason": brief string\n'
    '- "recommended_action": specific next action for the support agent\n'
    "Tailor everything to the customer's exact words, emotion, urgency and frustration level. "
    "Never invent facts. Keep the suggested reply short and natural. Return valid JSON only."
)


class CombinedAnalysisAgent:
    """Single-call analysis: intent, sentiment, coaching scores and escalation in
    one LLM request so a turn finishes in roughly one API round-trip instead of
    3-4 serial calls."""

    def analyze(
        self,
        customer_message: str,
        agent_draft: str = "",
        knowledge_citations: List[Dict[str, Any]] = None,
        feedback_context: str = "",
    ) -> Dict[str, Any]:
        try:
            result = self._llm_analyze(customer_message, agent_draft, knowledge_citations, feedback_context)
        except Exception:
            result = None
        if result:
            return result
        return self._rule_based(customer_message, agent_draft, knowledge_citations)

    def _llm_analyze(
        self,
        customer_message: str,
        agent_draft: str,
        knowledge_citations: List[Dict[str, Any]],
        feedback_context: str,
    ) -> Dict[str, Any] | None:
        citations_text = "\n".join(
            f"- {c.get('title', 'Article')}: {c.get('snippet', '')[:200]}"
            for c in (knowledge_citations or [])[:3]
        ) or "No knowledge base citations available."

        user = (
            f"Customer message: {customer_message}\n"
            f"Agent draft: {agent_draft or '(none - generate proactive coaching)'}\n"
            f"Knowledge citations:\n{citations_text}"
        )
        if feedback_context:
            user += f"\n\nFeedback from other agents:\n{feedback_context}\nFollow it to refine your recommendation."

        data = llm_json(SYSTEM_PROMPT, user, temperature=0.3)
        if not data:
            return None

        suggested_reply = str(data.get("suggested_reply", "")).strip()
        reasoning = str(data.get("reasoning", "")).strip()
        tips = data.get("improvement_tips", [])
        recommended_action = str(data.get("recommended_action", "")).strip()
        escalation_reason = str(data.get("escalation_reason", "")).strip()
        if not suggested_reply or not reasoning or not isinstance(tips, list) or not tips or not recommended_action:
            return None

        try:
            tone_score = float(data.get("tone_score", 85.0))
            grammar_score = float(data.get("grammar_score", 85.0))
            empathy_score = float(data.get("empathy_score", 85.0))
            frustration = float(data.get("frustration", 0.2))
            confidence_score = float(data.get("confidence_score", 0.85))
        except (TypeError, ValueError):
            return None

        risk_level = data.get("escalation_risk", "Low")
        if risk_level not in RISK_LEVELS:
            risk_level = "Low"

        intent = data.get("intent", "General Inquiry")
        if intent not in {
            "Billing & Refund", "Technical Issue", "Account Cancellation",
            "Account & Authentication", "Product Guidance", "General Inquiry",
        }:
            intent = "General Inquiry"

        sentiment = data.get("sentiment", "Neutral")
        if sentiment not in {"Positive", "Neutral", "Negative"}:
            sentiment = "Neutral"

        urgency = data.get("urgency", "Low")
        if urgency not in {"Low", "Medium", "High"}:
            urgency = "Low"

        return {
            "intent": intent,
            "sentiment": sentiment,
            "emotion": str(data.get("emotion", "Calm")),
            "urgency": urgency,
            "frustration": max(0.0, min(1.0, frustration)),
            "confidence_score": round(max(0.0, min(1.0, confidence_score)), 2),
            "tone_score": max(0.0, min(100.0, tone_score)),
            "grammar_score": max(0.0, min(100.0, grammar_score)),
            "empathy_score": max(0.0, min(100.0, empathy_score)),
            "suggested_reply": self._trim(suggested_reply, max_words=30, max_chars=220),
            "reasoning": self._trim(reasoning, max_words=30, max_chars=220),
            "improvement_tips": [str(t) for t in tips[:3]],
            "escalation_risk": risk_level,
            "escalation_reason": self._trim(escalation_reason, max_words=25, max_chars=200) if escalation_reason else "Customer displays elevated concern.",
            "recommended_action": self._trim(recommended_action, max_words=30, max_chars=220),
            "knowledge_citations": knowledge_citations or [],
        }

    @staticmethod
    def _trim(text: str, max_words: int = 30, max_chars: int = 220) -> str:
        text = " ".join(str(text).split())
        if len(text) <= max_chars and len(text.split()) <= max_words:
            return text
        words = text.split()
        if len(words) > max_words:
            text = " ".join(words[:max_words])
        if len(text) > max_chars:
            cut = text.rfind(" ", 0, max_chars)
            text = text[:cut if cut > max_chars * 0.6 else max_chars]
        return text.rstrip(" .") + "." if text else text

    def _rule_based(self, customer_message: str, agent_draft: str, knowledge_citations: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        lowered = customer_message.lower()

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

        if neg_count >= 2 or (neg_count >= 1 and "!" in customer_message):
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

        confidence_score = round(min(0.98, 0.82 + (len(customer_message.split()) * 0.01)), 2)

        escalation_risk = "Low"
        escalation_reason = "Customer intent and emotion are within normal handling thresholds."
        recommended_action = "Continue standard support dialogue and provide knowledge base guidance."

        if any(w in lowered for w in ["supervisor", "manager", "legal", "lawyer", "cancel account", "sue", "unacceptable"]):
            escalation_risk = "Critical"
            escalation_reason = "Customer explicitly requested supervisor escalation or mentioned legal/cancellation risk."
            recommended_action = "Manager escalation recommendation: Alert Shift Supervisor immediately and offer priority Callback."
        elif frustration >= 0.7 or (sentiment == "Negative" and urgency == "High"):
            escalation_risk = "High"
            escalation_reason = "High customer frustration level and urgent dissatisfaction detected."
            if intent == "Billing & Refund":
                recommended_action = "Refund recommendation: Issue immediate billing review credit or expedite refund approval."
            elif intent == "Technical Issue":
                recommended_action = "Technical specialist recommendation: Transfer ticket to Tier 2 Engineering Specialist."
            else:
                recommended_action = "Manager escalation recommendation: Notify Lead Support Specialist for co-browsing support."
        elif frustration >= 0.4 or sentiment == "Negative":
            escalation_risk = "Medium"
            escalation_reason = "Customer displays mild frustration or confusion."
            recommended_action = "Provide empathetic reassurance and check for understanding before offering solutions."

        if agent_draft:
            draft_lower = agent_draft.lower()
            empathy_score = 96.0 if ("sorry" in draft_lower or "apologize" in draft_lower or "understand" in draft_lower) else 70.0
            grammar_score = 75.0 if len(agent_draft.split()) < 5 else 95.0
            tone_score = 70.0 if len(agent_draft.split()) < 5 else 92.0
        else:
            empathy_score = 88.0
            grammar_score = 95.0
            tone_score = 92.0

        suggested_reply = {
            "Billing & Refund": (
                "I understand how concerning an unexpected charge can be. Let me immediately review your account details "
                "and initiate a refund verification process with our billing department. Could you confirm the transaction ID or invoice number?"
            ),
            "Technical Issue": (
                "Thank you for sharing those details. Let's check your connection settings and payload headers step by step. "
                "First, please verify if your API token is included in the request header."
            ),
            "Account Cancellation": (
                "I am sorry to hear you're considering canceling your account. Before we proceed, I would love to see if "
                "we can resolve any issues you have experienced. If you still wish to proceed, I can guide you through the process right away."
            ),
        }.get(intent, (
            "Thank you for contacting us today! I would be happy to help resolve this for you. "
            "Let me look into the details right now and walk you through the resolution."
        ))

        return {
            "intent": intent,
            "sentiment": sentiment,
            "emotion": emotion,
            "urgency": urgency,
            "frustration": frustration,
            "confidence_score": confidence_score,
            "tone_score": tone_score,
            "grammar_score": grammar_score,
            "empathy_score": empathy_score,
            "suggested_reply": self._trim(suggested_reply, max_words=40, max_chars=260),
            "reasoning": "Provides empathetic acknowledgment and a clear, actionable path to resolution.",
            "improvement_tips": [
                "Acknowledge the concern first",
                "State a concrete next step or timeline",
                "Confirm the customer before closing",
            ],
            "escalation_risk": escalation_risk,
            "escalation_reason": escalation_reason,
            "recommended_action": recommended_action,
            "knowledge_citations": knowledge_citations or [],
        }


combined_agent = CombinedAnalysisAgent()