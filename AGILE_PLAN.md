# Agile Plan — 5-Member Team

## Team Roles

| Member | Role | Primary Responsibility |
|---|---|---|
| **You (Lead)** | Tech Lead / Architect | Architecture, orchestration, code reviews, sprint demos, CI/CD |
| **Member 2** | Agent Developer (Simulator + Intent) | Customer Simulator, Intent & Sentiment Analysis Agent |
| **Member 3** | Agent Developer (RAG + Knowledge) | Knowledge Base ingestion, embedding pipeline, Knowledge Recommendation Agent |
| **Member 4** | Agent Developer (Coaching + Escalation) | Coaching & Response Suggestion Agent, Escalation Monitor Agent |
| **Member 5** | Full-Stack Developer (UI + Reports) | Streamlit 3-panel UI, Post-Interaction Summary, Analytics Dashboard |

---

## Sprint Allocation (2-week sprints, ~20 working days)

### Sprint 1 — Foundation (Days 1-10)

| Who | Tasks | Deliverables |
|---|---|---|
| **You** | Set up repo, project structure, CI, shared data models (`SessionState`, `Message`, `TurnAnalysis`) | PR: core models, config, orchestrator skeleton |
| **M2** | Build Customer Simulator Agent — scenario engine, persona config, emotional progression | PR: `customer_simulator.py` + unit tests |
| **M3** | Build RAG pipeline — chunking, embedding service, FAISS vector store, file ingestion (txt/pdf/docx) | PR: `knowledge_base.py`, `embeddings.py` + tests |
| **M4** | Build Intent & Sentiment Agent — regex/keyword-based classifier (can upgrade later) | PR: `intent_sentiment.py` + tests |
| **M5** | Setup Streamlit skeleton, session setup page (mode selection, scenario config), KB management UI | PR: `app.py` (setup page) |

**Sprint Review:** Demo — start a simulator session, see customer messages generated, KB ingestion working.

---

### Sprint 2 — Core Agents (Days 11-20)

| Who | Tasks | Deliverables |
|---|---|---|
| **You** | Wire orchestration layer — `Orchestrator.start_session()`, `process_customer_input()`, `process_agent_response()` | PR: orchestrator complete |
| **M2** | Iterate Customer Simulator — add more scenarios, emotional transitions based on agent quality | PR: simulator v2 |
| **M3** | Build Knowledge Recommendation Agent — retrieve from vector store, fallback FAQs | PR: `knowledge_recommendation.py` + tests |
| **M4** | Build Coaching & Response Suggestion Agent — tone eval, clarity score, suggestion generation | PR: `coaching_suggestion.py` + tests |
| **M5** | Build conversation panel UI — message display, customer input textarea, agent response input | PR: `panels.py` (conversation + coaching panels) |

**Sprint Review:** Demo — full simulator flow: customer speaks -> intent analyzed -> knowledge retrieved -> coaching suggested.

---

### Sprint 3 — Escalation + UI Completion (Days 21-30)

| Who | Tasks | Deliverables |
|---|---|---|
| **You** | Build Escalation Risk Monitor Agent — continuous scoring, threshold alerts | PR: `escalation_monitor.py` + tests |
| **M2** | Add Manual Mode and Replay Mode to simulator; transcript loading | PR: `conversation_manager.py` updates |
| **M3** | Improve RAG relevance — tuning chunk size, overlap, search thresholds | PR: KB tuning |
| **M4** | Wire escalation into coaching panel — risk overlays, strategy display | PR: escalation UI integration |
| **M5** | Build knowledge recommendation panel UI, escalation alert overlays, post-interaction summary page | PR: knowledge panel + report panel |

**Sprint Review:** Demo — manual mode (paste message), replay mode (transcript step-through), escalation alerts.

---

### Sprint 4 — Reports + Analytics (Days 31-40)

| Who | Tasks | Deliverables |
|---|---|---|
| **You** | Build Post-Interaction Summary Agent — resolution quality scoring, report generation | PR: `post_interaction_summary.py` + tests |
| **M2** | Add coaching recommendation generation to Summary Agent | PR: summary agent coaching logic |
| **M3** | Build Performance Analytics Dashboard — cross-session trends, escalation patterns | PR: `performance_analytics.py` + dashboard UI |
| **M4** | Polish escalation agent — fine-tune thresholds, add more scenarios | PR: escalation v2 |
| **M5** | Stitch full flow — session setup -> coaching console -> end session -> report -> analytics | PR: UI integration, navigation |

**Sprint Review:** Demo — end-to-end: start session, interact, end, see report + analytics.

---

### Sprint 5 — Hardening + Polish (Days 41-50)

| Who | Tasks | Deliverables |
|---|---|---|
| **You** | Code review all PRs, refactor, add logging, error handling | PR: hardening |
| **M2** | Write comprehensive tests — all agent edge cases | PR: expanded tests |
| **M3** | Seed knowledge base with real support docs, tune retrieval quality | PR: KB seed data |
| **M4** | Performance testing — 50-turn sessions, memory profiling | PR: perf fixes |
| **M5** | UX polish — error messages, loading states, empty states, help tooltips | PR: UX improvements |

**Sprint Review:** Demo — final walkthrough, handoff documentation.

---

## Daily Workflow

```
09:00 — Daily standup (15 min, each person: what I did yesterday, what today, blockers)
09:15 — Work on tasks
12:00 — Lunch
13:00 — Work on tasks
16:00 — Pair programming / code review (30 min)
```

## Communication

- GitHub Projects / Issues for task tracking
- Branch naming: `feature/<sprint>-<initials>-<description>`
- PRs require 1 approval (you review all PRs)
- MVP feature list frozen after Sprint 2 — no scope creep after day 20

## Definition of Done

- Code reviewed and merged
- Unit tests passing
- Manual smoke test in Streamlit UI
- No console errors/warnings
- Feature demoable in sprint review
