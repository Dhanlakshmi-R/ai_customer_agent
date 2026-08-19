from typing import List, Dict

from backend.core.llm import llm_chat

PERSONA_PROMPTS = {
    "Friendly": "The customer is polite, patient, cooperative, and uses pleasant phrasing.",
    "Confused": "The customer is uncertain, asks multiple clarifying questions, and finds technical terms hard to follow.",
    "Angry": "The customer is frustrated, dissatisfied, demands quick resolution, and expresses disappointment.",
    "Technical": "The customer uses detailed technical terms, asks about specs, root causes, logs, and APIs.",
    "Business Customer": "The customer is professional, concise, focused on SLA, ROI, account status, and business impact.",
    "Emotional": "The customer expresses high stress, worry, or urgency, needing reassurance and personal empathy.",
}

SYSTEM_PROMPT = (
    "You are a customer simulator for support agent training.\n"
    "Generate ONE realistic customer message in AT MOST 2 SHORT sentences "
    "(maximum 35 words, maximum 220 characters total).\n"
    "Stay in character for the given persona and scenario.\n"
    "React naturally to what the agent last said.\n"
    "Be concise and natural — do not pad the message with extra detail.\n"
    "Do not use quotation marks. Return only the raw message text."
)

DEFAULT_SIMULATOR_RESPONSES = {
    "Friendly": [
        "Hi there! Thanks for taking my request. I'm having a small issue with my subscription payment. Could you help me check it?",
        "That sounds great! I checked my email but haven't received the verification link yet. Where should I look?",
        "Awesome! Thank you for walking me through step 2. Should I refresh the page now?",
        "Perfect, that worked. Do I need to do anything else to confirm the change is saved?",
        "Thanks for the clear explanation. I really appreciate you breaking it down like that.",
        "That makes sense now. Happy to move forward with whatever you recommend from here.",
    ],
    "Confused": [
        "Hello, I'm trying to reset my password but I keep getting an error message saying 'token invalid'. What does that mean?",
        "Wait, I am not sure where the settings page is. Is it under My Profile or the top right gear icon?",
        "I tried that, but now my screen is totally blank. Did I accidentally log out?",
        "Sorry to bother you again, but which exact button am I supposed to click after that step?",
        "I'm getting a little lost with all these steps. Could you walk me through it one more time slowly?",
        "Okay I think I got it now. Where do I go to confirm the changes took effect?",
    ],
    "Angry": [
        "I have been waiting for 3 days for my refund and nobody has responded to my tickets! This service is completely unacceptable!",
        "Your system charged my credit card twice for the same invoice #4829! Fix this immediately or I am canceling my account!",
        "This is ridiculous. I followed your instructions and now my entire account access is locked out!",
        "I am really losing patience here. You keep giving me the same runaround and nothing is actually fixed.",
        "How long is this going to keep taking? I deserve a straight answer and my money back today.",
        "If this is not resolved right now I am escalating to your manager and reporting this to the bank.",
    ],
    "Technical": [
        "We are encountering 504 Gateway Timeouts when calling POST /api/v2/webhooks from our production server.",
        "Can you verify if your API requires TLS 1.3 or if there is IP whitelisting enabled for sandbox webhooks?",
        "I inspected the network payloads and see HTTP 403 Forbidden with 'CSRF token missing'. How do we pass it via headers?",
        "Retrying the request still returns the same status code. Is there a rate limit you can check on your side?",
        "The retry logic backs off correctly, but the dashboard still shows an inconsistent state with the logs.",
        "This matches the failure mode we saw last quarter. Please confirm the root cause before we change our client code.",
    ],
    "Business Customer": [
        "Our enterprise team of 150 users cannot generate the quarterly analytics reports today. Can you give an ETA for the fix?",
        "We need an official root cause analysis (RCA) document and billing credit as per our Premium Tier SLA agreement.",
        "Could you escalate this ticket to a senior technical manager? Our operations are currently halted.",
        "What is the financial impact risk to our SLA if this remains unresolved for the next business day?",
        "We need a written timeline and a named escalator for this issue before we can keep our team aligned.",
        "Once the fix is verified, please share the post-incident report and the follow-up prevention plan.",
    ],
    "Emotional": [
        "Please help me! I am trying to finish a critical client deliverables due in 30 minutes and the software keeps crashing!",
        "I'm really worried all my saved project files were deleted during the system update. Please tell me they can be recovered!",
        "Thank goodness you answered. I am so stressed right now. Can we fix this step by step?",
        "I honestly feel helpless here. Is there any way you can reassure me that my work isn't lost?",
        "I know this might be a simple problem, but I'm anxious about making it worse. Please be gentle with the steps.",
        "You've been very kind and I trust you. Please just tell me if everything will actually be okay.",
    ],
}

