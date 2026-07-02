import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import streamlit as st

from src.core.models import InteractionMode
from src.core.orchestrator import Orchestrator
from src.core.model_config import ModelConfig
from src.ui.panels import (
    render_coaching_panel,
    render_conversation_panel,
    render_knowledge_panel,
    render_performance_report,
)
from src.rag.knowledge_base import knowledge_base
from src.rag.ingest import ingest_with_feedback
from src.core.database import database


st.set_page_config(
    page_title="AI Customer Support Coaching Assistant",
    page_icon="target",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* APP BACKGROUND */
[data-testid="stAppViewContainer"], .stApp {
    background-color: var(--bg) !important;
    background-image: radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.12), transparent 25%),
                      radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.12), transparent 25%) !important;
    background-attachment: fixed;
    color: var(--text);
    font-family: 'Inter', sans-serif;
}

:root {
    --bg: #0b1120;
    --bg2: #0f172a;
    --card: rgba(15, 23, 42, 0.6);
    --card-solid: #0f172a;
    --border: rgba(148, 163, 184, 0.1);
    --border-glow: rgba(139, 92, 246, 0.4);
    --text: #f8fafc;
    --text2: #94a3b8;
    --accent: #818cf8;
    --accent2: #c084fc;
    --accent3: #2dd4bf;
    --green: #10b981;
    --red: #f43f5e;
    --orange: #f59e0b;
    --glass: rgba(15, 23, 42, 0.7);
    --glass-border: rgba(255, 255, 255, 0.1);
}

/* ANIMATED BACKGROUND */
.stApp {
    background: #0b1120 !important;
    font-family: 'Inter', sans-serif !important;
}
.stApp::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.08), transparent 25%),
                radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.08), transparent 25%);
    pointer-events: none;
    z-index: 0;
}

section[data-testid="stSidebar"] {
    background: rgba(15, 23, 42, 0.85) !important;
    backdrop-filter: blur(16px);
    border-right: 1px solid var(--glass-border) !important;
}

/* GLASS MORPHISM CARDS */
[data-testid="stVerticalBlockBorderWrapper"],
[data-testid="stVerticalBlockBorderWrapper"][style*="border"] {
    background: var(--glass) !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 16px !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                inset 0 -2px 5px rgba(0, 0, 0, 0.4) !important;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    transform: translateZ(0);
}
[data-testid="stVerticalBlockBorderWrapper"]:hover {
    border-color: var(--border-glow) !important;
    box-shadow: 0 15px 50px -10px rgba(99, 102, 241, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.15),
                inset 0 -2px 5px rgba(0, 0, 0, 0.4) !important;
    transform: translateY(-5px) perspective(1000px) rotateX(2deg) !important;
}

/* 3D METRICS */
[data-testid="stMetric"] {
    background: var(--glass) !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 16px !important;
    padding: 20px !important;
    backdrop-filter: blur(12px) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    position: relative;
    overflow: hidden;
    transform: translateZ(0);
}
[data-testid="stMetric"]::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--accent2), var(--accent3));
    opacity: 0;
    transition: opacity 0.3s ease;
}
[data-testid="stMetric"]:hover::before { opacity: 1; }
[data-testid="stMetric"]:hover {
    transform: translateY(-6px) scale(1.02) perspective(1000px) rotateX(4deg) !important;
    box-shadow: inset 0 2px 4px rgba(255,255,255,0.2),
                inset 0 -4px 10px rgba(0,0,0,0.6),
                0 20px 40px rgba(99, 102, 241, 0.3) !important;
}
[data-testid="stMetricValue"] {
    color: var(--text) !important;
    font-weight: 700 !important;
    font-size: 1.8em !important;
}
[data-testid="stMetricLabel"] {
    color: var(--text2) !important;
    font-weight: 500 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    font-size: 0.75em !important;
}

/* BUTTONS */
.stButton > button {
    border-radius: 12px !important;
    font-weight: 600 !important;
    padding: 0.5rem 1rem !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative;
    overflow: hidden;
    border: none !important;
}
.stButton > button::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transition: left 0.5s ease;
}
.stButton > button:hover::before { left: 100%; }
.stButton > button[data-testid="stBaseButton-primary"] {
    background: linear-gradient(135deg, var(--accent), var(--accent2)) !important;
    color: white !important;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3),
                0 0 0 1px rgba(139, 92, 246, 0.2) !important;
}
.stButton > button[data-testid="stBaseButton-primary"]:hover {
    background: linear-gradient(135deg, #a78bfa, #d8b4fe) !important;
    box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4),
                0 0 0 1px rgba(139, 92, 246, 0.3) !important;
    transform: translateY(-2px) !important;
}
.stButton > button[data-testid="stBaseButton-primary"]:active {
    transform: translateY(0px) !important;
}
.stButton > button:not([data-testid="stBaseButton-primary"]) {
    background: var(--card) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
}
.stButton > button:not([data-testid="stBaseButton-primary"]):hover {
    border-color: var(--border-glow) !important;
    background: rgba(30, 41, 59, 0.8) !important;
    transform: translateY(-1px) !important;
}

