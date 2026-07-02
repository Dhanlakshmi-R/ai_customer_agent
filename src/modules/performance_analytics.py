import json
import os
from collections import defaultdict

from src.core.config import settings
from src.core.models import PerformanceReport


class PerformanceAnalytics:
    def __init__(self):
        self.sessions: dict[str, PerformanceReport] = {}
        self._load_reports()

    def add_report(self, report: PerformanceReport):
        self.sessions[report.session_id] = report

    def get_trends(self) -> dict:
        if not self.sessions:
            return {
                "total_sessions": 0,
                "avg_resolution_score": 0.0,
                "avg_overall_score": 0.0,
                "common_escalation_triggers": [],
                "common_knowledge_gaps": [],
                "agent_improvement_areas": [],
                "score_history": [],
            }

        scores = [r.overall_score for r in self.sessions.values()]
        resolution_scores = [
            r.resolution_quality.score
            for r in self.sessions.values()
            if r.resolution_quality
        ]

        all_triggers = defaultdict(int)
        all_gaps = defaultdict(int)
        all_recommendations = defaultdict(int)

        for r in self.sessions.values():
            for t in r.escalation_triggers:
                all_triggers[t] += 1
            for g in r.knowledge_gaps:
                all_gaps[g] += 1
            for rec in r.coaching_recommendations:
                all_recommendations[rec] += 1

        return {
            "total_sessions": len(self.sessions),
            "avg_resolution_score": round(
                sum(resolution_scores) / max(len(resolution_scores), 1), 2
            ),
            "avg_overall_score": round(sum(scores) / max(len(scores), 1), 2),
            "common_escalation_triggers": sorted(
                all_triggers.items(), key=lambda x: -x[1]
            )[:5],
            "common_knowledge_gaps": sorted(
                all_gaps.items(), key=lambda x: -x[1]
            )[:5],
            "agent_improvement_areas": sorted(
                all_recommendations.items(), key=lambda x: -x[1]
            )[:5],
            "score_history": [
                {"session": r.session_id, "score": r.overall_score}
                for r in sorted(
                    self.sessions.values(),
                    key=lambda x: x.generated_at,
                )
            ],
        }

    def _load_reports(self):
        if not os.path.isdir(settings.reports_dir):
            return
        for fname in os.listdir(settings.reports_dir):
            if fname.startswith("report_") and fname.endswith(".json"):
                fpath = os.path.join(settings.reports_dir, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    self.sessions[data.get("session_id", fname)] = PerformanceReport(**data)
                except Exception:
                    pass
