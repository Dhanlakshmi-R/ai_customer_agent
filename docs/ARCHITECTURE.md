# AI Customer Support Coaching Assistant - System Architecture

## Architecture Overview

The system is built on a clean, decoupled, event-driven multi-agent architecture designed for real-time customer support coaching.

```
+-------------------------------------------------------------------------------+
|                             REACT FRONTEND (Vite + TS)                        |
|   +-------------------+     +---------------------+     +-----------------+   |
|   | 3-Panel Main UI   |     | Executive Dashboard |     | Knowledge RAG   |   |
|   +-------------------+     +---------------------+     +-----------------+   |
+---------------------------------------+---------------------------------------+
                                        |  REST / WebSockets API
                                        v
+-------------------------------------------------------------------------------+
|                            FASTAPI BACKEND SYSTEM                             |
|                                                                               |
|  +-------------------+   +--------------------+   +-----------------------+   |
|  | JWT & RBAC Auth   |   | Session Controller |   | PDF Report Generator  |   |
|  +-------------------+   +--------------------+   +-----------------------+   |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                 LANGGRAPH MULTI-AGENT ORCHESTRATOR                      |  |
|  |                                                                         |  |
|  |  +-------------------+       +-----------------------+                  |  |
|  |  | Intent & Sentiment| ----> | Knowledge RAG Agent   |                  |  |
|  |  +-------------------+       +-----------------------+                  |  |
|  |            |                             |                              |  |
|  |            v                             v                              |  |
|  |  +-------------------+       +-----------------------+                  |  |
|  |  | Coaching Agent    | ----> | Escalation Risk Agent |                  |  |
|  |  +-------------------+       +-----------------------+                  |  |
|  +-------------------------------------------------------------------------+  |
+---------------------------------------+---------------------------------------+
                                        |
                 +----------------------+----------------------+
                 v                                             v
    +--------------------------+                 +---------------------------+
    |   ChromaDB Vector Store  |                 |    SQLite / PostgreSQL    |
    |  (Sentence Transformers) |                 |    (SQLAlchemy Async)     |
    +--------------------------+                 +---------------------------+
```

## Agent Responsibilities
1. **Customer Simulator Agent**: Generates persona-consistent customer turns (Friendly, Confused, Angry, Technical, Business Customer, Emotional).
2. **Intent & Sentiment Agent**: Evaluates intent category, sentiment, emotion, urgency, and frustration score (0.0 to 1.0).
3. **Knowledge Recommendation Agent**: Surfaces relevant FAQs, policies, and troubleshooting steps from ChromaDB using RAG.
4. **Coaching Agent**: Evaluates tone, grammar, and empathy; provides suggested replies and improvement explanations.
5. **Escalation Risk Agent**: Monitors escalation likelihood (Low, Medium, High, Critical) and recommends supervisor interventions.