# Extra lines rotated in for very long conversations so the same canned replies
# are not reused verbatim after the initial pool is exhausted.
CONVERSATION_EXTENDED_LINES = [
    "Thanks for staying with me while I explain this. Am I on the right track so far?",
    "Okay, I understand. Can you summarize the key steps once more so I know I haven't missed anything?",
    "That clears most of it up. Is there anything else I should watch out for after doing this?",
    "Understood. How soon should I expect to see this change take effect on my end?",
    "I appreciate your patience. Do you need any further details from me about my account?",
    "All right, let's move forward with what you suggested and I'll confirm back once it works.",
]

# Variants used when the agent has just apologized / promised a refund. Indexed by how many
# times the agent has already made such a promise so long conversations stay varied.
APOLOGY_AGENT_BRANCH = {
    "Angry": [
        "I appreciate the apology, but I need to know the exact timeline when my refund will reflect in my bank account.",
        "An apology does not fix the double charge. I need the refund issued today and a confirmation number.",
        "Fine, but you have said that before. Please give me a specific date and confirm it in writing.",
        "You keep saying you will process it. I want to speak to a manager now if it cannot be done today.",
        "Good, at least you admit the mistake. I still need proof that the refund was actually sent.",
        "I will hold you to what you just said. When exactly should I see the money come back?",
    ],
    "default": [
        "Thank you for acknowledging that. What are the exact steps we need to follow next?",
        "Understood, I accept the apology. When can I expect the change to show on my account?",
        "Okay, I appreciate that. Can you confirm what happens on my side next?",
        "Thanks for taking responsibility. Is there anything I need to do to speed this up?",
        "I appreciate the acknowledgment. Please send me a written confirmation when it is done.",
        "That is reassuring to hear. What would be a reasonable time for me to check back?",
    ],
}

# Variants when the agent gives step-by-step instructions. Indexed by how many times the
# agent has already walked the customer through steps.
STEP_BRANCHES = {
    "Confused": [
        "Okay, I tried clicking that button, but it opened a pop-up window asking for a verification code. Where do I get that code?",
        "I found the settings page you mentioned, but I don't see the option you described. Am I looking at the right screen?",
        "I followed those steps, but I'm not sure I did them correctly. Could you confirm what I should see afterwards?",
        "I think I missed something. Could you repeat step two and tell me exactly where that button lives?",
        "I keep getting a loading spinner after that. Is that normal or did I break something?",
        "Okay, I see a confirmation box now. Should I click 'Confirm' or 'Save'?",
    ],
    "Technical": [
        "I executed that step in the terminal. The output log shows 'HTTP status 200 OK', but the dashboard didn't refresh.",
        "I completed the retry sequence, and the API still returns the same 5xx status. Can you check the server-side logs?",
        "I attached the token header as you suggested, but the same error persists. Is the request being routed correctly?",
        "The curl test passed locally but fails from the sandbox environment. Does the firewall allow our subnet?",
        "I see the new headers in the trace, but the response still has stale caching. Should we bypass the CDN?",
        "Rollback restored the service, but the same failure reproduces on retry. I am attaching the full trace now.",
    ],
    "Emotional": [
        "I'm trying those steps but I am nervous. Can you tell me what I should see when it works?",
        "Okay I did that slowly, like you said. Please tell me my work is safe before I go further.",
        "Thank you for going slowly. Should I see a confirmation screen now, or is something else supposed to happen?",
        "I am worried I clicked the wrong thing. Is there a way to undo the last step?",
        "I did what you asked, but I need you to reassure me that nothing was deleted along the way.",
        "Thank you for being patient with me. Once it is fixed, can you check that all my files are still there?",
    ],
    "default": [
        "I've completed that step. What should I do next?",
        "Done, that step worked. Now what comes after it?",
        "I did as you said. How will I know when it has finished?",
        "That worked. Is there another step or should I wait for confirmation?",
        "Completed. What should I look out for now so I know it took effect?",
        "All set on my side. What is the next action you want me to take?",
    ],
}


