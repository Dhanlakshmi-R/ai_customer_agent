# AI Customer Support Coaching Assistant

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Streamlit](https://img.shields.io/badge/Streamlit-1.31+-red.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

An intelligent, real-time platform designed to coach customer service agents during live text-based support interactions for **Infosys Springboard**.

## 🚀 Overview

Customer service representatives handle dozens of support interactions daily, often without access to real-time guidance, relevant knowledge resources, or immediate feedback on response quality. Training agents through post-call reviews is slow and reactive.

The **AI Customer Support Coaching Assistant** transforms reactive training into proactive in-session coaching, improving first-interaction resolution rates and agent performance continuously.

## ✨ Features

- **Three Interaction Modes**:
  - **Simulator Mode**: A Customer Simulator Agent generates realistic customer messages based on a defined scenario.
  - **Manual Mode**: The agent pastes incoming customer messages from a real conversation.
  - **Replay Mode**: A pre-loaded support transcript is replayed message by message.
- **Multi-Agent Real-Time Pipeline**: Analyzes each conversation turn and delivers instant guidance.
- **RAG-Powered Knowledge**: Surfaces relevant FAQs, support articles, and troubleshooting steps dynamically.
- **Escalation Monitoring**: Detects escalation risk continuously with reasoning and strategies.
- **Performance Analytics**: Generates post-interaction reports with sentiment journeys and quality scores.

## 🏗️ Architecture

The system utilizes a multi-agent orchestration pattern powered by Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG).

1. **Customer Simulator Agent**: Generates realistic, scenario-based customer messages.
2. **Intent & Sentiment Analysis Agent**: Identifies customer intent, emotional state, and frustration.
3. **Knowledge Recommendation Agent**: Retrieves contextually relevant FAQs using FAISS vector indexing.
4. **Coaching & Response Suggestion Agent**: Generates suggested agent responses and tone quality feedback.
5. **Escalation Risk Monitor Agent**: Continuously scores escalation likelihood.
6. **Post-Interaction Summary Agent**: Generates interaction summaries and coaching recommendations.

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.11 or higher
- API Key for LLM integrations (e.g. Gemini, OpenAI)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd customer-support-coach
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## 💻 Usage

Run the Streamlit application locally:
```bash
streamlit run src/ui/app.py
```

The application will launch in your default web browser. You can navigate between the three interactive modes using the sidebar configuration panel.

---
*Developed for the Infosys Springboard Infosys Interns Project*