/* EXPANDERS */
.streamlit-expanderHeader {
    background: var(--glass) !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    color: var(--text) !important;
    backdrop-filter: blur(12px) !important;
    transition: all 0.3s ease !important;
}
.streamlit-expanderHeader:hover {
    border-color: var(--border-glow) !important;
    background: rgba(15, 23, 42, 0.8) !important;
}

/* TABS */
.stTabs [data-baseweb="tab-list"] {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    gap: 12px !important;
}
.stTabs [data-baseweb="tab"] {
    background: linear-gradient(145deg, rgba(17, 24, 39, 0.9), rgba(30, 41, 59, 0.7)) !important;
    border-radius: 10px !important;
    border: 1px solid var(--glass-border) !important;
    font-weight: 600 !important;
    color: var(--text2) !important;
    padding: 12px 24px !important;
    transition: all 0.3s ease !important;
}
.stTabs [data-baseweb="tab"][aria-selected="true"] {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15)) !important;
    color: var(--text) !important;
    border: 1px solid rgba(99, 102, 241, 0.5) !important;
}
.stTabs [data-baseweb="tab-highlight"] {
    display: none !important;
}

/* INPUTS */
.stTextInput > div > div > input,
.stTextArea > div > div > textarea {
    background: var(--glass) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    padding: 12px 16px !important;
    font-family: 'Inter', sans-serif !important;
    backdrop-filter: blur(12px) !important;
    transition: all 0.3s ease !important;
}
.stTextInput > div > div > input:focus,
.stTextArea > div > div > textarea:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
}
.stSelectbox > div > div > div {
    background: var(--glass) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    backdrop-filter: blur(12px) !important;
}

/* DIVIDER */
hr {
    border: none !important;
    border-top: 1px solid var(--glass-border) !important;
    margin: 1rem 0 !important;
}

/* FILE UPLOADER */
[data-testid="stFileUploader"] {
    background: var(--glass) !important;
    border: 2px dashed var(--border) !important;
    border-radius: 16px !important;
    transition: all 0.3s ease !important;
}
[data-testid="stFileUploader"]:hover {
    border-color: var(--accent) !important;
    background: rgba(99, 102, 241, 0.05) !important;
}

/* SCROLLBAR */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--accent), var(--accent2));
    border-radius: 4px;
}

/* HEADER ANIMATION */
@keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
@keyframes glow {
    0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
    50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); }
}
@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
}
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

/* ANIMATED HEADER */
.hero-title {
    font-size: 2.8em !important;
    font-weight: 800 !important;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4, #6366f1);
    background-size: 300% 300% !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    animation: gradientShift 4s ease infinite, slideDown 0.6s ease-out !important;
    text-align: center !important;
    margin-bottom: 0.5rem !important;
    text-shadow: 0 0 40px rgba(99, 102, 241, 0.3) !important;
}
@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
.hero-subtitle {
    text-align: center;
    color: var(--text2);
    font-size: 1.1em;
    font-weight: 400;
    animation: fadeIn 0.8s ease-out 0.2s both;
    margin-bottom: 2rem;
}

/* 3D PANEL CARDS */
.panel-3d {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 20px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    animation: slideUp 0.6s ease-out;
}
.panel-3d::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2), var(--accent3));
    opacity: 0;
    transition: opacity 0.3s ease;
}
.panel-3d:hover::before { opacity: 1; }
.panel-3d:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(99, 102, 241, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.08);
    border-color: var(--border-glow);
}

/* PANEL HEADERS */
.panel-header {
    font-size: 1.3em;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.3rem;
    display: flex;
    align-items: center;
    gap: 8px;
}
.panel-header .icon {
    font-size: 1.2em;
    filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
}
.panel-subtitle {
    color: var(--text2);
    font-size: 0.85em;
    margin-bottom: 1rem;
}