class CustomerSimulatorAgent:
    def __init__(self, api_key: str = None):
        self.api_key = api_key

    def generate_next_turn(
        self,
        persona: str,
        scenario: str,
        product: str,
        conversation_history: List[Dict[str, str]],
    ) -> str:
        """Generates realistic persona-based customer message maintaining history context."""
        llm_message = self._llm_generate_next_turn(
            persona=persona,
            scenario=scenario,
            product=product,
            conversation_history=conversation_history,
        )
        if llm_message:
            return self._trim(llm_message)
        return self._fallback_generate_next_turn(
            persona=persona,
            scenario=scenario,
            product=product,
            conversation_history=conversation_history,
        )

    @staticmethod
    def _trim(text: str, max_words: int = 35, max_chars: int = 220) -> str:
        """Caps generated messages so every turn stays short and fast to read/translate."""
        text = " ".join(text.split())
        if len(text) <= max_chars and len(text.split()) <= max_words:
            return text
        words = text.split()
        if len(words) > max_words:
            text = " ".join(words[:max_words])
        if len(text) > max_chars:
            cut = text.rfind(" ", 0, max_chars)
            text = text[:cut if cut > max_chars * 0.6 else max_chars]
        return text.rstrip(" .") + "." if text else text

    def _llm_generate_next_turn(
        self,
        persona: str,
        scenario: str,
        product: str,
        conversation_history: List[Dict[str, str]],
    ) -> str:
        persona_key = persona if persona in PERSONA_PROMPTS else "Confused"
        persona_desc = PERSONA_PROMPTS[persona_key]

        if not conversation_history:
            user = (
                f"Generate the opening customer message.\n"
                f"Product: {product}\n"
                f"Scenario: {scenario}\n"
                f"Persona: {persona_key} — {persona_desc}"
            )
        else:
            history_lines = []
            for msg in conversation_history[-8:]:
                role = "Customer" if msg.get("sender") == "customer" else "Agent"
                history_lines.append(f"{role}: {msg.get('content', '')}")
            history_text = "\n".join(history_lines)
            user = (
                f"Conversation so far:\n{history_text}\n\n"
                f"Generate the customer's next reply.\n"
                f"Product: {product}\n"
                f"Scenario: {scenario}\n"
                f"Persona: {persona_key} — {persona_desc}"
            )

        return llm_chat(SYSTEM_PROMPT, user, temperature=0.8)

    def _fallback_generate_next_turn(
        self,
        persona: str,
        scenario: str,
        product: str,
        conversation_history: List[Dict[str, str]],
    ) -> str:
        persona_key = persona if persona in PERSONA_PROMPTS else "Confused"
        turn_count = len(conversation_history)
        pos = turn_count // 2

        if turn_count == 0:
            if persona_key in DEFAULT_SIMULATOR_RESPONSES:
                return DEFAULT_SIMULATOR_RESPONSES[persona_key][0]
            return f"Hello, I need assistance with {product} regarding {scenario}."

        last_agent_msg = ""
        for msg in reversed(conversation_history):
            if msg.get("sender") == "agent":
                last_agent_msg = msg.get("content", "").lower()
                break

        def _agent_mentions(keywords):
            return sum(
                1
                for m in conversation_history
                if m.get("sender") == "agent" and any(k in (m.get("content") or "").lower() for k in keywords)
            )

        if "sorry" in last_agent_msg or "apologize" in last_agent_msg or "refund" in last_agent_msg:
            pool = APOLOGY_AGENT_BRANCH.get(persona_key, APOLOGY_AGENT_BRANCH["default"])
            return pool[_agent_mentions(("sorry", "apologize", "refund")) % len(pool)]

        if "step" in last_agent_msg or "click" in last_agent_msg or "check" in last_agent_msg:
            pool = STEP_BRANCHES.get(persona_key, STEP_BRANCHES["default"])
            return pool[(_agent_mentions(("step", "click", "check")) - 1) % len(pool)]

        responses = DEFAULT_SIMULATOR_RESPONSES.get(persona_key, DEFAULT_SIMULATOR_RESPONSES["Confused"])
        if pos < len(responses):
            return responses[pos]
        extended = CONVERSATION_EXTENDED_LINES
        return extended[(pos - len(responses)) % len(extended)]


simulator_agent = CustomerSimulatorAgent()
