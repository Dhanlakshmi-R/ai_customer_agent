# NovaDesk AI — Complete Knowledge Transfer (KT) Guide

**Project:** Multi-Agent Real-Time Customer Support Coaching Platform  
**Stack:** FastAPI · LangGraph · ChromaDB · React 19 · Tailwind CSS  
**Last updated:** 2026

> Read this document once fully, then use the **Q&A Prep** section to rehearse.
> If you can answer those questions, you are ready to present.

---

## Table of Contents

1. [Elevator Pitch (30 seconds)](#1-elevator-pitch-30-seconds)
2. [The Problem](#2-the-problem)
3. [The Solution](#3-the-solution)
4. [System Architecture](#4-system-architecture)
5. [The Multi-Agent System](#5-the-multi-agent-system)
6. [Technology Stack](#6-technology-stack)
7. [RAG — Retrieval-Augmented Generation](#7-rag--retrieval-augmented-generation)
8. [How to Run & Demo](#8-how-to-run--demo)
9. [Q&A Prep — Likely Questions & Answers](#9-qa-prep--likely-questions--answers)
10. [Glossary](#10-glossary)

---

## 1. Elevator Pitch (30 seconds)

> "NovaDesk AI is a multi-agent, real-time coaching platform that helps customer
> support agents perform better during live conversations. Every interaction is
> analyzed on the fly by a LangGraph-powered pipeline — intent, sentiment,
> escalation risk, knowledge retrieval, and a suggested reply — before the
> customer even finishes typing. It features a RAG-powered knowledge base with
> ChromaDB, three interaction modes (Simulator, Manual, Replay), role-based
> access control, and works offline with rule-based fallback when no LLM key is
> configured. After each session, it produces a detailed coaching report with
> sentiment journeys, score trends, and downloadable PDF summaries."

---

## 2. The Problem

| Pain Point | Detail |
|---|---|
| Lack of real-time guidance | Agents receive coaching only after calls end — reactive and slow |
| High cognitive load | Juggling multiple conversations while maintaining quality is exhausting |
| Inconsistent response quality | Without immediate feedback, agents may provide suboptimal replies |
| Delayed escalation | Critical customer issues may not be flagged until it's too late |
| Limited practice opportunities | New agents lack safe environments to practice before handling real customers |

---

## 3. The Solution

- **Live coaching engine** — Multi-agent AI pipeline analyzing every conversation turn in real-time, providing instant scores (tone, grammar, empathy) and suggested replies.
- **Customer simulator** — AI-powered customer personas that generate realistic conversations for agent training across 6 emotional personas.
- **RAG knowledge base** — Upload and ingest support documents (PDF, DOCX, TXT) into ChromaDB vector store for contextual knowledge retrieval.
- **Escalation monitoring** — Automatic detection of escalation risk levels (Low, Medium, High, Critical) with recommended supervisor actions.
- **Post-interaction analytics** — Detailed coaching reports with sentiment journeys, score trends, and downloadable PDF summaries.

---

## 4. System Architecture

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
|  +-------------------+   +--------------------+   +-----------------------+   |
|  | JWT & RBAC Auth   |   | Session Controller |   | PDF Report Generator  |   |
|  +-------------------+   +--------------------+   +-----------------------+   |
|  +-------------------------------------------------------------------------+  |
|  |                 LANGGRAPH MULTI-AGENT ORCHESTRATOR                      |  |
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
                 +----------------------+----------------------+
                 v                                             v
    +--------------------------+                 +---------------------------+
    |   ChromaDB Vector Store  |                 |    SQLite / PostgreSQL    |
    +--------------------------+                 +---------------------------+
```

### Per-Turn Flow (the thing to memorize)

1. Customer message arrives (typed, simulated, or replayed).
2. **LangGraph Orchestrator** routes the message through the agent pipeline.
3. **Knowledge RAG Agent** queries ChromaDB for relevant support articles (fast, no LLM call).
4. **Combined Analysis Agent** returns intent, sentiment, coaching scores, escalation risk, and suggested reply in a single LLM call.
5. Response persisted to SQLite via SQLAlchemy.
6. Real-time coaching feedback streamed back via WebSocket.

---

## 5. The Multi-Agent System

Every agent has **one responsibility**. The pipeline uses a two-phase approach: instant rule-based provisional results (< 100ms), followed by LLM refinement in the background.

| Agent | LLM? | What it does |
|---|---|---|
| `Customer Simulator Agent` | Yes | Generates persona-consistent customer turns (6 personas) |
| `Intent & Sentiment Agent` | Yes | Classifies intent, emotion, sentiment, urgency, frustration (0.0-1.0) |
| `Combined Analysis Agent` | Yes | Single-pass intent + sentiment + coaching + escalation analysis |
| `Knowledge Recommendation Agent` | No | RAG retrieval over ChromaDB with cosine similarity search |
| `Coaching & Response Agent` | Yes | Scores drafts and generates the ideal reply |
| `Escalation Risk Monitor` | No | Flags Low / Medium / High / Critical risk with actions |
| `Post-Interaction Summary Agent` | No | Generates structured coaching summaries and PDF reports |

### Escalation Risk Levels

| Level | Condition | Action |
|---|---|---|
| **Low** | Normal conversation, positive/neutral sentiment | Standard support dialogue |
| **Medium** | Mild frustration or confusion detected | Provide empathetic reassurance |
| **High** | High frustration + urgent dissatisfaction | Specialist transfer or manager notification |
| **Critical** | Supervisor requested, legal mentions, account cancellation | Immediate manager escalation |

### Fallback Mechanism

When no LLM API key is configured:
- Keyword matching for intent classification
- Sentiment analysis via negative/urgent/stress keyword counting
- Pre-defined suggested replies per intent category
- Threshold-based escalation scoring

---

## 6. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| API Framework | FastAPI + Uvicorn | Async REST API and WebSocket server |
| Orchestration | LangGraph | Multi-agent workflow graph |
| LLM | OpenAI / Gemini / Groq | AI model inference (with fallback chain) |
| Vector Store | ChromaDB | RAG with sentence-transformers embeddings |
| Database | SQLAlchemy 2.0 + aiosqlite | Async SQLite ORM |
| Auth | JWT + RBAC | Role-based access (Admin, Trainer, Agent) |
| Reports | ReportLab | PDF generation |
| Frontend | React 19 + TypeScript + Vite | UI with Tailwind CSS, Zustand, TanStack Query |
| Real-time | WebSockets (FastAPI) | Live coaching streaming |
| DevOps | Docker + Nginx + Render | Containerized deployment |

---

## 7. RAG — Retrieval-Augmented Generation

1. **Ingestion:** Supports `.pdf`, `.docx`, `.txt`, `.md`. Chunking: 800-char chunks with 150-char overlap. Embedded via `sentence-transformers/all-MiniLM-L6-v2`.
2. **Search:** ChromaDB cosine similarity over embedded documents. Auto-seeds from `data/knowledge_base/` on first startup.
3. **Document Management:** Upload via `POST /rag/upload`, search via `POST /rag/search`, delete via `DELETE /rag/documents/{id}`.

---

## 8. How to Run & Demo

```bash
# Backend
cd customer-support-coach
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend
npm install && npm run dev     # http://localhost:5173

# Docker (one command)
docker-compose -f docker/docker-compose.yml up --build

# Tests
pytest
```

**Demo Accounts (Auto-Seeded):**
- Agent: `agent@coach.ai` / `Agent@123456`
- Trainer: `trainer@coach.ai` / `Trainer@123456`
- Admin: `admin@coach.ai` / `Admin@123456`

---

## 9. Q&A Prep — Likely Questions & Answers

**Q1. What problem does NovaDesk AI solve?**
Coaching and QA in support teams happen after the call. NovaDesk AI moves coaching into the moment — every message is analyzed in real-time so the agent knows sentiment, the right KB article, the best reply, and risk level before sending.

**Q2. Why a multi-agent system?**
One agent = one responsibility (classify, coach, monitor, retrieve). This makes prompts small and testable, lets agents run in parallel, and gives clear fault isolation — if escalation detection fails, coaching still works.

**Q3. How is the RAG implemented?**
ChromaDB with sentence-transformers embeddings (all-MiniLM-L6-v2), 800-char chunks with 150 overlap, cosine similarity search. Documents are auto-seeded on startup and can be uploaded via the API.

**Q4. What happens if no LLM API key is set?**
The system falls back to deterministic rule-based logic: keyword matching for intent, sentiment via keyword counting, pre-defined replies, and threshold-based escalation. The app never crashes — it degrades gracefully.

**Q5. How is real-time coaching delivered?**
Via WebSocket connections. The frontend sends messages, the backend runs them through the LangGraph pipeline, and coaching feedback (scores, suggested replies, escalation alerts) is streamed back instantly.

**Q6. What are the three interaction modes?**
**Simulator:** Practice against 6 AI customer personas with emotional progression. **Manual:** Paste real customer messages for coaching. **Replay:** Analyze past transcripts turn-by-turn with full coaching insights.

**Q7. How is this different from a chatbot?**
A chatbot replaces the agent. NovaDesk AI empowers the agent — it is a copilot that coaches, flags risks, and audits quality while the human stays in charge.

**Q8. What's the LangGraph workflow?**
A two-node pipeline: Knowledge RAG (fast retrieval, no LLM call) followed by Combined Analysis (single LLM call returning all analysis). Optimized for minimal latency.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| Agent | A single-responsibility AI module with its own system prompt |
| Orchestrator | The LangGraph controller that runs the per-turn pipeline |
| Turn | One customer message + the resulting analysis from all agents |
| RAG | Retrieval-Augmented Generation — retrieve docs, then generate answers |
| ChromaDB | Vector database for storing and searching document embeddings |
| CSAT | Customer satisfaction score |
| Escalation | Conversation reaching a risk level needing manager intervention |
| RBAC | Role-Based Access Control (Admin, Trainer, Agent) |
| WebSocket | Protocol for real-time bidirectional communication |
| LangGraph | Framework for building multi-agent workflows as directed graphs |
