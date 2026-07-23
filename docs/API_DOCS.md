# API Documentation

## Authentication Endpoints (`/api/v1/auth`)
- `POST /auth/register`: Register user (Admin, Trainer, Support Agent).
- `POST /auth/login`: Authenticate and receive JWT access token.
- `POST /auth/forgot-password`: Send password recovery instructions.
- `GET /auth/me`: Get active user profile and RBAC role.

## Session Management (`/api/v1/session`)
- `POST /session/create`: Create session (Mode: Simulator, Manual, Replay; Persona, Scenario).
- `GET /session/list`: List user coaching sessions.
- `GET /session/{session_id}`: Retrieve session messages and coaching history.
- `DELETE /session/{session_id}`: Delete coaching session.

## Chat & Live Coaching (`/api/v1/chat`)
- `POST /chat/message`: Process chat turn through LangGraph multi-agent pipeline.
- `POST /chat/simulator-next`: Trigger next Customer Simulator turn.
- `POST /chat/manual`: Manual mode coaching evaluation.
- `POST /chat/replay`: Replay pre-loaded support transcript.
- `WebSocket /chat/ws/{session_id}`: Real-time streaming WebSocket endpoint.

## RAG Knowledge Base (`/api/v1/rag`)
- `POST /rag/upload`: Ingest PDF, DOCX, TXT, MD document into ChromaDB.
- `POST /rag/search`: Search vector knowledge base.
- `GET /rag/documents`: List ingested documents.
- `DELETE /rag/documents/{id}`: Remove document from vector index.

## Reports & Analytics (`/api/v1/report` & `/api/v1/analytics`)
- `POST /report/generate/{session_id}`: Generate post-interaction summary report.
- `GET /report/{session_id}`: Get report summary.
- `GET /report/{session_id}/pdf`: Download PDF report file.
- `GET /analytics/summary`: Executive metrics and trend charts data.
