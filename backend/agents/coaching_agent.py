from typing import Dict, Any, List

from backend.core.llm import llm_json, is_llm_available

SYSTEM_PROMPT = (
    "You are a customer support coaching AI. Evaluate the situation and suggest an ideal agent response.\n"
    "Return JSON with exactly these keys:\n"
    '- "tone_score": float 0-100\n'
    '- "grammar_score": float 0-100\n'
    '- "empathy_score": float 0-100\n'
    '- "suggested_reply": concise professional support agent reply (AT MOST 2 short sentences, '
    "maximum 30 words, maximum 220 characters)\n"
    '- "reasoning": brief explanation of why this reply works (1 sentence)\n'
    '- "improvement_tips": array of 2-3 short actionable coaching tips\n'
    "If an agent draft is provided, score it and suggest improvements. "
    "Use knowledge base citations when relevant. "
    "Tailor the reply to the customer's exact words, emotion, urgency and frustration level. "
    "Never invent facts not present in the citations. Keep the suggested reply short and natural. "
    "Return valid JSON only."
)


class CoachingAgent:
    def evaluate_and_suggest(
        self,
        customer_message: str,
        intent: str,
        sentiment: str,
        knowledge_citations: List[Dict[str, Any]],
        agent_draft: str = "",
        emotion: str = "Calm",
        urgency: str = "Low",
        frustration: float = 0.0,
        feedback_context: str = "",
    ) -> Dict[str, Any]:
        """Evaluates response quality and generates an improved suggested reply."""
        result = self._llm_evaluate_and_suggest(
            customer_message=customer_message,
            intent=intent,
            sentiment=sentiment,
            knowledge_citations=knowledge_citations,
            agent_draft=agent_draft,
            emotion=emotion,
            urgency=urgency,
            frustration=frustration,
            feedback_context=feedback_context,
        )
        if result:
            return result
        return self._fallback_evaluate_and_suggest(
            customer_message=customer_message,
            intent=intent,
            sentiment=sentiment,
            knowledge_citations=knowledge_citations,
            agent_draft=agent_draft,
            emotion=emotion,
            urgency=urgency,
            frustration=frustration,
        )

    def _llm_evaluate_and_suggest(
        self,
        customer_message: str,
        intent: str,
        sentiment: str,
        knowledge_citations: List[Dict[str, Any]],
        agent_draft: str,
        emotion: str,
        urgency: str,
        frustration: float,
        feedback_context: str = "",
    ) -> Dict[str, Any] | None:
        citations_text = "\n".join(
            f"- {c.get('title', 'Article')}: {c.get('snippet', '')[:200]}"
            for c in knowledge_citations[:3]
        ) or "No knowledge base citations available."

        user = (
            f"Customer message: {customer_message}\n"
            f"Intent: {intent}\n"
            f"Sentiment: {sentiment}\n"
            f"Emotion: {emotion}\n"
            f"Urgency: {urgency}\n"
            f"Frustration level (0-100): {frustration:.0f}\n"
            f"Agent draft: {agent_draft or '(none — generate proactive coaching)'}\n"
            f"Knowledge citations:\n{citations_text}"
        )
        if feedback_context:
            user += f"\n\nFeedback from other agents:\n{feedback_context}\nFollow it to refine your recommendation."
        data = llm_json(SYSTEM_PROMPT, user, temperature=0.3)
        if not data:
            return None

        try:
            tone_score = float(data.get("tone_score", 85.0))
            grammar_score = float(data.get("grammar_score", 85.0))
            empathy_score = float(data.get("empathy_score", 85.0))
        except (TypeError, ValueError):
            return None

        suggested_reply = str(data.get("suggested_reply", "")).strip()
        reasoning = str(data.get("reasoning", "")).strip()
        tips = data.get("improvement_tips", [])
        if not suggested_reply or not reasoning or not isinstance(tips, list) or not tips:
            return None

        return {
            "tone_score": max(0.0, min(100.0, tone_score)),
            "grammar_score": max(0.0, min(100.0, grammar_score)),
            "empathy_score": max(0.0, min(100.0, empathy_score)),
            "suggested_reply": self._trim(suggested_reply, max_words=30, max_chars=220),
            "reasoning": self._trim(reasoning, max_words=30, max_chars=220),
            "improvement_tips": [str(t) for t in tips[:3]],
        }

    @staticmethod
    def _trim(text: str, max_words: int = 30, max_chars: int = 220) -> str:
        """Caps LLM output so the suggested reply stays short and fast to render/translate."""
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

    def _fallback_evaluate_and_suggest(
        self,
        customer_message: str,
        intent: str,
        sentiment: str,
        knowledge_citations: List[Dict[str, Any]],
        agent_draft: str = "",
        emotion: str = "Calm",
        urgency: str = "Low",
        frustration: float = 0.0,
    ) -> Dict[str, Any]:
        tone_score = 92.0
        grammar_score = 95.0
        empathy_score = 88.0

        if agent_draft:
            draft_lower = agent_draft.lower()
            if "sorry" in draft_lower or "apologize" in draft_lower or "understand" in draft_lower:
                empathy_score = 96.0
            else:
                empathy_score = 70.0

            if len(agent_draft.split()) < 5:
                grammar_score = 75.0
                tone_score = 70.0

        top_citation = knowledge_citations[0]["snippet"] if knowledge_citations else "our support team is looking into this."

        if intent == "Billing & Refund":
            suggested_reply = (
                "I understand how concerning an unexpected charge can be. Let me immediately review your account details "
                "and initiate a refund verification process with our billing department. Could you confirm the transaction ID or invoice number?"
            )
            reasoning = "Demonstrates immediate empathy for financial concern, sets clear expectation, and requests necessary verification details."
            tips = ["Acknowledge billing concern first", "Offer clear verification steps", "Reassure customer regarding refund policy"]

        elif intent == "Technical Issue":
            suggested_reply = (
                f"Thank you for sharing those details. Based on our technical guide ({top_citation[:60]}...), "
                "let's check your connection settings and payload headers step by step. First, please verify if your API token is included in the request header."
            )
            reasoning = "Provides actionable technical troubleshooting steps while referencing verified knowledge base documentation."
            tips = ["Reference knowledge base troubleshooting steps", "Keep instructions structured and step-by-step", "Invite immediate verification output"]

        elif intent == "Account Cancellation":
            suggested_reply = (
                "I am sorry to hear you're considering canceling your account. Before we proceed, I'd love to see if we can resolve any issues you've experienced. "
                "If you still wish to proceed, I can guide you through the process right away."
            )
            reasoning = "Balances retention effort with helpful service compliance without frustrating the customer."
            tips = ["Express genuine care", "Offer immediate support before cancellation", "Maintain polite professional tone"]

        else:
            suggested_reply = (
                "Thank you for contacting us today! I'd be happy to help resolve this for you. "
                "Let me look into the details right now and walk you through the resolution."
            )
            reasoning = "Polite, active, and supportive opening that establishes readiness to assist."
            tips = ["Greet customer warmly", "Maintain proactive stance", "State immediate action step"]

        if not is_llm_available():
            suggested_reply = (
                "[Rule-based fallback — live LLM offline] " + suggested_reply
            )
            reasoning = "Fallback template used because no LLM provider is configured."

        return {
            "tone_score": tone_score,
            "grammar_score": grammar_score,
            "empathy_score": empathy_score,
            "suggested_reply": suggested_reply,
            "reasoning": reasoning,
            "improvement_tips": tips,
        }
