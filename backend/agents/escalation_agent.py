from typing import Dict, Any

class EscalationRiskAgent:
    def evaluate_risk(
        self,
        intent: str,
        sentiment: str,
        frustration: float,
        urgency: str,
        customer_message: str
    ) -> Dict[str, Any]:
        """Calculates escalation risk level, reasoning, and recommended action."""
        
        lowered = customer_message.lower()

        risk_level = "Low"
        reason = "Customer intent and emotion are within normal handling thresholds."
        recommended_action = "Continue standard support dialogue and provide knowledge base guidance."

        # High/Critical risk triggers
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
            "recommended_action": recommended_action
        }
