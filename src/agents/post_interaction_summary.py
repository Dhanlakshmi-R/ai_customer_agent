import json
import os
from datetime import datetime

from src.core.config import settings
from src.core.models import (
    EscalationRisk,
    PerformanceReport,
    ResolutionQuality,
    SessionState,
    TurnAnalysis,
)


class PostInteractionSummaryAgent:
    def generate_report(self, session: SessionState, analyses: list[TurnAnalysis]) -> PerformanceReport:
        total_turns = len(analyses)

        sentiment_journey = []
        escalation_triggers = []
        knowledge_gaps = set()

        for ta in analyses:
            if ta.intent_analysis:
                sentiment_journey.append({
                    "turn": ta.turn_number,
                    "sentiment": ta.intent_analysis.sentiment.value,
                    "frustration": ta.intent_analysis.frustration_level,
                    "satisfaction_trend": ta.intent_analysis.satisfaction_trend,
                })
            if ta.escalation_assessment:
                if ta.escalation_assessment.risk_level in (EscalationRisk.HIGH, EscalationRisk.CRITICAL):
                    escalation_triggers.append(
                        f"Turn {ta.turn_number}: {ta.escalation_assessment.reasoning}"
                    )
            if not ta.knowledge_items:
                knowledge_gaps.add(f"Turn {ta.turn_number}: No relevant knowledge found")

        resolution = self._calculate_resolution_quality(session, analyses)

        overall_score = resolution.score * 0.5 + self._calculate_coaching_score(analyses) * 0.3 + 0.2

        coaching_recommendations = self._generate_coaching_recommendations(analyses)

        report = PerformanceReport(
            session_id=session.session_id,
            agent_name=session.config.agent_name,
            interaction_mode=session.config.mode,
            total_turns=total_turns,
            sentiment_journey=sentiment_journey,
            resolution_quality=resolution,
            overall_score=round(overall_score, 2),
            coaching_recommendations=coaching_recommendations,
            escalation_triggers=escalation_triggers,
            knowledge_gaps=list(knowledge_gaps),
        )

        self._save_report(report)
        return report

    def _calculate_resolution_quality(
        self, session: SessionState, analyses: list[TurnAnalysis]
    ) -> ResolutionQuality:
        if not analyses:
            return ResolutionQuality()

        avg_frustration = 0.0
        final_sentiment_positive = False
        count = 0

        for ta in analyses:
            if ta.intent_analysis:
                avg_frustration += ta.intent_analysis.frustration_level
                count += 1

        if count > 0:
            avg_frustration /= count

        last_ta = analyses[-1] if analyses else None
        if last_ta and last_ta.intent_analysis:
            final_sentiment = last_ta.intent_analysis.sentiment.value
            final_sentiment_positive = final_sentiment in ("positive", "satisfied", "neutral")

        avg_response_quality = 0.0
        resp_count = 0
        for ta in analyses:
            if ta.coaching_feedback:
                avg_response_quality += ta.coaching_feedback.response_quality_score
                resp_count += 1
        if resp_count > 0:
            avg_response_quality /= resp_count

        issue_resolved = final_sentiment_positive and avg_frustration < 0.4
        customer_satisfied = final_sentiment_positive and avg_response_quality > 0.5
        escalation_needed = any(
            ta.escalation_assessment
            and ta.escalation_assessment.risk_level in (EscalationRisk.HIGH, EscalationRisk.CRITICAL)
            for ta in analyses
        )

        score = 0.0
        if issue_resolved:
            score += 0.4
        if customer_satisfied:
            score += 0.3
        if not escalation_needed:
            score += 0.2
        if avg_response_quality > 0.6:
            score += 0.1

        return ResolutionQuality(
            score=round(score, 2),
            issue_resolved=issue_resolved,
            customer_satisfied=customer_satisfied,
            escalation_needed=escalation_needed,
        )

    def _calculate_coaching_score(self, analyses: list[TurnAnalysis]) -> float:
        if not analyses:
            return 0.0
        scores = []
        for ta in analyses:
            if ta.coaching_feedback:
                scores.append(ta.coaching_feedback.response_quality_score)
        return sum(scores) / max(len(scores), 1) if scores else 0.0

    def _generate_coaching_recommendations(self, analyses: list[TurnAnalysis]) -> list[str]:
        recommendations = set()

        high_frustration_turns = 0
        low_clarity_turns = 0
        low_empathy_turns = 0

        for ta in analyses:
            if ta.intent_analysis and ta.intent_analysis.frustration_level > 0.5:
                high_frustration_turns += 1
            if ta.coaching_feedback:
                if ta.coaching_feedback.clarity_score < 0.5:
                    low_clarity_turns += 1
                if ta.coaching_feedback.tone_quality and "empathy" not in ta.coaching_feedback.tone_quality.lower():
                    low_empathy_turns += 1

        if high_frustration_turns > 2:
            recommendations.add("Practice de-escalation techniques earlier in the conversation to reduce frustration buildup.")
        if low_clarity_turns > 2:
            recommendations.add("Work on response clarity — use shorter sentences and avoid technical jargon.")
        if low_empathy_turns > 2:
            recommendations.add("Increase empathetic acknowledgments (e.g., 'I understand', 'I'm sorry this happened').")

        recommendations.add("Review knowledge base responses to identify and fill common knowledge gaps.")
        recommendations.add("Consider role-playing high-stress scenarios to build confidence with difficult customers.")

        return list(recommendations)

    def _save_report(self, report: PerformanceReport):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = f"report_{report.session_id}_{timestamp}.json"
        fpath = os.path.join(settings.reports_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(report.model_dump(), f, indent=2, default=str)
