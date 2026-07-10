from src.core.models import EscalationAssessment, EscalationRisk, IntentAnalysis, SessionState


class EscalationMonitorAgent:
    def assess(
        self,
        session: SessionState,
        intent_analysis: IntentAnalysis | None,
    ) -> EscalationAssessment:
        risk_score = 0.0
        reasoning_parts = []
        strategies = []

        if intent_analysis:
            risk_score += intent_analysis.frustration_level * 0.4
            if intent_analysis.frustration_level > 0.5:
                reasoning_parts.append(f"High frustration level detected ({intent_analysis.frustration_level:.0%})")
                strategies.append("Acknowledge the customer's frustration explicitly")
                strategies.append("Use empathetic language and avoid scripted responses")

            if intent_analysis.sentiment.value in ("angry", "frustrated", "negative"):
                risk_score += 0.2
                reasoning_parts.append(f"Negative sentiment ({intent_analysis.sentiment.value})")
                strategies.append("Stay calm and avoid being defensive")

            if intent_analysis.satisfaction_trend < -0.3:
                risk_score += 0.15
                reasoning_parts.append("Declining satisfaction trend")
                strategies.append("Proactively offer solutions instead of explanations")

        context = session.get_conversation_context(window=5)
        context_lower = context.lower()

        escalation_keywords = [
            "manager", "supervisor", "escalate", "complaint", "lawsuit",
            "attorney", "legal", "refund now", "cancel now", "speak to",
        ]
        keyword_matches = [kw for kw in escalation_keywords if kw in context_lower]
        if keyword_matches:
            risk_score += len(keyword_matches) * 0.1
            reasoning_parts.append(f"Escalation keywords detected: {', '.join(keyword_matches)}")
            strategies.append("Offer to connect with a supervisor if the customer insists")

        turn_count = len(session.messages) // 2
        if turn_count >= 6:
            risk_score += 0.1
            reasoning_parts.append(f"Extended interaction ({turn_count} turns without resolution)")
            strategies.append("Summarize what has been done so far and propose next steps clearly")

        duplicate_concerns = sum(1 for m in session.messages if m.role == "customer")
        if duplicate_concerns > 4:
            risk_score += 0.05
            reasoning_parts.append("Customer is repeating concerns — previous responses may not have addressed the issue")

        risk_score = min(risk_score, 1.0)

        thresholds = getattr(session.config, "risk_threshold", 0.7)
        high_threshold = thresholds
        critical_threshold = min(thresholds + 0.15, 1.0)

        if risk_score >= critical_threshold:
            risk_level = EscalationRisk.CRITICAL
            strategies.append("IMMEDIATE: Notify supervisor and transfer to senior support")
        elif risk_score >= high_threshold:
            risk_level = EscalationRisk.HIGH
            strategies.append("Alert team lead for monitoring")
            strategies.append("Prepare escalation handoff summary")
        elif risk_score >= 0.3:
            risk_level = EscalationRisk.MEDIUM
            strategies.append("Monitor closely — respond with extra care")
        else:
            risk_level = EscalationRisk.LOW

        return EscalationAssessment(
            risk_level=risk_level,
            risk_score=round(risk_score, 2),
            reasoning="; ".join(reasoning_parts) if reasoning_parts else "No significant escalation indicators detected.",
            recommended_strategies=strategies,
        )
