import asyncio
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import WebSocketDisconnect

from backend.api.chat import websocket_chat_endpoint


class FakeWebSocket:
    def __init__(self, messages, token="valid-token"):
        self.messages = iter(messages)
        self.query_params = {"token": token}
        self.headers = {}
        self.sent = []
        self.closed_code = None

    async def accept(self):
        return None

    async def receive_json(self):
        try:
            return next(self.messages)
        except StopIteration as exc:
            raise WebSocketDisconnect() from exc

    async def send_json(self, payload):
        self.sent.append(payload)

    async def close(self, code):
        self.closed_code = code


class FakeDatabase:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None


class FakeRepository:
    def __init__(self, _):
        self.session = SimpleNamespace(id="session-1", user_id="user-1", messages=[])

    async def get_user_by_id(self, user_id):
        return SimpleNamespace(id=user_id) if user_id == "user-1" else None

    async def get_session(self, _):
        return self.session

    async def add_message(self, **kwargs):
        return SimpleNamespace(id="message-1", timestamp=SimpleNamespace(isoformat=lambda: "2026-01-01T00:00:00"), **kwargs)

    async def add_coaching_analysis(self, **_):
        return SimpleNamespace(
            id="analysis-1", message_id="message-1",
            intent="Billing & Refund", sentiment="Negative", emotion="Frustrated",
            urgency="High", frustration=0.8, confidence_score=0.9, tone_score=90.0,
            grammar_score=92.0, empathy_score=94.0, escalation_risk="High",
            suggested_reply="I will review the charge.", reasoning="Acknowledges the issue.",
            knowledge_citations=[],
        )

    async def get_coaching_feedback_context(self):
        return ""


def _pipeline_output():
    return {
        "intent": "Billing & Refund", "sentiment": "Negative", "emotion": "Frustrated",
        "urgency": "High", "frustration": 0.8, "confidence_score": 0.9,
        "tone_score": 90.0, "grammar_score": 92.0, "empathy_score": 94.0,
        "escalation_risk": "High", "suggested_reply": "I will review the charge.",
        "reasoning": "Acknowledges the issue.", "knowledge_citations": [],
    }


# Keep the background refinement deterministic in tests: capture the refine
# call and resolve instantly instead of running the real LLM pipeline.
def _track_refine(events):
    async def fake_refine(websocket, session_id, analysis_id, customer_message, draft):
        events["refines"].append({
            "session_id": session_id, "analysis_id": analysis_id,
            "customer_message": customer_message, "draft": draft,
        })
        await websocket.send_json({
            "event": "coaching_refine",
            "message_id": "message-1",
            "analysis_id": analysis_id,
            "coaching": _pipeline_output(),
        })

    return fake_refine


def test_websocket_authenticates_and_persists_customer_turn():
    websocket = FakeWebSocket([{"sender": "customer", "content": "I was charged twice."}])
    events = {"refines": []}

    async def run_endpoint():
        with (
            patch("backend.api.chat.decode_access_token", return_value={"sub": "user-1"}),
            patch("backend.api.chat.AsyncSessionLocal", return_value=FakeDatabase()),
            patch("backend.api.chat.Repository", FakeRepository),
            patch("backend.api.chat._refine_analysis", side_effect=_track_refine(events)),
        ):
            endpoint_task = asyncio.ensure_future(websocket_chat_endpoint(websocket, "session-1"))
            await endpoint_task
            # Let the fire-and-forget refine tasks spawned by the endpoint flush.
            pending = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
            for t in pending:
                await t

    asyncio.run(run_endpoint())

    # The message bubble is pushed instantly for every turn (before the LLM runs).
    bubbles = [e for e in websocket.sent if e.get("event") == "customer_message"]
    assert bubbles and bubbles[0]["message"]["content"] == "I was charged twice."

    final = [e for e in websocket.sent if e.get("event") == "turn_complete"]
    assert final, "expected a turn_complete event"
    assert final[0]["status"] == "success"
    assert final[0]["message"]["content"] == "I was charged twice."
    assert final[0]["coaching"]["intent"] == "Billing & Refund"
    assert final[0]["coaching"]["suggested_reply"] == "I will review the charge."

    # The LLM refinement runs in the background for the same message/analysis.
    assert events["refines"], "expected a background refine call"
    assert events["refines"][0]["analysis_id"] == "analysis-1"
    assert events["refines"][0]["customer_message"] == "I was charged twice."
    refined = [e for e in websocket.sent if e.get("event") == "coaching_refine"]
    assert refined and refined[0]["coaching"]["suggested_reply"] == "I will review the charge."


def test_websocket_rejects_missing_jwt():
    websocket = FakeWebSocket([], token="")
    asyncio.run(websocket_chat_endpoint(websocket, "session-1"))

    assert websocket.sent == [{"status": "error", "error": {"code": "unauthorized", "message": "A valid JWT token is required."}}]
    assert websocket.closed_code == 1008
