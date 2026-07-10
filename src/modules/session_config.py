import json
import os
import uuid
from src.core.models import (
    InteractionMode,
    Scenario,
    SentimentLabel,
    SessionConfig,
    SessionState,
)
from src.core.config import settings


class SessionConfigModule:
    def create_session(
        self,
        mode: InteractionMode,
        agent_name: str = "Agent",
        product_context: str = "",
        scenario: Scenario | None = None,
        transcript_path: str | None = None,
        risk_threshold: float = 0.7,
    ) -> SessionState:
        session_id = f"sess_{uuid.uuid4().hex[:8]}"

        config = SessionConfig(
            mode=mode,
            agent_name=agent_name,
            product_context=product_context,
            scenario=scenario,
            transcript_path=transcript_path,
        )

        config.risk_threshold = risk_threshold
        return SessionState(session_id=session_id, config=config)

    def create_scenario(
        self,
        title: str,
        problem_description: str = "",
        customer_persona: str = "",
        product_context: str = "",
        emotional_start: str = "neutral",
    ) -> Scenario:
        emotional_map = {
            "neutral": SentimentLabel.NEUTRAL,
            "frustrated": SentimentLabel.FRUSTRATED,
            "angry": SentimentLabel.ANGRY,
            "satisfied": SentimentLabel.SATISFIED,
            "positive": SentimentLabel.POSITIVE,
            "negative": SentimentLabel.NEGATIVE,
        }

        return Scenario(
            title=title,
            problem_description=problem_description or title,
            customer_persona=customer_persona or "Standard customer",
            product_context=product_context,
            emotional_start=emotional_map.get(emotional_start.lower(), SentimentLabel.NEUTRAL),
        )

    def load_real_scenarios(self) -> list[dict]:
        scenarios_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "scenarios.json")
        if not os.path.exists(scenarios_path):
            return []
        with open(scenarios_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def create_scenario_from_real(self, real_scenario: dict) -> Scenario:
        return Scenario(
            title=real_scenario["title"],
            problem_description=real_scenario.get("problem_description", ""),
            customer_persona=real_scenario.get("customer_persona", "Customer"),
            product_context=real_scenario.get("product_context", "Infosys Springboard"),
            emotional_start={
                "neutral": SentimentLabel.NEUTRAL,
                "frustrated": SentimentLabel.FRUSTRATED,
                "angry": SentimentLabel.ANGRY,
                "satisfied": SentimentLabel.SATISFIED,
                "positive": SentimentLabel.POSITIVE,
                "negative": SentimentLabel.NEGATIVE,
            }.get(real_scenario.get("emotional_start", "neutral"), SentimentLabel.NEUTRAL),
        )

    def list_replay_transcripts(self) -> list[str]:
        if not os.path.isdir(settings.transcripts_dir):
            return []
        return [
            f for f in os.listdir(settings.transcripts_dir)
            if f.endswith((".json", ".txt"))
        ]

    def load_transcript(self, filename: str) -> list[dict]:
        fpath = os.path.join(settings.transcripts_dir, filename)
        if not os.path.exists(fpath):
            return []

        ext = os.path.splitext(filename)[1].lower()
        if ext == ".json":
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                if isinstance(data, dict) and "messages" in data:
                    return data["messages"]
        elif ext == ".txt":
            messages = []
            with open(fpath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if ":" in line:
                        role, content = line.split(":", 1)
                        messages.append({
                            "role": role.strip().lower(),
                            "content": content.strip(),
                        })
            return messages
        return []
