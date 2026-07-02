import json
import os
import random
from src.core.models import Message, Scenario, SentimentLabel
from src.core.llm import llm_chat


class CustomerSimulatorAgent:
    def __init__(self):
        self._real_scenarios = self._load_real_scenarios()

        self._fallback_scenarios = {
            "account_login": {
                "issue": "logging into my account",
                "product": "Infosys Springboard",
                "persona": "Frustrated professional who needs urgent access",
            },
            "billing_dispute": {
                "issue": "an incorrect charge on my bill",
                "product": "Infosys Springboard",
                "persona": "Angry customer who feels cheated",
            },
            "technical_glitch": {
                "issue": "the app keeps crashing",
                "product": "Infosys Springboard",
                "persona": "Technical user who has tried basic troubleshooting",
            },
            "cancellation": {
                "issue": "cancelling my subscription",
                "product": "Infosys Springboard",
                "persona": "Disappointed customer who wants a refund",
            },
            "refund_request": {
                "issue": "getting a refund",
                "product": "Infosys Springboard",
                "persona": "Customer who purchased recently and is unsatisfied",
            },
            "data_loss": {
                "issue": "important data is missing",
                "product": "Infosys Springboard",
                "persona": "Panicked customer who lost critical work data",
            },
        }

    def _load_real_scenarios(self) -> list[dict]:
        path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "scenarios.json")
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def generate_first_message(self, scenario: Scenario) -> Message:
        """
        Kicks off the simulated conversation by generating the very first 
        message from the 'customer'.
        """
        # Define the personality and goal of the simulated customer
        real = self._find_real_scenario(scenario)
        if real:
            context_parts = []
            if real.get("context"):
                context_parts.append(f"Background: {real['context']}")
            if real.get("key_issues"):
                context_parts.append(f"Key issues: {', '.join(real['key_issues'])}")

            llm_msg = self._llm_generate(
                persona=real.get("customer_persona", "Customer"),
                product=real.get("product_context", "Infosys Springboard"),
                issue=real.get("title", scenario.problem_description),
                context="\n".join(context_parts),
                sentiment=scenario.emotional_start,
                is_first=True,
            )
            if llm_msg:
                return Message(role="customer", content=llm_msg)

        llm_msg = self._llm_generate(
            persona="Customer",
            product=scenario.product_context or "Infosys Springboard",
            issue=scenario.problem_description,
            context="",
            sentiment=scenario.emotional_start,
            is_first=True,
        )
        if llm_msg:
            return Message(role="customer", content=llm_msg)

        return Message(role="customer", content="Hi, I need help with my account. Can you assist me?")

    def generate_reply(
        self,
        scenario: Scenario | None,
        conversation_context: str,
        previous_sentiment: SentimentLabel | None = None,
        agent_response_quality: float = 0.5,
        hinglish_mode: bool = False,
    ) -> Message:
        if scenario is None:
            scenario = Scenario(
                title="generic",
                problem_description="generic",
                customer_persona="Customer",
                product_context="Infosys Springboard",
                emotional_start=SentimentLabel.NEUTRAL,
            )
        previous_sentiment = previous_sentiment or SentimentLabel.NEUTRAL

        if agent_response_quality > 0.7:
            quality_key = "high"
        elif agent_response_quality > 0.4:
            quality_key = "medium"
        else:
            quality_key = "low"

        sentiment_progression = {
            SentimentLabel.NEUTRAL: {"high": SentimentLabel.SATISFIED, "medium": SentimentLabel.NEUTRAL, "low": SentimentLabel.FRUSTRATED},
            SentimentLabel.FRUSTRATED: {"high": SentimentLabel.NEUTRAL, "medium": SentimentLabel.FRUSTRATED, "low": SentimentLabel.ANGRY},
            SentimentLabel.ANGRY: {"high": SentimentLabel.FRUSTRATED, "medium": SentimentLabel.ANGRY, "low": SentimentLabel.ANGRY},
            SentimentLabel.SATISFIED: {"high": SentimentLabel.SATISFIED, "medium": SentimentLabel.SATISFIED, "low": SentimentLabel.NEUTRAL},
            SentimentLabel.NEGATIVE: {"high": SentimentLabel.NEUTRAL, "medium": SentimentLabel.FRUSTRATED, "low": SentimentLabel.ANGRY},
            SentimentLabel.POSITIVE: {"high": SentimentLabel.SATISFIED, "medium": SentimentLabel.POSITIVE, "low": SentimentLabel.NEUTRAL},
        }

        next_sentiment = sentiment_progression.get(
            previous_sentiment, {}
        ).get(quality_key, SentimentLabel.NEUTRAL)

        real = self._find_real_scenario(scenario) if scenario else None
        persona = real.get("customer_persona", "Customer") if real else "Customer"
        product = real.get("product_context", scenario.product_context) if real else (scenario.product_context or "Infosys Springboard")

        llm_msg = self._llm_generate(
            persona=persona,
            product=product,
            issue=scenario.problem_description if scenario else "general issue",
            context=conversation_context,
            sentiment=next_sentiment,
            is_first=False,
            hinglish_mode=hinglish_mode,
        )
        if llm_msg:
            return Message(role="customer", content=llm_msg)

        return Message(role="customer", content="I understand. Please continue helping me with this issue.")

    def _find_real_scenario(self, scenario: Scenario) -> dict | None:
        for rs in self._real_scenarios:
            if rs["id"] == scenario.title or rs["problem_description"] == scenario.problem_description:
                return rs
        return None

    def _llm_generate(
        self,
        persona: str,
        product: str,
        issue: str,
        context: str,
        sentiment: SentimentLabel,
        is_first: bool = False,
        hinglish_mode: bool = False,
    ) -> str:
        sentiment_desc = {
            SentimentLabel.ANGRY: "angry, furious, using strong language, demanding immediate action",
            SentimentLabel.FRUSTRATED: "frustrated, impatient, has been waiting, wants quick resolution",
            SentimentLabel.NEUTRAL: "calm, asking a question or describing a problem",
            SentimentLabel.SATISFIED: "happy, satisfied, thanking the agent, problem solved",
            SentimentLabel.POSITIVE: "positive, appreciative, things are improving",
            SentimentLabel.NEGATIVE: "negative, disappointed, things are not going well",
        }

        hinglish_instruction = ""
        if hinglish_mode:
            hinglish_instruction = "CRITICAL: You MUST aggressively mix Hindi and English (Hinglish) in your response, written in Latin script. Use phrases like 'mera account chal nahi raha hai', 'kya kar rahe ho yaar', 'sir please check karo na'. This is a Tier-2/Tier-3 Indian customer. Make it sound extremely natural and authentic Hinglish. "

        system = (
            f"You are a {persona} contacting customer support for {product} (an Indian food delivery platform). "
            f"Your current emotion: {sentiment_desc.get(sentiment, 'neutral')}. "
            f"The issue is about: {issue}. "
            "Generate ONE short realistic message (1-3 sentences) as the customer. "
            f"{hinglish_instruction}"
            "Occasionally invent and mention fake details like a fake Order ID (e.g., ORD-7391X) or a fake Indian phone number (e.g., 98XXXXXX21) so the agent has to verify you. "
            "Use natural Indian English - include common phrases like 'yaar', 'please', 'sir' naturally. "
            "Mention Indian payment methods (UPI, GPay, PhonePe, COD) if relevant. "
            "Mention Indian food items or INR amounts if relevant. "
            "Be natural, conversational, use informal language sometimes. "
            "If angry or frustrated, make it highly realistic: use some ALL CAPS, multiple exclamation marks, and introduce realistic typing mistakes/typos (e.g. 'yuo', 'teh', 'pls', 'fix it noww'). "
            "If satisfied, express genuine relief. "
            "Do not use quotation marks around the message. "
            "Just return the raw message text."
        )

        if is_first:
            user = "This is the opening message from the customer. They are contacting support for the first time about their issue."
        else:
            user = f"Conversation history:\n{context}\n\nGenerate the customer's next reply based on what the agent just said:"

        return llm_chat(system, user, temperature=0.8)

    def list_scenarios(self) -> dict:
        scenarios = {}
        for rs in self._real_scenarios:
            scenarios[rs["id"]] = rs["title"]
        for k, v in self._fallback_scenarios.items():
            if k not in scenarios:
                scenarios[k] = v["issue"]
        return scenarios
