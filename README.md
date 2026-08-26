# NovaDesk AI — Development of AI-Powered Customer Support Assistant with Live Response Guidance.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-teal.svg)
![React](https://img.shields.io/badge/React-19+-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-6-blue.svg)
![LangGraph](https://img.shields.io/badge/LangGraph-orchestrated-8b5cf6.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Coach at every turn.** NovaDesk AI is a multi-agent, real-time coaching platform that helps customer
support agents perform better during live conversations. Every interaction is analyzed on the fly by a
LangGraph-powered pipeline — intent, sentiment, escalation risk, knowledge retrieval, and a suggested
reply — before the customer even finishes typing.

---

## 🚀 Overview

Support agents juggle many conversations at once and rarely get guidance while they are chatting.
Post-call reviews are slow and reactive. **NovaDesk AI** flips that into proactive, in-session coaching:

- A **Customer Simulator Agent** generates realistic personas so agents can practice safely.
- The **Orchestrator** routes every turn through specialized AI agents in real time.
- At the end of an interaction, a **Post-Summary Agent** produces coaching reports and analytics.

The result: faster resolution, better reply quality, and continuous performance improvement — all
visible in a polished, modern dashboard.

---

## ✨ Features

### Live Coaching (WebSocket)
- Real-time conversation streaming with live agent guidance over `WebSocket`.
- Per-turn scores for **tone, grammar, empathy, confidence**, plus a ready-to-send **suggested reply** with reasoning and improvement tips.

### Multi-Agent Pipeline
- **Intent & Sentiment Agent** — classifies intent, emotion, sentiment, urgency, and frustration.
- **Combined Analysis Agent** — single-pass intent + sentiment + coaching + escalation analysis (one LLM round-trip).
- **Knowledge Recommendation Agent** — RAG retrieval over ChromaDB (FAISS-free, persisted).
- **Coaching & Response Agent** — scores drafts and generates the ideal reply.
- **Escalation Risk Monitor** — flags `Low / Medium / High / Critical` risk with recommended actions.
- **Post-Interaction Summary Agent** — generates structured coaching summaries.

### Interaction Modes
- **Simulator Mode** — practice against 6 realistic customer personas.
- **Manual Mode** — paste live customer messages.
- **Replay Mode** — analyze past transcripts turn by turn.

### Platform & Administration
- **Knowledge Base** — upload PDF/DOCX documents, auto-chunked and embedded into ChromaDB.
- **Sessions & Transcripts** — searchable history with per-turn insights.
- **Analytics & Reports** — sentiment journeys, score trends, and downloadable PDF reports.
- **Role-based access** — `admin`, `trainer`, and `agent` roles secured with JWT.
- **Accessibility tools** — translation and read-aloud for replies.

---

## 🏗️ Architecture

The system uses a **multi-agent orchestration pattern** built on **LangGraph**, with each agent
responsible for a narrow domain, coordinated by a central orchestrator.

```text
 User ─▶ Orchestrator Agent ─▶ Intent & Sentiment
   │                          Knowledge (RAG) ─▶ ChromaDB
   │                          Coaching / Combined ─▶ Suggested Reply + Scores
   │                          Escalation Risk Monitor
   │                          Summary Agent ─▶ Coaching Report
   └────────────────────────────────────────────────────────┘
                       Live WebSocket guidance
```

1. **Orchestrator** plans the request and delegates to specialized agents.
2. **Intent & Sentiment Agent** classifies the customer signal.
3. **Knowledge Recommendation Agent** retrieves relevant chunks from the vector store (RAG).
4. **Coaching / Combined Agent** produces scores and a suggested reply.
5. **Escalation Risk Monitor** decides if a human supervisor should step in.
6. **Summary Agent** writes the end-of-interaction coaching summary.

> All production system prompts live in the `system_prompts/` folder.

---

## 🛠️ Tech Stack

### Backend
| Layer          | Technology                                   |
|----------------|----------------------------------------------|
| API            | FastAPI + Uvicorn + Pydantic v2              |
| Orchestration  | LangGraph multi-agent graph                  |
| Agents         | OpenAI / Google Gemini via `core/llm.py`     |
| RAG            | ChromaDB + sentence-transformers embeddings  |
| Database       | SQLAlchemy 2.0 (SQLite / aiosqlite)          |
| Auth           | JWT (python-jose) + passlib/bcrypt + RBAC     |
| Reports        | ReportLab (PDF)                              |
| Real-time      | WebSockets                                   |

### Frontend
| Layer            | Technology                                  |
|------------------|---------------------------------------------|
| Framework        | React 19 + TypeScript                       |
| Build tool       | Vite 8                                      |
| Styling          | Tailwind CSS v4 (glass UI, animations)      |
| State / Data     | Zustand + TanStack Query                    |
| Charts           | Recharts                                    |
| Routing          | React Router v7                             |
| Motion           | Framer Motion                               |

---

## 🚦 Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- *(Optional but recommended)* an **LLM API key** — OpenAI or Google Gemini. Without one, the app
  runs in **rule-based fallback mode** so the full UI and flow still work.

### 1️⃣ Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
# -> add your OPENAI_API_KEY or GEMINI_API_KEY
```

### 2️⃣ Start the Backend

```bash
# From the project root (backend/ is a Python package)
cd ..
uvicorn backend.main:app --reload --port 8000
```

On startup the server **automatically**:
- Creates the SQLite database (`sql_app.db`).
- Seeds default demo users (`admin`, `trainer`, `agent`).
- Auto-seeds the knowledge base into ChromaDB if it is empty.

Interactive API docs: **http://localhost:8000/docs**

WebSocket live coaching: `ws://localhost:8000/api/v1/chat/ws/{session_id}`

### 3️⃣ Frontend Setup

```bash
cd frontend

npm install

# Configure environment
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

### 4️⃣ Start the Frontend

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. You'll land on the landing page with a live
multi-agent demo — click **Sign In**/**Sign Up** in the top-right to enter the app.

| Script          | Purpose                           |
|-----------------|-----------------------------------|
| `npm run dev`   | Start the Vite dev server         |
| `npm run build` | Type-check + production build     |
| `npm run preview` | Preview the production build    |
| `npm run lint`  | Lint with oxlint                  |

### 5️⃣ Running Backend Tests

```bash
cd backend
pytest
```

---

## 👤 Demo Accounts

These users are created automatically on first launch:

| Role    | Email            | Password       |
|---------|------------------|----------------|
| Agent   | `agent@coach.ai` | `Agent@123456` |
| Trainer | `trainer@coach.ai` | `Trainer@123456` |
| Admin   | `admin@coach.ai` | `Admin@123456` |

---

## 📄 Environment Variables

### Backend (`backend/.env`)
| Variable                  | Default                                                        | Description                     |
|---------------------------|----------------------------------------------------------------|---------------------------------|
| `PROJECT_NAME`            | NovaDesk AI…                                    | API title shown in `/docs`    |
| `PORT`                    | `8000`                                                         | Backend port                    |
| `DATABASE_URL`            | `sqlite+aiosqlite:///./sql_app.db`                             | SQLAlchemy connection string    |
| `SECRET_KEY`              | *(change in production)*                                       | JWT signing secret              |
| `OPENAI_API_KEY`          | *(empty)*                                                      | OpenAI LLM key                  |
| `GEMINI_API_KEY`          | *(empty)*                                                      | Google Gemini LLM key           |
| `LLM_MODEL`               | `gpt-4o`                                                       | Default model                   |
| `EMBEDDING_MODEL`         | `sentence-transformers/all-MiniLM-L6-v2`                       | RAG embedding model             |
| `CHROMA_PERSIST_DIRECTORY`| `./chroma_db`                                                  | Vector store persistence dir    |
| `UPLOADS_DIR` / `REPORTS_DIR` | `./uploads` / `./generated_reports`                        | Document & report output dirs   |

### Frontend (`frontend/.env`)
| Variable         | Default                       | Description                  |
|------------------|-------------------------------|------------------------------|
| `VITE_API_URL`   | `http://localhost:8000/api/v1`| Backend REST base URL        |
| `VITE_WS_URL`    | `ws://localhost:8000`         | Backend WebSocket base URL   |

---

## 📂 Project Structure

```
customer-support-coach/
├── backend/
│   ├── agents/            # Multi-agent implementation (LangGraph orchestrator)
│   ├── api/               # FastAPI routers (auth, chat, rag, report, analytics…)
│   ├── authentication/    # JWT + RBAC
│   ├── core/              # LLM service, runtime settings, config
│   ├── database/          # SQLAlchemy models, connection, repository
│   ├── rag/               # Chunker, ingester, ChromaDB vector store
│   ├── reports/           # PDF generation
│   ├── analytics/         # Metrics & insights
│   ├── config.py          # Pydantic settings
│   └── main.py            # FastAPI app entry point
├── frontend/
│   └── src/
│       ├── pages/         # Landing, Dashboard, Console, Sessions, KB, Analytics…
│       ├── components/    # Sidebar, Header, charts, shared UI
│       └── store/         # Zustand global state
├── system_prompts/        # All agent system prompts (reference only)
└── README.md
```

---

## 📖 API Highlights

| Method | Endpoint                   | Description                     |
|--------|----------------------------|---------------------------------|
| POST   | `/api/v1/auth/login`       | Sign in, returns JWT + user     |
| POST   | `/api/v1/auth/register`    | Create account                  |
| POST   | `/api/v1/chat/message`     | Analyze a message (full pipeline)|
| POST   | `/api/v1/chat/manual`      | Manual-mode coaching            |
| POST   | `/api/v1/chat/simulator-next` | Next simulator persona message |
| WS     | `/api/v1/chat/ws/{id}`     | Live coaching stream            |
| POST   | `/api/v1/rag/upload`       | Upload KB document (PDF/DOCX)   |
| POST   | `/api/v1/rag/search`       | Semantic search over KB         |
| POST   | `/api/v1/report/...`       | Generate PDF reports            |
| GET    | `/api/v1/analytics/...`    | Dashboard metrics               |

Full interactive docs at **http://localhost:8000/docs**.

---

## 🧠 Notes

- If no LLM key is configured, agents gracefully fall back to deterministic rule-based logic, so the
  platform remains fully demonstrable offline.
- The landing page features a fully client-side **multi-agent demo** — no backend required — showing
  how tasks are routed between specialized agents.
- System prompts for every agent are centralized in `system_prompts/`.

---

*Built with FastAPI, LangGraph, ChromaDB RAG, and React.*
