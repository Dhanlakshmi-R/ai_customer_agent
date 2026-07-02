import json
import os
from collections import defaultdict

from src.core.config import settings
from src.core.models import CoachingFeedback, SentimentLabel, TurnAnalysis


class CoachCalibrator:
    def __init__(self):
        self._agent_history: dict[str, list[dict]] = {}
        self._calibration_file = os.path.join(settings.data_dir, "coach_calibration.json")
        self._load()

    def record_turn(
        self,
        agent_name: str,
        coaching: CoachingFeedback | None,
        coaching_was_shown: bool,
        next_sentiment: SentimentLabel | None,
    ):
        if agent_name not in self._agent_history:
            self._agent_history[agent_name] = []
        if not coaching:
            return

        self._agent_history[agent_name].append({
            "quality_score": coaching.response_quality_score,
            "was_shown": coaching_was_shown,
            "had_suggestion": bool(coaching.suggested_response),
            "tip_count": len(coaching.communication_tips),
            "next_sentiment": next_sentiment.value if next_sentiment else None,
        })

        self._agent_history[agent_name] = self._agent_history[agent_name][-200:]
        self._save()

    def should_intervene(self, agent_name: str, coaching: CoachingFeedback) -> tuple[bool, float]:
        base_threshold = 0.7

        if agent_name not in self._agent_history or len(self._agent_history[agent_name]) < 5:
            confidence = coaching.response_quality_score
            should_show = confidence < base_threshold
            adjusted_threshold = base_threshold
        else:
            history = self._agent_history[agent_name]
            recent = history[-20:]

            followed_improved = 0
            followed_total = 0
            ignored_declined = 0

            for i in range(len(recent) - 1):
                curr = recent[i]
                next_item = recent[i + 1]
                if curr["was_shown"] and next_item.get("next_sentiment"):
                    followed_total += 1
                    if next_item["next_sentiment"] in ("positive", "satisfied", "neutral"):
                        followed_improved += 1
                elif not curr["was_shown"] and next_item.get("next_sentiment") == "frustrated":
                    ignored_declined += 1

            follow_rate = followed_improved / max(followed_total, 1)
            ignore_rate = ignored_declined / max(len(recent), 1)

            if follow_rate > 0.7:
                adjusted_threshold = 0.8
            elif follow_rate < 0.3:
                adjusted_threshold = 0.5

            if ignore_rate > 0.3:
                adjusted_threshold = max(0.4, adjusted_threshold - 0.1)

            confidence = coaching.response_quality_score * (1 + (follow_rate - 0.5) * 0.2)
            confidence = max(0.0, min(1.0, confidence))
            should_show = confidence < adjusted_threshold

        return should_show, round(confidence, 2)

    def get_agent_stats(self, agent_name: str) -> dict:
        history = self._agent_history.get(agent_name, [])
        if not history:
            return {"sessions": 0}

        recent = history[-20:]
        shown = sum(1 for h in recent if h["was_shown"])
        return {
            "sessions": len(history),
            "coaching_shown": shown,
            "coaching_hidden": len(recent) - shown,
            "avg_quality": round(
                sum(h["quality_score"] for h in recent) / max(len(recent), 1), 2
            ),
            "follow_improve_rate": "learning",
        }

    def _save(self):
        with open(self._calibration_file, "w") as f:
            json.dump(self._agent_history, f, indent=2)

    def _load(self):
        if os.path.exists(self._calibration_file):
            try:
                with open(self._calibration_file, "r") as f:
                    self._agent_history = json.load(f)
            except Exception:
                self._agent_history = {}