/* CHAT BUBBLES */
.chat-customer {
    background: var(--glass);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(45, 212, 191, 0.3);
    border-radius: 16px 16px 16px 4px;
    padding: 14px 18px;
    margin: 8px 0;
    max-width: 85%;
    color: #e2e8f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
    transition: all 0.3s ease;
}
.chat-customer:hover {
    transform: translateX(4px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
}
.chat-agent {
    background: var(--glass);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 16px 16px 4px 16px;
    padding: 14px 18px;
    margin: 8px 0;
    max-width: 85%;
    margin-left: auto;
    color: #e2e8f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
    transition: all 0.3s ease;
}
.chat-agent:hover {
    transform: translateX(-4px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
}
.chat-label {
    font-size: 0.7em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
    display: block;
}
.chat-label-customer { color: #60a5fa; }
.chat-label-agent { color: #34d399; }

/* RISK BADGES */
.risk-low { background: linear-gradient(135deg, #059669, #10b981); color: white; }
.risk-medium { background: linear-gradient(135deg, #d97706, #f59e0b); color: white; }
.risk-high { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; }
.risk-critical { background: linear-gradient(135deg, #991b1b, #dc2626); color: white; animation: pulse 1.5s infinite; }

/* HUMOR BADGES */
.roast-badge {
    background: linear-gradient(135deg, #dc2626, #ef4444);
    color: white;
    padding: 10px 16px;
    border-radius: 12px;
    border-left: 4px solid #f87171;
    font-size: 0.9em;
    font-weight: 500;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.compliment-badge {
    background: linear-gradient(135deg, #059669, #10b981);
    color: white;
    padding: 10px 16px;
    border-radius: 12px;
    border-left: 4px solid #34d399;
    font-size: 0.9em;
    font-weight: 500;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.roasty-tip {
    background: linear-gradient(135deg, #581c87, #7c3aed);
    color: #e2e8f0;
    padding: 10px 16px;
    border-radius: 12px;
    border-left: 4px solid #a78bfa;
    font-size: 0.9em;
    font-weight: 500;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

/* SCORE RING */
.score-ring {
    width: 120px; height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2em;
    font-weight: 800;
    margin: 0 auto 1rem;
    position: relative;
    animation: float 3s ease-in-out infinite;
}
.score-ring::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(var(--accent), var(--accent2), var(--accent3), var(--accent));
    z-index: -1;
    animation: spin 4s linear infinite;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
.score-ring::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--bg);
    z-index: -1;
}

/* HUMOR MODE TOGGLE GLOW */
.humor-active {
    animation: glow 2s ease-in-out infinite;
    border: 2px solid var(--accent) !important;
}

/* KNOWLEDGE CARD */
.kb-card {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    padding: 16px;
    margin: 8px 0;
    backdrop-filter: blur(12px);
    transition: all 0.3s ease;
    animation: slideUp 0.3s ease-out;
}
.kb-card:hover {
    border-color: var(--accent);
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
}

/* PROGRESS BAR */
.progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    overflow: hidden;
    margin: 6px 0;
}
.progress-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    transition: width 0.5s ease;
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}

/* QUICK START CARDS */
.quick-card {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px 16px;
    text-align: center;
    backdrop-filter: blur(12px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
}
.quick-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    opacity: 0;
    transition: opacity 0.3s ease;
}
.quick-card:hover::before { opacity: 1; }
.quick-card:hover {
    transform: translateY(-6px);
    border-color: var(--border-glow);
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.2);
}
.quick-card .icon {
    font-size: 2.5em;
    margin-bottom: 8px;
    display: block;
    filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4));
    animation: float 3s ease-in-out infinite;
}
.quick-card .title {
    font-weight: 700;
    font-size: 1.1em;
    color: var(--text);
    margin-bottom: 4px;
}
.quick-card .desc {
    font-size: 0.8em;
    color: var(--text2);
}

/* SIDEBAR SESSION CARD */
.session-card {
    background: linear-gradient(145deg, rgba(17, 24, 39, 0.8), rgba(30, 41, 59, 0.6));
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 12px;
    margin: 6px 0;
    transition: all 0.3s ease;
    animation: fadeIn 0.3s ease-out;
}
.session-card:hover {
    border-color: var(--border-glow);
    transform: translateX(4px);
}
.session-active {
    border-left: 3px solid var(--green);
    animation: glow 2s ease-in-out infinite;
}

/* TOOLTIP */
.tooltip-3d {
    position: relative;
    display: inline-block;
}
.tooltip-3d .tooltip-text {
    visibility: hidden;
    background: var(--card-solid);
    color: var(--text);
    text-align: center;
    border-radius: 8px;
    padding: 8px 12px;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: all 0.3s ease;
    border: 1px solid var(--border);
    font-size: 0.85em;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.tooltip-3d:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
    bottom: 130%;
}
</style>
""", unsafe_allow_html=True)


def init_session_state():
    if "orchestrator" not in st.session_state:
        st.session_state.orchestrator = Orchestrator()
    if "page" not in st.session_state:
        st.session_state.page = "setup"
    if "session" not in st.session_state:
        st.session_state.session = None
    if "last_turn" not in st.session_state:
        st.session_state.last_turn = None
    if "report" not in st.session_state:
        st.session_state.report = None
    if "humor_mode" not in st.session_state:
        st.session_state.humor_mode = False


def auto_seed_kb():
    if knowledge_base.collection.count() == 0:
        kb_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "knowledge_base")
        knowledge_base.ingest_directory(kb_dir)


def reset_session():
    st.session_state.session = None
    st.session_state.last_turn = None
    st.session_state.report = None


def render_sidebar():
    with st.sidebar:
        st.markdown(
            '<div style="text-align:center;padding:16px 0 8px">'
            '<div style="font-size:2em;filter:drop-shadow(0 0 10px rgba(99,102,241,0.5))">🎯</div>'
            '<div style="font-size:1.2em;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);'
            '-webkit-background-clip:text;-webkit-text-fill-color:transparent">CoachAI</div>'
            '<div style="color:#94a3b8;font-size:0.75em;margin-top:2px">Real-time AI coaching</div>'
            '</div>',
            unsafe_allow_html=True,
        )
        st.divider()

        humor_on = st.session_state.get("humor_mode", False)
        humor_icon = "🔥" if humor_on else "😴"
        humor_label = "Humor ON" if humor_on else "Humor OFF"
        humor_color = "#ef4444" if humor_on else "#64748b"
        st.markdown(
            f'<div style="background:linear-gradient(145deg,rgba({("239,68,68,0.15") if humor_on else ("100,116,139,0.1")},rgba(30,41,59,0.7));'
            f'border:1px solid {humor_color}33;border-radius:12px;padding:10px 14px;margin-bottom:12px;'
            f'display:flex;align-items:center;gap:10px">'
            f'<span style="font-size:1.5em">{humor_icon}</span>'
            f'<div><div style="font-weight:700;color:{humor_color}">{humor_label}</div>'
            f'<div style="font-size:0.7em;color:#94a3b8">Roasts & roasty tips</div></div></div>',
            unsafe_allow_html=True,
        )

        st.markdown("#### Knowledge Base")
        kb_count = knowledge_base.collection.count()
        st.caption(f"{kb_count} articles indexed")

        uploaded_file = st.file_uploader(
            "Upload document",
            type=["txt", "pdf", "docx", "json", "md", "csv", "html"],
            key="kb_upload",
            label_visibility="collapsed",
        )
        if uploaded_file:
            ext = os.path.splitext(uploaded_file.name)[1].lower()
            if ext in {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"}:
                st.error(f"Cannot read '{uploaded_file.name}' (image not supported).")
            else:
                fpath = os.path.join("data", "knowledge_base", uploaded_file.name)
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                with open(fpath, "wb") as f:
                    f.write(uploaded_file.getbuffer())
                count, err = ingest_with_feedback(fpath)
                if err:
                    st.error(err)
                else:
                    st.success(f"Indexed {count} chunks from '{uploaded_file.name}'")
                    st.rerun()

        st.divider()

        st.markdown("#### Past Sessions")
        sessions = database.get_all_sessions()
        if sessions:
            for s in sessions[:5]:
                config = s.get("config", {})
                is_active = s.get("is_active", False)
                card_class = "session-card session-active" if is_active else "session-card"
                status = "Active" if is_active else "Completed"
                status_color = "#10b981" if is_active else "#64748b"
                created = s.get("created_at", "")[:16]
                st.markdown(
                    f'<div class="{card_class}">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center">'
                    f'<span style="font-weight:600;color:#f1f5f9">{config.get("mode", "?").title()}</span>'
                    f'<span style="font-size:0.7em;color:{status_color};font-weight:600">{status}</span>'
                    f'</div>'
                    f'<div style="font-size:0.75em;color:#94a3b8;margin-top:4px">{created}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            if st.button("Clear All Sessions", type="secondary", use_container_width=True):
                database.delete_all_sessions()
                st.rerun()
        else:
            st.caption("No past sessions yet.")

        st.divider()
        st.caption("v2.0 | Groq LLM + RoBERTa")


def setup_page():
    auto_seed_kb()
    render_sidebar()

    st.markdown(
        '<div class="hero-title">AI Customer Support Coach</div>'
        '<div class="hero-subtitle">Real-time AI coaching for customer support agents</div>',
        unsafe_allow_html=True,
    )

    kb_count = knowledge_base.collection.count()

    st.markdown("#### Quick Start")
    qcols = st.columns(4)
    quick_modes = [
        ("🎯", "Simulator", "AI generates customers", "simulator"),
        ("⌨️", "Manual", "Paste real messages", "manual"),
        ("🔄", "Replay", "Step through transcripts", "replay"),
        ("📊", "Analytics", "View performance trends", "analytics"),
    ]
    for i, (icon, title, desc, mode) in enumerate(quick_modes):
        with qcols[i]:
            st.markdown(
                f'<div class="quick-card">'
                f'<span class="icon">{icon}</span>'
                f'<div class="title">{title}</div>'
                f'<div class="desc">{desc}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
            if st.button(title, key=f"quick_{mode}", use_container_width=True,
                          type="primary" if mode == "simulator" else "secondary"):
                if mode == "analytics":
                    st.session_state.page = "analytics"
                    st.rerun()
                else:
                    _start_quick(mode)

    st.divider()

    tab1, tab2, tab3 = st.tabs(["Session Config", "Humor & Models", "How It Works"])
    with tab1:
        mode = st.radio(
            "Interaction mode",
            options=[m.value for m in InteractionMode],
            format_func=lambda x: {
                "simulator": "Simulator (AI customer)",
                "manual": "Manual (Paste messages)",
                "replay": "Replay (Real transcripts)",
            }.get(x, x),
            horizontal=True,
        )

        st.markdown("<div style='height: 12px'></div>", unsafe_allow_html=True)

        scenario_choice = None
        emotional_start = "neutral"
        selected_transcript = None
        selected_real = None

        col1, col2 = st.columns(2)

        with col2:
            if mode == "simulator":
                scenarios = st.session_state.orchestrator.list_scenarios()
                scenario_choice = st.selectbox(
                    "Customer issue", options=list(scenarios.keys()),
                    format_func=lambda x: scenarios[x],
                )
                real_scenarios = st.session_state.orchestrator.session_config_module.load_real_scenarios()
                for rs in real_scenarios:
                    if rs["id"] == scenario_choice:
                        selected_real = rs
                        break
                emotional_start = st.selectbox("Starting emotion", ["frustrated", "angry", "neutral", "satisfied"])

            elif mode == "replay":
                transcripts = st.session_state.orchestrator.list_transcripts()
                if transcripts:
                    transcript_labels = {
                        "campaign_video_not_rendering.json": "Campaign Video Rendering Failure",
                        "billing_double_deducted.json": "Billing Double Charge",
                        "sample_transcript.json": "Sample - Generic Support Chat",
                    }
                    selected_transcript = st.selectbox(
                        "Select transcript", transcripts,
                        format_func=lambda x: transcript_labels.get(x, x),
                    )
                else:
                    st.info("Place .json or .txt transcripts in data/transcripts/")

        with col1:
            agent_name = st.text_input("Your name", value=st.session_state.get("agent_name", "Agent"))
            if mode == "simulator":
                default_company = selected_real.get("product_context", "SaaS Platform") if selected_real else "SaaS Platform"
                product_context = st.text_input(
                    "Company / Platform", value=default_company, disabled=True,
                    help="Auto-detected from selected scenario."
                )
            else:
                product_context = st.text_input(
                    "Company / Platform", value="SaaS Platform",
                    help="What company/product are you supporting?"
                )

        # Render description boxes outside columns to fix vertical alignment
        if mode == "simulator" and selected_real:
            st.markdown(
                f'<div style="background:linear-gradient(145deg,rgba(99,102,241,0.08),rgba(30,41,59,0.7));'
                f'border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:12px;margin:8px 0">'
                f'<div style="font-weight:600;color:#f1f5f9;font-size:0.9em;margin-bottom:4px">{selected_real["title"]}</div>'
                f'<div style="color:#94a3b8;font-size:0.8em;line-height:1.4">{selected_real.get("customer_persona", "")}</div>'
                f'<div style="color:#6366f1;font-size:0.75em;margin-top:6px">Product: {selected_real.get("product_context", "Platform")}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        elif mode == "replay" and selected_transcript:
            st.markdown(
                f'<div style="background:linear-gradient(145deg,rgba(99,102,241,0.08),rgba(30,41,59,0.7));'
                f'border:1px solid rgba(0,200,83,0.2);border-radius:12px;padding:10px;margin:8px 0">'
                f'<div style="color:#66bb6a;font-size:0.85em;font-weight:600">Real transcript: {transcript_labels.get(selected_transcript, selected_transcript)}</div>'
                f'<div style="color:#94a3b8;font-size:0.75em">Step through message by message with live coaching</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

        st.markdown(
            f'<div style="background:linear-gradient(145deg,rgba(16,185,129,0.1),rgba(30,41,59,0.7));'
            f'border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:12px 16px;'
            f'display:flex;align-items:center;gap:10px;margin-bottom:16px">'
            f'<span style="font-size:1.5em">📚</span>'
            f'<div><div style="font-weight:600;color:#10b981">{kb_count} articles ready</div>'
            f'<div style="font-size:0.75em;color:#94a3b8">Upload more in the sidebar</div></div></div>',
            unsafe_allow_html=True,
        )

    with tab2:
        col_h, col_hi, col_m = st.columns(3)
        with col_h:
            st.markdown(
                '<div style="background:linear-gradient(145deg,rgba(239,68,68,0.08),rgba(30,41,59,0.7));'
                'border:1px solid rgba(239,68,68,0.15);border-radius:16px;padding:20px">'
                '<div style="font-size:1.5em;margin-bottom:8px">🔥</div>'
                '<div style="font-weight:700;font-size:1.1em;color:#f1f5f9;margin-bottom:6px">Humor Mode</div>'
                '<div style="color:#94a3b8;font-size:0.85em;line-height:1.5">'
                'Bad responses get roasted. Good ones get praised. '
                'Roasty tips keep it fun.<br><br>'
                '<span style="color:#ef4444">Roasts</span> show in red &bull; '
                '<span style="color:#a78bfa">Tips</span> in purple &bull; '
                '<span style="color:#34d399">Compliments</span> in green</div></div>',
                unsafe_allow_html=True,
            )
            humor_mode = st.toggle("Enable Humor Mode", value=st.session_state.get("humor_mode", False))

        with col_hi:
            st.markdown(
                '<div style="background:linear-gradient(145deg,rgba(245,158,11,0.08),rgba(30,41,59,0.7));'
                'border:1px solid rgba(245,158,11,0.15);border-radius:16px;padding:20px">'
                '<div style="font-size:1.5em;margin-bottom:8px">🇮🇳</div>'
                '<div style="font-weight:700;font-size:1.1em;color:#f1f5f9;margin-bottom:6px">Hinglish Mode</div>'
                '<div style="color:#94a3b8;font-size:0.85em;line-height:1.5">'
                'Simulate authentic Tier-2/Tier-3 customers who actively mix Hindi and English in their chats.<br><br>'
                'Expect phrases like <i>"mera account chal nahi raha hai"</i> and <i>"please check karo yaar"</i>.</div></div>',
                unsafe_allow_html=True,
            )
            hinglish_mode = st.toggle("Enable Hinglish Mode", value=st.session_state.get("hinglish_mode", False))

        with col_m:
            tiers = list(ModelConfig.SENTIMENT_MODELS.keys())
            def get_model_label(t):
                name = ModelConfig.SENTIMENT_MODELS[t]["name"]
                if t == "medium":
                    return f"{name} (Best Balance - Recommended)"
                elif t == "xxlarge":
                    return f"{name} (Highest Accuracy)"
                elif t == "light":
                    return f"{name} (Fastest)"
                return name
                
            ml_tier = st.selectbox(
                "Select ML Model for Sentiment Analysis",
                options=tiers,
                format_func=get_model_label,
                index=1,
            )

        st.session_state.humor_mode = humor_mode
        st.session_state.hinglish_mode = hinglish_mode

    with tab3:
        st.markdown(
            "| Mode | What it does |\n|---|---|\n"
            "| **Simulator** | AI customer generates support messages turn by turn. You practice responding as a support agent. |\n"
            "| **Manual** | Paste real customer messages from your support queue. Get live coaching and response suggestions. |\n"
            "| **Replay** | Load a real transcript and step through it message by message with live coaching. |\n\n"
            "**Scenarios include:** Missing food items, billing double charge, API webhook failures, "
            "avatar voice-sync lag, edge caching issues, custom domain setup errors, and more.\n\n"
            "**After each session** you get a performance report with sentiment journey, "
            "resolution quality score, and personalized coaching recommendations.\n\n"
            "**Coach Calibration Engine** learns when you need help and stays quiet when you're handling things well.\n\n"
            "**Humor Mode** adds roasts for bad responses and compliments for good ones to keep training fun."
        )

    if st.button("Start Session", type="primary", use_container_width=True):
        st.session_state.humor_mode = humor_mode
        st.session_state.ml_tier = ml_tier
        _start_session(
            mode, agent_name, product_context,
            scenario_choice if mode == "simulator" else None,
            emotional_start if mode == "simulator" else None,
            selected_transcript if mode == "replay" else None,
        )


def _start_quick(mode: str):
    scenarios = st.session_state.orchestrator.list_scenarios()
    choice = list(scenarios.keys())[0] if mode == "simulator" and scenarios else None
    _start_session(mode, "Agent", "SaaS Platform", choice, "neutral", None)


def _start_session(mode, agent_name, product_context, scenario_choice, emotional_start, transcript_name):
    scenario = None
    transcript_path = None
    if mode == "simulator" and scenario_choice:
        real_scenarios = st.session_state.orchestrator.session_config_module.load_real_scenarios()
        selected_real = None
        for rs in real_scenarios:
            if rs["id"] == scenario_choice:
                selected_real = rs
                break
        if selected_real:
            scenario = st.session_state.orchestrator.session_config_module.create_scenario_from_real(selected_real)
        else:
            scenario = st.session_state.orchestrator.session_config_module.create_scenario(
                title=scenario_choice, problem_description=scenario_choice,
                customer_persona="Customer", product_context=product_context,
                emotional_start=emotional_start or "neutral",
            )
    if mode == "replay" and transcript_name:
        transcript_path = os.path.join("data", "transcripts", transcript_name)

    session = st.session_state.orchestrator.start_session(
        mode=InteractionMode(mode), agent_name=agent_name,
        product_context=product_context, scenario=scenario,
        transcript_path=transcript_path,
    )

    st.session_state.orchestrator.conversation_manager.humor_mode = st.session_state.get("humor_mode", False)

    if mode == "simulator":
        st.session_state.last_turn = (
            session.turn_analyses[-1] if session.turn_analyses else None
        )
    st.session_state.session = session
    st.session_state.page = "coaching"
    st.rerun()


def coaching_page():
    session = st.session_state.session
    if not session:
        st.session_state.page = "setup"
        st.rerun()
        return

    render_sidebar()

    mode_label = {
        InteractionMode.SIMULATOR: "Simulator",
        InteractionMode.MANUAL: "Manual",
        InteractionMode.REPLAY: "Replay",
    }.get(session.config.mode, "Unknown")

    humor_on = st.session_state.get("humor_mode", False)
    humor_badge = (
        '<span style="background:linear-gradient(135deg,#dc2626,#ef4444);color:white;padding:3px 10px;'
        'border-radius:8px;font-size:0.7em;font-weight:700;margin-left:8px;animation:pulse 2s infinite">'
        'HUMOR ON</span>'
    ) if humor_on else ""

    st.markdown(
        f'<div style="display:flex;align-items:center;gap:16px;padding:12px 0">'
        f'<div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));'
        f'border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:8px 16px">'
        f'<span style="color:#94a3b8;font-size:0.75em;font-weight:600">MODE</span><br>'
        f'<span style="color:#f1f5f9;font-weight:700">{mode_label}</span></div>'
        f'<div style="background:linear-gradient(145deg,rgba(6,182,212,0.15),rgba(30,41,59,0.7));'
        f'border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:8px 16px">'
        f'<span style="color:#94a3b8;font-size:0.75em;font-weight:600">TURN</span><br>'
        f'<span style="color:#f1f5f9;font-weight:700">{session.current_turn}</span></div>'
        f'<div style="background:linear-gradient(145deg,rgba(16,185,129,0.15),rgba(30,41,59,0.7));'
        f'border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:8px 16px">'
        f'<span style="color:#94a3b8;font-size:0.75em;font-weight:600">PRODUCT</span><br>'
        f'<span style="color:#f1f5f9;font-weight:700">{session.config.product_context}</span></div>'
        f'{humor_badge}'
        f'<div style="margin-left:auto">'
        f'</div></div>',
        unsafe_allow_html=True,
    )

    if st.button("End Session", use_container_width=True, type="secondary"):
        report = st.session_state.orchestrator.end_session()
        st.session_state.report = report
        st.session_state.page = "report"
        st.rerun()

    st.divider()



    if session.turn_analyses:
        import plotly.graph_objects as go
        turns = [t.turn_number for t in session.turn_analyses]
        frustration = [t.intent_analysis.frustration_level * 100 if t.intent_analysis else 0 for t in session.turn_analyses]
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=turns, y=frustration, mode='lines+markers', name='Frustration', 
            line=dict(color='#ef4444', width=3), marker=dict(size=8, color='#dc2626')
        ))
        
        fig.update_layout(
            title="Live Customer Heartbeat (Frustration Level %)",
            height=250,
            margin=dict(l=20, r=20, t=40, b=20),
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='#94a3b8'),
            xaxis=dict(showgrid=False, title="Conversation Turn", tickmode='linear'),
            yaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.05)', range=[0, 100])
        )
        with st.expander("Live Satisfaction Dashboard", expanded=True):
            st.plotly_chart(fig, use_container_width=True)

    panels = st.columns([1.2, 1, 1])
    with panels[0]:
        st.markdown(
            '<div class="panel-header"><span class="icon">💬</span> Conversation</div>'
            '<div class="panel-subtitle">%d message%s</div>' % (
                len(session.messages), "s" if len(session.messages) != 1 else ""
            ),
            unsafe_allow_html=True,
        )
        render_conversation_panel(session)
    with panels[1]:
        st.markdown(
            '<div class="panel-header"><span class="icon">🎯</span> Coaching</div>'
            '<div class="panel-subtitle">%d turn%s analyzed</div>' % (
                len([t for t in session.turn_analyses if t.coaching_feedback]),
                "s" if len([t for t in session.turn_analyses if t.coaching_feedback]) != 1 else ""
            ),
            unsafe_allow_html=True,
        )
        render_coaching_panel(st.session_state.last_turn, session)
    with panels[2]:
        st.markdown(
            '<div class="panel-header"><span class="icon">📚</span> Knowledge</div>'
            '<div class="panel-subtitle">Relevant articles</div>',
            unsafe_allow_html=True,
        )
        render_knowledge_panel(st.session_state.last_turn, session)

    st.divider()

    input_row = st.columns([1, 1])

    with input_row[0]:
        st.markdown(
            '<div style="font-weight:700;color:#60a5fa;margin-bottom:8px;display:flex;align-items:center;gap:6px">'
            '<span style="font-size:1.2em">👤</span> Customer</div>',
            unsafe_allow_html=True,
        )
        if session.config.mode == InteractionMode.SIMULATOR:
            last_turn = session.turn_analyses[-1] if session.turn_analyses else None
            if last_turn and last_turn.agent_message is None:
                st.info("Respond as agent first, then advance.")
            if st.button("Next Customer Message", type="primary", use_container_width=True):
                with st.spinner("Customer is typing..."):
                    reply = st.session_state.orchestrator.advance_simulator()
                if reply:
                    st.session_state.last_turn = (
                        session.turn_analyses[-1] if session.turn_analyses else None
                    )
                    st.rerun()
        elif session.config.mode == InteractionMode.MANUAL:
            customer_text = st.text_area(
                "Paste customer message:",
                placeholder="Paste the customer's message here...",
                key="customer_input", height=80,
            )
            if st.button("Process Message", type="primary", use_container_width=True) and customer_text.strip():
                turn = st.session_state.orchestrator.process_customer_input(customer_text.strip())
                st.session_state.last_turn = turn
                st.rerun()
        elif session.config.mode == InteractionMode.REPLAY:
            if st.button("Next Message", type="primary", use_container_width=True):
                transcript = session.config.transcript_path
                if transcript and os.path.exists(transcript):
                    msgs = st.session_state.orchestrator.session_config_module.load_transcript(
                        os.path.basename(transcript)
                    )
                    idx = len(session.messages)
                    if idx < len(msgs):
                        msg = msgs[idx]
                        if msg["role"] == "customer":
                            turn = st.session_state.orchestrator.process_customer_input(msg["content"])
                            st.session_state.last_turn = turn
                        elif msg["role"] == "agent":
                            st.session_state.orchestrator.process_agent_input(msg["content"])
                        st.rerun()
                    else:
                        st.info("End of transcript reached.")

    with input_row[1]:
        st.markdown(
            '<div style="font-weight:700;color:#34d399;margin-bottom:8px;display:flex;align-items:center;gap:6px">'
            '<span style="font-size:1.2em">🤖</span> You (Agent)</div>',
            unsafe_allow_html=True,
        )
        agent_text = st.text_area(
            "Write your reply:",
            placeholder="Type your response as a support agent...",
            key="agent_input", height=80,
        )
        if st.button("Submit Response", use_container_width=True) and agent_text.strip():
            st.session_state.orchestrator.process_agent_input(agent_text.strip())
            st.session_state.last_turn = (
                session.turn_analyses[-1] if session.turn_analyses else None
            )
            st.rerun()

    st.divider()
    if st.button("New Session", use_container_width=True):
        reset_session()
        st.session_state.page = "setup"
        st.rerun()


def report_page():
    render_sidebar()

    st.markdown(
        '<div class="hero-title" style="font-size:2.2em">Session Complete</div>',
        unsafe_allow_html=True,
    )

    if st.session_state.report:
        render_performance_report(st.session_state.report)
    else:
        st.warning("No report available.")

    st.divider()
    col1, col2, col3 = st.columns(3)
    if col1.button("New Session", use_container_width=True, type="primary"):
        reset_session()
        st.session_state.page = "setup"
        st.rerun()
    if col2.button("Analytics", use_container_width=True):
        st.session_state.page = "analytics"
        st.rerun()


def analytics_page():
    render_sidebar()

    st.markdown(
        '<div class="hero-title" style="font-size:2.2em">Performance Analytics</div>',
        unsafe_allow_html=True,
    )

    trends = st.session_state.orchestrator.get_performance_trends()

    mcols = st.columns(3)
    for i, (label, value) in enumerate([
        ("Total Sessions", str(trends["total_sessions"])),
        ("Avg Resolution", "%d%%" % (trends["avg_resolution_score"] * 100)),
        ("Avg Overall", "%d%%" % (trends["avg_overall_score"] * 100)),
    ]):
        with mcols[i]:
            st.metric(label, value)

    if trends["score_history"]:
        st.markdown("#### Score Trend")
        import pandas as pd
        st.line_chart(pd.DataFrame(trends["score_history"]), x="session", y="score")

    col1, col2 = st.columns(2)
    with col1:
        if trends["common_escalation_triggers"]:
            st.markdown("#### Escalation Triggers")
            for t, c in trends["common_escalation_triggers"]:
                st.markdown(f"- {t} (x{c})")
        if trends["agent_improvement_areas"]:
            st.markdown("#### Improvement Areas")
            for a, c in trends["agent_improvement_areas"]:
                st.markdown(f"- {a}")
    with col2:
        if trends["common_knowledge_gaps"]:
            st.markdown("#### Knowledge Gaps")
            for g, c in trends["common_knowledge_gaps"]:
                st.markdown(f"- {g}")

    st.divider()
    if st.button("Back to Start", use_container_width=True):
        reset_session()
        st.session_state.page = "setup"
        st.rerun()


def main():
    init_session_state()
    page_map = {
        "setup": setup_page,
        "coaching": coaching_page,
        "report": report_page,
        "analytics": analytics_page,
    }
    page_map.get(st.session_state.page, setup_page)()


if __name__ == "__main__":
    main()
