import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  Bot, 
  User as UserIcon, 
  Play, 
  Flame, 
  Copy, 
  HelpCircle,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { KnowledgeModal } from '../components/KnowledgeModal';

export const MainConsolePage: React.FC = () => {
  const { 
    activeSession, 
    setActiveSession, 
    messages, 
    setMessages, 
    addMessage, 
    currentCoaching, 
    setCurrentCoaching,
    setSelectedCitation 
  } = useStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const initialMode = requestedMode === 'manual' || requestedMode === 'replay' ? requestedMode : 'simulator';
  const [mode, setMode] = useState<'simulator' | 'manual' | 'replay'>(initialMode);
  const [inputText, setInputText] = useState('');
  const [agentDraft, setAgentDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Default Session Setup if none selected
  useEffect(() => {
    if (!activeSession) {
      createDefaultSession(mode);
    }
  }, []);

  useEffect(() => {
    if ((requestedMode === 'simulator' || requestedMode === 'manual' || requestedMode === 'replay') && requestedMode !== mode) {
      handleModeChange(requestedMode);
    }
  }, [requestedMode]);

  const createDefaultSession = async (selectedMode: 'simulator' | 'manual' | 'replay') => {
    try {
      const res = await api.post('/session/create', {
        mode: selectedMode,
        product: 'Cloud SaaS Platform',
        category: 'Billing & Account',
        scenario: 'Unrecognized Billing Charge & Double Invoice',
        persona: 'Angry',
        difficulty: 'medium',
        conversation_length: 10
      });
      setActiveSession(res.data);
      setMessages([]);
      setCurrentCoaching(null);
      // Trigger initial customer turn
      if (selectedMode === 'simulator') {
        triggerSimulatorNext(res.data.id);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const triggerSimulatorNext = async (sessionId?: string) => {
    const sId = sessionId || activeSession?.id;
    if (!sId) return;

    setLoadingTurn(true);
    setIsTyping(true);

    try {
      const res = await api.post(`/chat/simulator-next?session_id=${sId}`);
      setIsTyping(false);
      addMessage(res.data.message);
      if (res.data.coaching) {
        setCurrentCoaching(res.data.coaching);
      }
    } catch (err) {
      console.error('Simulator turn error:', err);
      setIsTyping(false);
    } finally {
      setLoadingTurn(false);
    }
  };

  const handleSendAgentResponse = async () => {
    if (!inputText.trim() || !activeSession) return;

    const content = inputText;
    setInputText('');

    try {
      const res = await api.post('/chat/message', {
        session_id: activeSession.id,
        sender: 'agent',
        content: content
      });
      addMessage(res.data.message);

      // If simulator mode, auto trigger next customer turn after short pause
      if (mode === 'simulator') {
        setTimeout(() => {
          triggerSimulatorNext(activeSession.id);
        }, 1200);
      }
    } catch (err) {
      console.error('Error sending agent response:', err);
    }
  };

  const handleManualAnalyze = async () => {
    if (!inputText.trim() || !activeSession) return;

    setLoadingTurn(true);
    try {
      const res = await api.post('/chat/manual', {
        session_id: activeSession.id,
        sender: 'customer',
        content: inputText
      });
      addMessage(res.data.message);
      if (res.data.coaching) {
        setCurrentCoaching(res.data.coaching);
      }
      setInputText('');
    } catch (err) {
      console.error('Manual mode coaching error:', err);
    } finally {
      setLoadingTurn(false);
    }
  };

  const handleApplySuggestedReply = () => {
    if (currentCoaching?.suggested_reply) {
      setInputText(currentCoaching.suggested_reply);
    }
  };

  const handleModeChange = (newMode: 'simulator' | 'manual' | 'replay') => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
    createDefaultSession(newMode);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-slate-100 animate-enter">
      <KnowledgeModal />

      {/* Top Console Mode Bar */}
      <div className="min-h-14 border-b border-slate-800 bg-slate-900/80 px-4 md:px-6 py-2 flex items-center justify-between text-xs gap-4 overflow-x-auto">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">Interaction Mode:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['simulator', 'manual', 'replay'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition ${
                  mode === m
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m} Mode
              </button>
            ))}
          </div>
        </div>

        {activeSession && (
          <div className="hidden xl:flex items-center gap-4 text-slate-400 whitespace-nowrap">
            <span>Product: <strong className="text-slate-200">{activeSession.product}</strong></span>
            <span>Scenario: <strong className="text-slate-200">{activeSession.scenario}</strong></span>
            <span>Persona: <strong className="text-indigo-400 uppercase">{activeSession.persona}</strong></span>
          </div>
        )}
      </div>

      {/* THREE PANEL LAYOUT */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-0 overflow-y-auto xl:overflow-hidden">

        {/* LEFT PANEL: Conversation Feed & Controls (4 Columns) */}
        <div className="xl:col-span-4 xl:border-r border-b xl:border-b-0 border-slate-800 flex flex-col min-h-[34rem] xl:min-h-0 bg-slate-900/30">
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-xs text-slate-200">Live Support Feed</h2>
            </div>
            {mode === 'simulator' && (
              <button
                onClick={() => triggerSimulatorNext()}
                disabled={loadingTurn}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Play className="w-3 h-3" /> Next Customer Turn
              </button>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <Bot className="w-10 h-10 text-slate-700 animate-bounce" />
                <p className="text-xs">No messages yet. {mode === 'simulator' ? 'Click "Next Customer Turn" to start.' : 'Paste a customer message below.'}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'customer' && (
                    <div className="w-7 h-7 rounded-full bg-rose-950 border border-rose-800/50 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                      C
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'agent'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 border-b border-white/10 pb-1 text-[10px] opacity-75">
                      <span className="font-semibold capitalize">{msg.sender}</span>
                      <span>Turn #{msg.turn_index}</span>
                    </div>
                    <p>{msg.content}</p>
                  </div>
                  {msg.sender === 'agent' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-800/50 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      A
                    </div>
                  )}
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span>Customer is typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Panel */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/80 space-y-2">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={mode === 'manual' ? "Paste customer message here to analyze..." : "Type your agent response..."}
              className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Press Enter to send</span>
              {mode === 'manual' ? (
                <button
                  onClick={handleManualAnalyze}
                  disabled={!inputText.trim() || loadingTurn}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Analyze Message
                </button>
              ) : (
                <button
                  onClick={handleSendAgentResponse}
                  disabled={!inputText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Send Reply
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Real-Time Coaching Dashboard (5 Columns) */}
        <div className="xl:col-span-5 xl:border-r border-b xl:border-b-0 border-slate-800 flex flex-col p-4 overflow-y-auto space-y-4 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-sm text-slate-100">Real-Time Coaching Feed</h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
              LangGraph Engine Active
            </span>
          </div>

          {!currentCoaching ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Zap className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
              <p className="text-xs">Awaiting customer message to calculate live intent, sentiment, empathy scores & recommendations.</p>
            </div>
          ) : (
            <>
              {/* Escalation Risk Alert Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                currentCoaching.escalation_risk === 'Critical' || currentCoaching.escalation_risk === 'High'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : currentCoaching.escalation_risk === 'Medium'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              }`}>
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider">Escalation Risk: {currentCoaching.escalation_risk}</span>
                    <span className="text-[10px] opacity-80">Frustration: {Math.round(currentCoaching.frustration * 100)}%</span>
                  </div>
                  <p className="text-[11px] opacity-90">{currentCoaching.reasoning || "Customer frustration triggers escalation advisory."}</p>
                </div>
              </div>

              {/* Intent & Sentiment Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Detected Intent</span>
                  <p className="font-bold text-xs text-indigo-300">{currentCoaching.intent}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer Emotion</span>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-rose-400">{currentCoaching.emotion}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{currentCoaching.sentiment}</span>
                  </div>
                </div>
              </div>

              {/* Quality Score Metrics */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-semibold text-slate-300">Response Evaluation Metrics</h3>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Grammar & Quality</span>
                      <span className="font-semibold text-emerald-400">{currentCoaching.grammar_score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${currentCoaching.grammar_score}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Tone & Professionalism</span>
                      <span className="font-semibold text-indigo-400">{currentCoaching.tone_score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${currentCoaching.tone_score}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Empathy Score</span>
                      <span className="font-semibold text-purple-400">{currentCoaching.empathy_score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${currentCoaching.empathy_score}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Response Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Recommended Response
                  </span>
                  <button
                    onClick={handleApplySuggestedReply}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-md"
                  >
                    <Copy className="w-3 h-3" /> Use Response
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {currentCoaching.suggested_reply}
                </p>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <p className="font-medium text-slate-300">Reasoning:</p>
                  <p>{currentCoaching.reasoning}</p>
                </div>
              </div>

              {/* Improvement Tips */}
              {currentCoaching.improvement_tips && currentCoaching.improvement_tips.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <span className="font-semibold text-slate-300">Coaching Guidance & Tips</span>
                  <ul className="space-y-1 text-slate-400 text-[11px]">
                    {currentCoaching.improvement_tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL: RAG Knowledge Recommendations (3 Columns) */}
        <div className="xl:col-span-3 flex flex-col p-4 overflow-y-auto space-y-4 bg-slate-900/40">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-xs text-slate-200">RAG Knowledge Base</h2>
            </div>
            <span className="text-[10px] text-slate-400">ChromaDB</span>
          </div>

          {!currentCoaching || !currentCoaching.knowledge_citations || currentCoaching.knowledge_citations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <BookOpen className="w-8 h-8 text-slate-700 mb-2" />
              <p>Relevant FAQs, troubleshooting steps, and policy documents will surface here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentCoaching.knowledge_citations.map((doc, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedCitation(doc)}
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition line-clamp-2">
                      {doc.title}
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0">
                      {Math.round((doc.confidence || 0.9) * 100)}% Match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                    {doc.snippet}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/60 pt-2">
                    <span>Source: {doc.source}</span>
                    <span className="text-indigo-400 font-medium">Click to view</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
