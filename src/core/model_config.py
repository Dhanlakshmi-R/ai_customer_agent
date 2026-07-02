import os
from src.core.config import settings


class ModelConfig:
    SENTIMENT_MODELS = {
        "light": {
            "name": "distilbert-base-uncased-finetuned-sst-2-english",
            "size": "~250MB",
            "speed": "fast",
            "accuracy": "good",
        },
        "medium": {
            "name": "cardiffnlp/twitter-roberta-base-sentiment-latest",
            "size": "~500MB",
            "speed": "medium",
            "accuracy": "better",
        },
        "large": {
            "name": "nlptown/bert-base-multilingual-uncased-sentiment",
            "size": "~680MB",
            "speed": "medium",
            "accuracy": "great",
        },
        "xlarge": {
            "name": "cardiffnlp/twitter-roberta-large-sentiment-latest",
            "size": "~1.4GB",
            "speed": "slow",
            "accuracy": "excellent",
        },
        "xxlarge": {
            "name": "FacebookAI/roberta-large",
            "size": "~1.4GB",
            "speed": "slow",
            "accuracy": "state-of-art",
        },
    }

    ZERO_SHOT_MODELS = {
        "light": {
            "name": "facebook/bart-large-mnli",
            "size": "~1.6GB",
            "speed": "medium",
            "accuracy": "good",
        },
        "medium": {
            "name": "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7",
            "size": "~1.1GB",
            "speed": "medium",
            "accuracy": "better",
        },
        "large": {
            "name": "MoritzLaurer/mDeBERTa-v3-large-xnli-multilingual-nli-2mil7",
            "size": "~4.4GB",
            "speed": "slow",
            "accuracy": "excellent",
        },
    }

    @classmethod
    def get_sentiment_model(cls, tier: str = None) -> dict:
        tier = tier or getattr(settings, "ml_model_tier", "light")
        return cls.SENTIMENT_MODELS.get(tier, cls.SENTIMENT_MODELS["light"])

    @classmethod
    def get_zero_shot_model(cls, tier: str = None) -> dict:
        tier = tier or getattr(settings, "ml_model_tier", "light")
        return cls.ZERO_SHOT_MODELS.get(tier, cls.ZERO_SHOT_MODELS["light"])

    @classmethod
    def list_all(cls) -> dict:
        return {
            "sentiment": cls.SENTIMENT_MODELS,
            "zero_shot": cls.ZERO_SHOT_MODELS,
        }


class HumorEngine:
    ROASTS = {
        "low_quality": [
            "Oof. That response wouldn't pass a Turing test for customer service.",
            "My grandma could've handled that better. And she's 87.",
            "The customer is now 200% more confused. Congrats.",
            "If that response was a pizza, it'd be pineapple and anchovies.",
        ],
        "no_empathy": [
            "Did you just copy-paste from a robot manual? Beep boop.",
            "Zero empathy detected. The customer is filing a complaint in their mind.",
            "That response had all the warmth of a frozen pizza.",
            "Even a chatbot would've said 'I understand' at least once.",
        ],
        "too_long": [
            "You wrote a novel. The customer wanted a text message.",
            "Tldr; even I got bored reading that.",
            "That's longer than the Terms of Service nobody reads.",
            "War and Peace called. They want their paragraph back.",
        ],
        "too_many_questions": [
            " interrogation mode activated. The customer feels attacked.",
            "That's more questions than a job interview.",
            "You're asking so many questions, the customer thinks it's a quiz show.",
        ],
        "defensive": [
            "Defensiveness level: over 9000. The customer is now怒.",
            "You just argued with a paying customer. Bold strategy, Cotton.",
            "That response added fuel to the fire. The fire is now a forest fire.",
        ],
    }

    COMPLIMENTS = [
        "Now THAT's how you handle a customer. Clean, empathetic, professional.",
        "Beautiful response. The customer is probably smiling right now.",
        "Chef's kiss. That response deserves a Michelin star.",
        "Textbook perfect. Someone give this agent a raise.",
        "The customer satisfaction meter just went to 11.",
    ]

    TIPS_ROASTY = [
        "Pro tip: 'Calm down' has never calmed anyone down. Ever. In the history of humanity.",
        "Fun fact: customers can smell scripted responses from 500 miles away.",
        "Hot take: saying 'per my last email' to a customer is a speedrun to escalation.",
        "Real talk: if your response starts with 'Unfortunately', you're already losing.",
        "Galaxy brain move: actually listening to what the customer said instead of waiting to talk.",
    ]

    @classmethod
    def get_roast(cls, category: str = "low_quality") -> str:
        roasts = cls.ROASTS.get(category, cls.ROASTS["low_quality"])
        import random
        return random.choice(roasts)

    @classmethod
    def get_compliment(cls) -> str:
        import random
        return random.choice(cls.COMPLIMENTS)

    @classmethod
    def get_roasty_tip(cls) -> str:
        import random
        return random.choice(cls.TIPS_ROASTY)
