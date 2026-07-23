export type UserRole = 'admin' | 'trainer' | 'agent';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export type InteractionMode = 'simulator' | 'manual' | 'replay';

export interface Session {
  id: string;
  mode: InteractionMode;
  product: string;
  category: string;
  scenario: string;
  persona: string;
  difficulty: string;
  conversation_length: number;
  status: 'active' | 'completed' | 'cancelled';
  message_count?: number;
  created_at: string;
}

export interface KnowledgeCitation {
  title: string;
  snippet: string;
  source: string;
  category: string;
  confidence: number;
  chunk_id: string;
}

export interface CoachingAnalysis {
  intent: string;
  sentiment: string;
  emotion: string;
  urgency: string;
  frustration: number;
  confidence_score: number;
  tone_score: number;
  grammar_score: number;
  empathy_score: number;
  escalation_risk: 'Low' | 'Medium' | 'High' | 'Critical';
  suggested_reply: string;
  reasoning: string;
  improvement_tips?: string[];
  knowledge_citations: KnowledgeCitation[];
}

export interface Message {
  id: string;
  sender: 'customer' | 'agent';
  content: string;
  turn_index: number;
  timestamp: string;
  analysis?: CoachingAnalysis | null;
}

export interface DocumentItem {
  id: string;
  title: string;
  file_type: string;
  category: string;
  chunk_count: number;
  topic?: string;
  keywords?: string;
  version: string;
  created_at: string;
}

export interface ReportItem {
  id: string;
  session_id: string;
  summary: string;
  resolution_score: number;
  sentiment_journey: Array<{ turn: number; sentiment: string; frustration: number; risk: string }>;
  strengths: string[];
  weaknesses: string[];
  coaching_tips: string[];
  pdf_download_url: string;
}

export interface AnalyticsSummary {
  total_sessions: number;
  total_messages: number;
  total_documents: number;
  avg_empathy_score: number;
  avg_tone_score: number;
  avg_grammar_score: number;
  intent_breakdown: Array<{ name: string; value: number }>;
  sentiment_trend: Array<{ date: string; positive: number; neutral: number; negative: number }>;
  escalation_trends: Array<{ name: string; count: number }>;
  sentiment_distribution: Array<{ name: string; value: number }>;
}

export interface SystemSettings {
  openai_api_key: string;
  gemini_api_key: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  llm_model: string;
  temperature: number;
  theme: string;
  language: string;
}
