from typing import Dict, Any, List

class CoachingAgent:
    def evaluate_and_suggest(
        self,
        customer_message: str,
        intent: str,
        sentiment: str,
        knowledge_citations: List[Dict[str, Any]],
        agent_draft: str = ""
    ) -> Dict[str, Any]:
        """Evaluates response quality (grammar, tone, empathy, professionalism) and generates an improved suggested reply."""
        
        # Default baseline scores if draft is given or generating proactive coaching
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

        # Build context-aware suggested reply using RAG citations
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

        return {
            "tone_score": tone_score,
            "grammar_score": grammar_score,
            "empathy_score": empathy_score,
            "suggested_reply": suggested_reply,
            "reasoning": reasoning,
            "improvement_tips": tips
        }
