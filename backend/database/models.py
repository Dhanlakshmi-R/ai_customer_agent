import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship, backref
from backend.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="agent", nullable=False) # admin, trainer, agent
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    mode = Column(String, nullable=False) # simulator, manual, replay
    product = Column(String, nullable=False)
    category = Column(String, nullable=False)
    scenario = Column(String, nullable=False)
    persona = Column(String, nullable=False) # friendly, confused, angry, technical, business, emotional
    difficulty = Column(String, default="medium")
    conversation_length = Column(Integer, default=10)
    status = Column(String, default="active") # active, completed, cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="session", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    sender = Column(String, nullable=False) # customer, agent
    content = Column(Text, nullable=False)
    turn_index = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="messages")
    analysis = relationship("CoachingAnalysis", back_populates="message", uselist=False, cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    category = Column(String, default="General")
    chunk_count = Column(Integer, default=0)
    topic = Column(String, nullable=True)
    keywords = Column(String, nullable=True)
    version = Column(String, default="1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CoachingAnalysis(Base):
    __tablename__ = "coaching_analysis"

    id = Column(String, primary_key=True, index=True)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    intent = Column(String, nullable=False)
    sentiment = Column(String, nullable=False)
    emotion = Column(String, nullable=False)
    urgency = Column(String, nullable=False)
    frustration = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    tone_score = Column(Float, default=0.0)
    grammar_score = Column(Float, default=0.0)
    empathy_score = Column(Float, default=0.0)
    escalation_risk = Column(String, default="Low") # Low, Medium, High, Critical
    suggested_reply = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=False)
    knowledge_citations = Column(JSON, default=list) # [{title, snippet, source, confidence}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    message = relationship("Message", back_populates="analysis")
    feedback_items = relationship("CoachingFeedback", back_populates="analysis", cascade="all, delete-orphan")

class CoachingFeedback(Base):
    __tablename__ = "coaching_feedback"

    id = Column(String, primary_key=True, index=True)
    analysis_id = Column(String, ForeignKey("coaching_analysis.id"), nullable=False)
    user_id = Column(String, nullable=True)
    rating = Column(String, nullable=False) # helpful, not_helpful
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    analysis = relationship("CoachingAnalysis", back_populates="feedback_items")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    summary = Column(Text, nullable=False)
    sentiment_journey = Column(JSON, default=list)
    resolution_score = Column(Float, default=0.0)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    coaching_tips = Column(JSON, default=list)
    pdf_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="reports")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=False)
