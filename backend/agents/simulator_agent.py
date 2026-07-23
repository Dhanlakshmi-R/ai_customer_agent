import random
from typing import List, Dict

PERSONA_PROMPTS = {
    "Friendly": "The customer is polite, patient, cooperative, and uses pleasant phrasing.",
    "Confused": "The customer is uncertain, asks multiple clarifying questions, and finds technical terms hard to follow.",
    "Angry": "The customer is frustrated, dissatisfied, demands quick resolution, and expresses disappointment.",
    "Technical": "The customer uses detailed technical terms, asks about specs, root causes, logs, and APIs.",
    "Business Customer": "The customer is professional, concise, focused on SLA, ROI, account status, and business impact.",
    "Emotional": "The customer expresses high stress, worry, or urgency, needing reassurance and personal empathy."
}

DEFAULT_SIMULATOR_RESPONSES = {
    "Friendly": [
        "Hi there! Thanks for taking my request. I'm having a small issue with my subscription payment. Could you help me check it?",
        "That sounds great! I checked my email but haven't received the verification link yet. Where should I look?",
        "Awesome! Thank you for walking me through step 2. Should I refresh the page now?"
    ],
    "Confused": [
        "Hello, I'm trying to reset my password but I keep getting an error message saying 'token invalid'. What does that mean?",
        "Wait, I am not sure where the settings page is. Is it under My Profile or the top right gear icon?",
        "I tried that, but now my screen is totally blank. Did I accidentally log out?"
    ],
    "Angry": [
        "I have been waiting for 3 days for my refund and nobody has responded to my tickets! This service is completely unacceptable!",
        "Your system charged my credit card twice for the same invoice #4829! Fix this immediately or I am canceling my account!",
        "This is ridiculous. I followed your instructions and now my entire account access is locked out!"
    ],
    "Technical": [
        "We are encountering 504 Gateway Timeouts when calling POST /api/v1/webhooks from our production server.",
        "Can you verify if your REST endpoint requires TLS 1.3 or if there is IP whitelisting enabled for sandbox webhooks?",
        "I inspected the network payloads and see HTTP 403 Forbidden with payload 'CSRF token missing'. How do we pass it via headers?"
    ],
    "Business Customer": [
        "Our enterprise team of 150 users cannot generate quarterly analytics reports today. What is the estimated ETA for fix?",
        "We need an official root cause analysis (RCA) document and billing credit as per our Premium Tier SLA agreement.",
        "Could you escalate this ticket to a senior technical manager? Our operations are currently halted."
    ],
    "Emotional": [
        "Please help me! I am trying to finish a critical client presentation due in 30 minutes and the software keeps crashing!",
        "I'm really worried all my saved project files were deleted during the system update. Please tell me they can be recovered!",
        "Thank goodness you answered. I am so stressed right now. Can we fix this step by step?"
    ]
}

class CustomerSimulatorAgent:
    def __init__(self, api_key: str = None):
        self.api_key = api_key

    def generate_next_turn(
        self,
        persona: str,
        scenario: str,
        product: str,
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """Generates realistic persona-based customer message maintaining history context."""
        persona_key = persona if persona in PERSONA_PROMPTS else "Confused"
        
        # Turn count heuristic
        turn_count = len(conversation_history)
        
        # If conversation is starting
        if turn_count == 0:
            if persona_key in DEFAULT_SIMULATOR_RESPONSES:
                return DEFAULT_SIMULATOR_RESPONSES[persona_key][0]
            return f"Hello, I need assistance with {product} regarding {scenario}."

        # Reaction based on last agent message
        last_agent_msg = ""
        for msg in reversed(conversation_history):
            if msg.get("sender") == "agent":
                last_agent_msg = msg.get("content", "").lower()
                break

        if "sorry" in last_agent_msg or "apologize" in last_agent_msg or "refund" in last_agent_msg:
            if persona_key == "Angry":
                return "I appreciate the apology, but I need to know exact timeline when my refund will reflect in my bank account."
            return "Thank you for acknowledging that. What are the exact steps we need to follow next?"

        if "step" in last_agent_msg or "click" in last_agent_msg or "check" in last_agent_msg:
            if persona_key == "Confused":
                return "Okay, I tried clicking that button, but it opened a pop-up window asking for a verification code. Where do I get that code?"
            elif persona_key == "Technical":
                return "I executed that step in the terminal. The output log shows 'HTTP status 200 OK', but the dashboard didn't refresh."
            return "I've completed that step. What should I do next?"

        # Fallback progression
        responses = DEFAULT_SIMULATOR_RESPONSES.get(persona_key, DEFAULT_SIMULATOR_RESPONSES["Confused"])
        idx = min(turn_count // 2, len(responses) - 1)
        return responses[idx]

# Module-level singleton instance for import
simulator_agent = CustomerSimulatorAgent()
