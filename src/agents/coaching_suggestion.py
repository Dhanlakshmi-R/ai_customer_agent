from src.core.models import CoachingFeedback, IntentAnalysis, Message
from src.core.llm import llm_chat
from src.core.model_config import HumorEngine


class CoachingSuggestionAgent:
    def analyze_response(
        self,
        customer_message: Message,
        agent_message: Message | None,
        intent: IntentAnalysis | None,
        humor_mode: bool = False,
    ) -> CoachingFeedback:
        agent_text = agent_message.content if agent_message else ""

        if agent_text.strip():
            llm_result = self._llm_evaluate(customer_message.content, agent_text, intent, humor_mode)
        else:
            llm_result = None

        tone_quality, clarity_score = self._evaluate_tone(agent_text)

        if llm_result:
            suggested_response = llm_result.get("suggested", self._suggest_response(customer_message.content, intent))
            communication_tips = llm_result.get("tips", self._generate_tips(agent_text, intent))
            llm_clarity = llm_result.get("clarity", clarity_score)
            clarity_score = (clarity_score + llm_clarity) / 2
        else:
            suggested_response = self._suggest_response(customer_message.content, intent)
            communication_tips = self._generate_tips(agent_text, intent)

        quality_score = round(clarity_score * 0.7 + self._empathy_score(agent_text) * 0.3, 2)

        if humor_mode:
            if llm_result and "humor" in llm_result:
                communication_tips.insert(0, llm_result["humor"])
            elif not agent_text.strip():
                import random
                waiting_roasts = [
                    "Still waiting... even a 'hold on' would be progress.",
                    "The customer is staring at their screen. Any day now.",
                    "Crickets. The customer is typing 'hello?' as we speak.",
                    "Radio silence. The customer is filing a complaint in their mind.",
                    "The void stares back. Type something, anything.",
                ]
                communication_tips.insert(0, random.choice(waiting_roasts))

        return CoachingFeedback(
            tone_quality=tone_quality,
            clarity_score=round(clarity_score, 2),
            communication_tips=communication_tips,
            suggested_response=suggested_response,
            response_quality_score=quality_score,
        )

    def _llm_evaluate(self, customer_text: str, agent_text: str, intent: IntentAnalysis | None, humor_mode: bool = False) -> dict:
        intent_str = intent.intent.value if intent else "general"
        sentiment_str = intent.sentiment.value if intent else "neutral"
        frustration = intent.frustration_level if intent else 0

        humor_prompt = (
            '- "humor": A contextual, natural roast (if the agent response is poor) or a compliment '
            '(if the response is excellent), based specifically on the agent\'s message.\n'
        ) if humor_mode else ""

        system = (
            "You are a customer support coaching AI. Analyze the agent's response to the customer.\n"
            "Return JSON with exactly these keys:\n"
            '- "suggested": a better version of the agent response (if needed)\n'
            '- "tips": array of 1-3 short actionable tips\n'
            '- "clarity": number 0.0 to 1.0 rating clarity\n'
            f'{humor_prompt}'
            "Be concise. Customer intent is " + intent_str + ", sentiment is " + sentiment_str +
            ", frustration is " + str(int(frustration * 100)) + "%. "
            "Only suggest improvements. Return valid JSON only."
        )

        user = f"Customer said: {customer_text}\nAgent responded: {agent_text}"
        raw = llm_chat(system, user, temperature=0.3)

        if not raw:
            return {}

        try:
            import json
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                raw = raw.rsplit("```", 1)[0]
            return json.loads(raw)
        except Exception:
            return {}

    def _evaluate_tone(self, text: str) -> tuple[str, float]:
        if not text.strip():
            return "No response yet", 0.0

        text_lower = text.lower()

        empathy_words = ["understand", "sorry", "apologize", "sympathize", "appreciate",
                         "frustrating", "know how you feel", "help", "assist"]
        empathy_count = sum(1 for w in empathy_words if w in text_lower)

        closing_words = ["does that help", "let me know", "anything else", "happy to help",
                         "is there anything", "please let me know"]
        has_closing = any(w in text_lower for w in closing_words)

        sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        avg_sentence_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)

        if empathy_count >= 2:
            tone_quality = "Empathetic and Professional"
        elif empathy_count == 1:
            tone_quality = "Professional with some empathy"
        else:
            tone_quality = "Neutral"

        clarity_score = 0.5
        if 8 <= avg_sentence_len <= 20:
            clarity_score += 0.2
        if has_closing:
            clarity_score += 0.15
        clarity_score += min(empathy_count * 0.1, 0.15)

        return tone_quality, min(clarity_score, 1.0)

    def _empathy_score(self, text: str) -> float:
        empathy_phrases = ["understand", "frustrat", "sorry", "apologize",
                           "help", "assist", "resolve", "sort out"]
        matches = sum(1 for p in empathy_phrases if p in text.lower())
        return min(matches * 0.2, 1.0)

    def _generate_tips(self, agent_text: str, intent: IntentAnalysis | None) -> list[str]:
        tips = []
        text_lower = agent_text.lower()

        if not agent_text.strip():
            tips.append("Respond to the customer's message promptly to acknowledge their concern.")
            return tips

        empathy_phrases = ["understand", "sorry", "apologize", "frustrat"]
        if not any(p in text_lower for p in empathy_phrases):
            tips.append("Consider using empathetic language to acknowledge the customer's feelings.")

        words = agent_text.split()
        avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
        if avg_word_len > 7:
            tips.append("Use simpler language — avoid jargon or overly complex terms.")

        if len(text_lower) > 300:
            tips.append("Keep responses concise. Customers prefer brief, direct answers.")

        question_count = agent_text.count("?")
        if question_count > 2:
            tips.append("Avoid asking too many questions at once. Ask one at a time.")

        if intent and intent.frustration_level > 0.5:
            tips.append("Stay calm and avoid being defensive. Focus on solutions, not explanations.")

        if not tips:
            tips.append("Consider adding a closing question to invite further discussion.")

        return tips

    def _detect_roast_category(self, agent_text: str, intent: IntentAnalysis | None) -> str:
        text_lower = agent_text.lower()
        if intent and intent.frustration_level > 0.6 and not any(w in text_lower for w in ["understand", "sorry", "apologize"]):
            return "no_empathy"
        if len(agent_text) > 300:
            return "too_long"
        if agent_text.count("?") > 2:
            return "too_many_questions"
        if any(w in text_lower for w in ["unfortunately", "policy", "cannot", "can't do"]):
            return "defensive"
        return "low_quality"

    def _suggest_response(self, customer_message: str, intent: IntentAnalysis | None) -> str:
        if intent:
            intent_map = {
                "technical_issue": ("I understand you're experiencing a technical issue. "
                    "Let me help you troubleshoot this step by step. "
                    "Could you tell me when this issue first started?"),
                "billing": ("I apologize for the billing confusion. "
                    "Let me look into your account to verify the charges. "
                    "Could you share your account details so I can investigate?"),
                "account": ("I can help you with your account issue. "
                    "Let me verify your identity first. "
                    "Could you provide your registered email address?"),
                "cancellation": ("I understand you're considering cancellation. "
                    "I'd like to help address your concerns first. "
                    "Could you tell me what prompted this decision?"),
                "refund": ("I understand you'd like a refund. "
                    "Let me check your purchase details and see what options are available. "
                    "Can you provide your order number?"),
                "complaint": ("I sincerely apologize for your experience. "
                    "I want to make this right. "
                    "Let me investigate what happened and find the best solution for you."),
            }
            if intent.intent.value in intent_map:
                return intent_map[intent.intent.value]

        if intent and intent.frustration_level > 0.5:
            return ("I completely understand your frustration, and I apologize for the inconvenience. "
                    "Let me personally take ownership of this issue and find a resolution for you.")

        return ("Thank you for reaching out. "
                "I'd be happy to help you with your request. "
                "Could you provide a bit more detail so I can assist you better?")
