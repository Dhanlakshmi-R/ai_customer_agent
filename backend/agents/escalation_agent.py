from typing import Dict, Any, List

from backend.core.llm import llm_json

RISK_LEVELS = ["Low", "Medium", "High", "Critical"]

SYSTEM_PROMPT = (
    "You are an escalation risk monitor for customer support coaching.\n"
    "Assess whether this customer interaction needs escalation.\n"
    "Return JSON with exactly these keys:\n"
    '- "escalation_risk": one of ["Low", "Medium", "High", "Critical"]\n'
    '- "reason": brief explanation string\n'
    '- "recommended_action": specific next action for the support agent\n'
    "Return valid JSON only."
)


class EscalationRiskAgent:
    def evaluate_risk(
        self,
        intent: str,
        sentiment: str,
        frustration: float,
        urgency: str,
        customer_message: str,
    ) -> Dict[str, Any]:
        """Calculates escalation risk level, reasoning, and recommended action."""
        result = self._llm_evaluate_risk(
            intent=intent,
            sentiment=sentiment,
            frustration=frustration,
            urgency=urgency,
            customer_message=customer_message,
        )
        if result:
            return result
        return self._fallback_evaluate_risk(
            intent=intent,
            sentiment=sentiment,
            frustration=frustration,
            urgency=urgency,
            customer_message=customer_message,
        )

    def _llm_evaluate_risk(
        self,
        intent: str,
        sentiment: str,
        frustration: float,
        urgency: str,
        customer_message: str,
    ) -> Dict[str, Any] | None:
        user = (
            f"Customer message: {customer_message}\n"
            f"Intent: {intent}\n"
            f"Sentiment: {sentiment}\n"
            f"Frustration: {frustration}\n"
            f"Urgency: {urgency}"
        )
        data = llm_json(SYSTEM_PROMPT, user, temperature=0.2)
        if not data:
            return None

        risk_level = data.get("escalation_risk", "Low")
        if risk_level not in RISK_LEVELS:
            risk_level = "Low"

        reason = str(data.get("reason", "")).strip()
        recommended_action = str(data.get("recommended_action", "")).strip()
        if not reason or not recommended_action:
            return None

        return {
            "escalation_risk": risk_level,
            "reason": reason,
            "recommended_action": recommended_action,
        }

    def _fallback_evaluate_risk(
        self,
        intent: str,
        sentiment: str,
        frustration: float,
        urgency: str,
        customer_message: str,
    ) -> Dict[str, Any]:
        lowered = customer_message.lower()

        risk_level = "Low"
        reason = "Customer intent and emotion are within normal handling thresholds."
        recommended_action = "Continue standard support dialogue and provide knowledge base guidance."

        if any(w in lowered for w in ["supervisor", "manager", "legal", "lawyer", "cancel account", "sue", "unacceptable"]):
            risk_level = "Critical"
            reason = "Customer explicitly requested supervisor escalation or mentioned legal/cancellation risk."
            recommended_action = "Manager escalation recommendation: Alert Shift Supervisor immediately and offer priority Callback."

        elif frustration >= 0.7 or (sentiment == "Negative" and urgency == "High"):
            risk_level = "High"
            reason = "High customer frustration level and urgent dissatisfaction detected."
            if intent == "Billing & Refund":
                recommended_action = "Refund recommendation: Issue immediate billing review credit or expedite refund approval."
            elif intent == "Technical Issue":
                recommended_action = "Technical specialist recommendation: Transfer ticket to Tier 2 Engineering Specialist."
            else:
                recommended_action = "Manager escalation recommendation: Notify Lead Support Specialist for co-browsing support."

        elif frustration >= 0.4 or sentiment == "Negative":
            risk_level = "Medium"
            reason = "Customer displays mild frustration or confusion."
            recommended_action = "Provide empathetic reassurance and check for understanding before offering solutions."

        return {
            "escalation_risk": risk_level,
            "reason": reason,
            "recommended_action": recommended_action,
        }
