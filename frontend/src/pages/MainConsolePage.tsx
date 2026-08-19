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
  Zap,
  Wifi,
  WifiOff,
  RotateCcw,
  Square,
  AlertOctagon,
  Volume2,
  Languages,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { READER_LANGUAGES, speakText, stopSpeaking, readerLabel } from '../utils/speech';
import { api } from '../services/api';
import { KnowledgeModal } from '../components/KnowledgeModal';
import { TranscriptPicker, TranscriptDetail } from '../components/TranscriptPicker';
import { useCoachSocket } from '../hooks/useCoachSocket';

interface TranscriptItem {
  id: string;
  filename: string;
  title: string;
  messages: Array<{ sender: 'customer' | 'agent'; content: string }>;
}

export const MainConsolePage: React.FC = () => {
  const { 
    activeSession, 
    setActiveSession, 
    messages, 
    setMessages, 
    addMessage, 
    currentCoaching, 
    setCurrentCoaching,
    setSelectedCitation,
    readerLang,
    setReaderLang,
    translations,
    setTranslations 
  } = useStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const initialMode = requestedMode === 'manual' || requestedMode === 'replay' ? requestedMode : 'simulator';
  const [mode, setMode] = useState<'simulator' | 'manual' | 'replay'>(initialMode);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [agentDraft, setAgentDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Replay mode state
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptItem | null>(null);
  const [replayTurnIndex, setReplayTurnIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [simSeedTranscript, setSimSeedTranscript] = useState<TranscriptDetail | null>(null);
  const autoReplayStopRef = useRef(false);

  // WebSocket hook integration
  const { isConnected, isReconnecting, isProcessing, activeStage, sendChatMessage, triggerSimulatorNext: socketSimulatorNext, ensureSocketOpen, waitForTurnComplete } = useCoachSocket({
    sessionId: activeSession?.id || null,
  });

  useEffect(() => {
    if (!activeSession) {
      createDefaultSession(mode);
    } else {
      api.get(`/session/${activeSession.id}`).then((res) => {
        const data = res.data;
        if (data?.messages?.length) {
          setMessages(data.messages);
          const lastAnalyzed = [...data.messages].reverse().find((m: any) => m.analysis);
          if (lastAnalyzed?.analysis) setCurrentCoaching(lastAnalyzed.analysis);
        }
      }).catch(() => {});
    }
    fetchTranscripts();
  }, []);

  useEffect(() => {
    if ((requestedMode === 'simulator' || requestedMode === 'manual' || requestedMode === 'replay') && requestedMode !== mode) {
      handleModeChange(requestedMode);
    }
  }, [requestedMode]);

  const normalizeTranscriptMessages = (messages: any[]): Array<{ sender: 'customer' | 'agent'; content: string }> => {
    return (messages || []).map((item) => {
      const rawSender = item.sender || item.role || 'customer';
      const sender = rawSender === 'user' || rawSender === 'customer' ? 'customer' : 'agent';
      return { sender, content: item.content || '' };
    });
  };

  const fetchTranscripts = async () => {
    try {
      const res = await api.get('/chat/transcripts');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const normalized = res.data.map((t: any) => ({
          ...t,
          messages: normalizeTranscriptMessages(t.messages),
        }));
        setTranscripts(normalized);
        // Respect a transcript chosen in the SessionsPage setup modal.
        const requested = searchParams.get('transcript');
        const match = requested ? normalized.find((t: any) => t.id === requested) : null;
        setSelectedTranscript(match || normalized[0]);
      }
    } catch (err) {
      console.error('Failed to fetch transcripts:', err);
    }
  };

  const createDefaultSession = async (selectedMode: 'simulator' | 'manual' | 'replay', scenarioOverride?: string) => {
    try {
      const res = await api.post('/session/create', {
        mode: selectedMode,
        product: 'Cloud SaaS Platform',
        category: 'Billing & Account',
        scenario: scenarioOverride || 'Unrecognized Billing Charge & Double Invoice',
        persona: 'Angry',
        difficulty: 'medium'
      });
      setActiveSession(res.data);
      setMessages([]);
      setCurrentCoaching(null);
      setReplayTurnIndex(0);
      setIsReplaying(false);
      setReplayError(null);
      // Trigger initial customer turn via socket once connected (fallback to REST)
      if (selectedMode === 'simulator') {
        const sessionId = res.data.id;
        const ready = await ensureSocketOpen(4000);
        if (ready) {
          const sent = socketSimulatorNext();
          if (!sent) {
            triggerSimulatorNextRest(sessionId);
          }
        } else {
          triggerSimulatorNextRest(sessionId);
        }
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const triggerSimulatorNextRest = async (sessionId: string) => {
    try {
      const r = await api.post(`/chat/simulator-next?session_id=${sessionId}`);
      addMessage(r.data.message);
      if (r.data.coaching) setCurrentCoaching(r.data.coaching);
    } catch (err) {
      console.error('Simulator REST fallback error:', err);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isProcessing]);

  const handleSimulatorNextTurn = async () => {
    if (!activeSession) return;
    setLoadingTurn(true);
    const sent = socketSimulatorNext();
    if (sent) {
      setLoadingTurn(false);
      return;
    }
    // Socket not open yet — wait briefly, then retry via socket, else REST fallback.
    const ready = await ensureSocketOpen(3000);
    if (ready) {
      const retried = socketSimulatorNext();
      if (retried) {
        setLoadingTurn(false);
        return;
      }
    }
    await triggerSimulatorNextRest(activeSession.id);
    setLoadingTurn(false);
  };

  const handleSendAgentResponse = async () => {
    if (!inputText.trim() || !activeSession) return;

    const content = inputText;
    setInputText('');

    const sent = sendChatMessage('agent', content);
    if (!sent) {
      try {
        const res = await api.post('/chat/message', {
          session_id: activeSession.id,
          sender: 'agent',
          content: content
        });
        addMessage(res.data.message);

        // REST fallback: the pipeline already finished before this response returned.
        if (mode === 'simulator') {
          await waitMs(1200);
          handleSimulatorNextTurn();
        }
      } catch (err) {
        console.error('Error sending agent response:', err);
      }
    } else if (mode === 'simulator') {
      // Event-driven: advance only after the agent reply's pipeline has actually
      // completed (turn_complete), then pause briefly for readability.
      await waitForTurnComplete();
      await waitMs(1200);
      handleSimulatorNextTurn();
    }
  };

  const handleManualAnalyze = async () => {
    if (!inputText.trim() || !activeSession) return;

    const content = inputText;
    setInputText('');

    const sent = sendChatMessage('customer', content);
    if (!sent) {
      setLoadingTurn(true);
      try {
        const res = await api.post('/chat/manual', {
          session_id: activeSession.id,
          sender: 'customer',
          content: content
        });
        addMessage(res.data.message);
        if (res.data.coaching) {
          setCurrentCoaching(res.data.coaching);
        }
      } catch (err) {
        console.error('Manual mode coaching error:', err);
      } finally {
        setLoadingTurn(false);
      }
    }
  };

  const resolveSender = (turn: { sender?: string; role?: string }): 'customer' | 'agent' => {
    const raw = (turn.sender || turn.role || 'customer') as string;
    return raw === 'user' || raw === 'customer' ? 'customer' : 'agent';
  };

  const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const handleReplayNextTurn = async () => {
    if (!selectedTranscript || !activeSession) return;
    const turns = selectedTranscript.messages;
    if (replayTurnIndex >= turns.length) return;

    const currentTurn = turns[replayTurnIndex];
    setReplayTurnIndex(prev => prev + 1);
    setReplayError(null);

    const sender = resolveSender(currentTurn as any);
    const sent = sendChatMessage(sender, currentTurn.content);
    if (sent) {
      return;
    }
    // Socket not ready — wait briefly and retry via socket, else REST fallback.
    const ready = await ensureSocketOpen(3000);
    if (ready) {
      const retried = sendChatMessage(sender, currentTurn.content);
      if (retried) return;
    }
    setLoadingTurn(true);
    try {
      const res = await api.post('/chat/message', {
        session_id: activeSession.id,
        sender: sender,
        content: currentTurn.content
      });
      addMessage(res.data.message);
      if (res.data.coaching) {
        setCurrentCoaching(res.data.coaching);
      }
    } catch (err) {
      console.error('Replay turn error:', err);
    } finally {
      setLoadingTurn(false);
    }
  };

  const sendReplayTurnViaSocket = async (sender: 'customer' | 'agent', content: string): Promise<boolean> => {
    // Prefer the live WebSocket (single transport, per-stage streaming). Wait for its turn_complete.
    if (sendChatMessage(sender, content)) {
      await waitForTurnComplete();
      return true;
    }
    // Socket not open — wait briefly for (re)connect, then retry via socket.
    const ready = await ensureSocketOpen(2500);
    if (ready && sendChatMessage(sender, content)) {
      await waitForTurnComplete();
      return true;
    }
    return false;
  };

  const handleStartAutoReplay = async () => {
    if (!selectedTranscript || !activeSession || isReplaying) return;
    const turns = selectedTranscript.messages;
    if (!turns.length) return;

    autoReplayStopRef.current = false;
    setIsReplaying(true);
    setReplayError(null);
    setReplayTurnIndex(0);
    setMessages([]);
    setCurrentCoaching(null);

    try {
      for (let i = 0; i < turns.length; i++) {
        if (autoReplayStopRef.current) break;

        const turn = turns[i];
        const sender = resolveSender(turn as any);
        setReplayTurnIndex(i + 1);

        const ok = await sendReplayTurnViaSocket(sender, turn.content);
        if (!ok) {
          setReplayError('Replay paused: real-time socket unavailable. Reconnect and try again.');
          break;
        }

        // Readable, human-paced cadence between turns.
        await waitMs(900);
      }
    } catch (err) {
      console.error('Auto replay error:', err);
      setReplayError('Replay stopped unexpectedly.');
    } finally {
      setReplayTurnIndex(turns.length);
      setIsReplaying(false);
      autoReplayStopRef.current = false;
    }
  };

  const handleStopAutoReplay = () => {
    autoReplayStopRef.current = true;
  };

  const handleSimulatorSeed = (t: TranscriptDetail | null) => {
    setSimSeedTranscript(t);
    if (t) {
      createDefaultSession('simulator', t.scenario_suggestion || t.title);
    }
  };

  // Translated Recommended Response (when a non-English language is active).
  const suggestedText = (): string => {
    const src = currentCoaching?.suggested_reply;
    if (!src) return '';
    return translations[`${readerLang}:suggested:${src}`] || src;
  };

  const handleApplySuggestedReply = () => {
    // Use the ORIGINAL reply so the stored agent message stays in the source
    // language (translation is display-only and reversible by switching languages).
    if (currentCoaching?.suggested_reply) {
      setInputText(currentCoaching.suggested_reply);
    }
  };

  const handleReadAloud = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopSpeaking();
      setSpeakingMsgId(null);
      return;
    }
    stopSpeaking();
    setSpeakingMsgId(msgId);
    speakText(text, () => {
      setSpeakingMsgId((cur) => (cur === msgId ? null : cur));
    });
  };

  // Display + speak the translated text when a non-English language is active.
  const msgText = (msg: { id: string; content: string }): string => {
    if (readerLang === 'en') return msg.content;
    return translations[`${readerLang}:${msg.id}`] || msg.content;
  };

  // Translate on language change (or as new messages arrive) using the persistent
  // store cache. Requests are deduped by key and results are always merged back in,
  // so fast streaming messages no longer cancel in-flight translations.
  const translationQueueRef = useRef<Set<string>>(new Set());
  const translatePendingRef = useRef(false);

  useEffect(() => {
    if (readerLang === 'en') return;

    const pending: Array<{ id: string; text: string }> = [];
    const suggestedReply = currentCoaching?.suggested_reply;
    if (suggestedReply) {
      const key = `${readerLang}:suggested:${suggestedReply}`;
      if (!translations[key] && !translationQueueRef.current.has(key)) pending.push({ id: key, text: suggestedReply });
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const key = `${readerLang}:${m.id}`;
      if (!translations[key] && !translationQueueRef.current.has(key) && m.content) {
        pending.push({ id: key, text: m.content });
      }
    }
    if (pending.length === 0) return;

    pending.forEach((p) => translationQueueRef.current.add(p.id));
    const delay = translatePendingRef.current ? 250 : 0;

    const translateBatch = async (batch: Array<{ id: string; text: string }>) => {
      try {
        const res = await api.post('/chat/translate', {
          target_language: readerLabel(readerLang),
          messages: batch,
        });
        if (res.data?.translations?.length) {
          setTranslations((prev: Record<string, string>) => {
            const map: Record<string, string> = { ...prev };
            (res.data.translations as Array<{ id: string; text: string }>).forEach((t) => {
              if (t) map[t.id] = t.text;
            });
            return map;
          });
        }
      } catch (err) {
        console.error('Translation failed:', err);
      } finally {
        batch.forEach((b) => translationQueueRef.current.delete(b.id));
      }
    };

    const flush = async () => {
      if (translatePendingRef.current) return;
      translatePendingRef.current = true;
      try {
        await translateBatch(pending.slice(0, 3));
        for (let i = 3; i < pending.length; i += 5) {
          await translateBatch(pending.slice(i, i + 5));
        }
      } finally {
        translatePendingRef.current = false;
      }
    };

    const timer = setTimeout(flush, delay);
    return () => clearTimeout(timer);
  }, [readerLang, messages, translations, currentCoaching, setTranslations]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const [copiedReply, setCopiedReply] = useState(false);
  const handleCopyReply = async () => {
    if (!currentCoaching?.suggested_reply) return;
    try {
      await navigator.clipboard.writeText(suggestedText());
      setCopiedReply(true);
      setTimeout(() => setCopiedReply(false), 1500);    } catch (err) {
      console.error('Failed to copy suggested reply:', err);
    }
  };

  // Agent Feedback Loop: thumbs-up/down on the suggested reply + reasoning.
  // Ratings are persisted and re-fed into the coaching prompt on later turns.
  const [feedbackFor, setFeedbackFor] = useState<{ analysisId?: string; rating: 'helpful' | 'not_helpful' | null }>({ rating: null });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const submitFeedback = async (rating: 'helpful' | 'not_helpful') => {
    const analysisId = currentCoaching?.id;
    if (!analysisId || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      await api.post('/analytics/coaching-feedback', { analysis_id: analysisId, rating });
      setFeedbackFor({ analysisId, rating });
    } catch (err) {
      console.error('Failed to submit coaching feedback:', err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    const analysisId = currentCoaching?.id;
    setFeedbackFor((prev) =>
      prev.analysisId !== analysisId ? { analysisId, rating: null } : prev
    );
  }, [currentCoaching?.id]);

  const handleModeChange = (newMode: 'simulator' | 'manual' | 'replay') => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
    autoReplayStopRef.current = true;
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

          {/* Read-Aloud Language Selector */}
          <div className="flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={readerLang}
              onChange={(e) => {
                stopSpeaking();
                setSpeakingMsgId(null);
                setReaderLang(e.target.value);
              }}
              title="Choose the language for reading messages aloud"
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs p-1.5 focus:outline-none focus:border-indigo-500"
            >
              {READER_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label} · {lang.native}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" /> Real-time Socket Connected
            </span>
          ) : isReconnecting ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/50 animate-pulse">
              <WifiOff className="w-3 h-3 text-rose-400" /> Connection Lost — Reconnecting...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/50">
              <WifiOff className="w-3 h-3 text-amber-400" /> Connecting Socket...
            </span>
          )}

          {isProcessing && activeStage && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60 animate-pulse">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Pipeline Stage: {activeStage}
            </span>
          )}

          {activeSession && (
            <div className="hidden xl:flex items-center gap-4 text-slate-400 whitespace-nowrap border-l border-slate-800 pl-3">
              <span>Product: <strong className="text-slate-200">{activeSession.product}</strong></span>
              <span>Scenario: <strong className="text-slate-200">{activeSession.scenario}</strong></span>
              <span>Persona: <strong className="text-indigo-400 uppercase">{activeSession.persona}</strong></span>
            </div>
          )}
        </div>
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
                onClick={handleSimulatorNextTurn}
                disabled={loadingTurn || isProcessing}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Play className="w-3 h-3" /> Next Customer Turn
              </button>
            )}
          </div>

          {/* Replay Mode Transcript Selector */}
          {mode === 'replay' && (
            <div className="p-3 border-b border-slate-800 bg-slate-950/80 flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-400">Select Transcript for Replay:</label>
              <div className="flex gap-2">
                <select
                  value={selectedTranscript?.filename || ''}
                  onChange={(e) => {
                    const found = transcripts.find(t => t.filename === e.target.value);
                    if (found) {
                      setSelectedTranscript(found);
                      setReplayTurnIndex(0);
                      setMessages([]);
                      setCurrentCoaching(null);
                      setReplayError(null);
                    }
                  }}
                  className="flex-1 bg-slate-900 text-slate-200 border border-slate-800 rounded-lg text-xs p-1.5 focus:outline-none focus:border-indigo-500"
                >
                  {transcripts.map(t => (
                    <option key={t.filename} value={t.filename}>{t.title}</option>
                  ))}
                </select>
                <button
                  onClick={handleReplayNextTurn}
                  disabled={isProcessing || isReplaying || !selectedTranscript || replayTurnIndex >= (selectedTranscript?.messages.length || 0)}
                  className="px-2.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" /> Next Turn
                </button>
                {isReplaying ? (
                  <button
                    onClick={handleStopAutoReplay}
                    className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={handleStartAutoReplay}
                    disabled={!selectedTranscript}
                    className="px-2.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Auto
                  </button>
                )}
              </div>
              {replayError && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-[11px] text-rose-300">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>{replayError}</span>
                </div>
              )}
            </div>
          )}

          {/* Simulator Mode Seed Selector */}
          {mode === 'simulator' && (
            <div className="p-3 border-b border-slate-800 bg-slate-950/80">
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Optional — Seed scenario from transcript:</label>
              <TranscriptPicker
                value={simSeedTranscript?.id || null}
                onChange={handleSimulatorSeed}
                placeholder="Select a transcript to prefill the simulator scenario..."
              />
            </div>
          )}

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
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => handleReadAloud(msg.id, msgText(msg))}
                          title={speakingMsgId === msg.id ? 'Stop reading' : `Read aloud (${readerLabel(readerLang)})`}
                          className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition ${
                            speakingMsgId === msg.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'
                          }`}
                        >
                          <Volume2 className="w-3 h-3" />
                          {speakingMsgId === msg.id ? 'Stop' : 'Read'}
                        </button>
                        <span>Turn #{msg.turn_index}</span>
                      </span>
                    </div>
                    <p>{msgText(msg)}</p>
                    {readerLang !== 'en' && (
                      <div className="mt-1 text-[9px] text-indigo-300/70 italic">
                        Reading in {readerLabel(readerLang)}
                      </div>
                    )}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (mode === 'manual') {
                    handleManualAnalyze();
                  } else {
                    handleSendAgentResponse();
                  }
                }
              }}
              placeholder={mode === 'manual' ? "Paste customer message to analyze, or type your agent reply..." : "Type your agent response..."}
              className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Press Enter to send</span>
              {mode === 'manual' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendAgentResponse}
                    disabled={!inputText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Agent Reply
                  </button>
                  <button
                    onClick={handleManualAnalyze}
                    disabled={!inputText.trim() || loadingTurn}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Analyze Customer
                  </button>
                </div>
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Recommended Response
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentCoaching?.suggested_reply) handleReadAloud('__suggested_reply__', suggestedText());
                      }}
                      title={speakingMsgId === '__suggested_reply__' ? 'Stop reading' : `Read aloud (${readerLabel(readerLang)})`}
                      className={`px-2.5 py-1 rounded text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-md ${
                        speakingMsgId === '__suggested_reply__'
                          ? 'bg-emerald-600'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" /> {speakingMsgId === '__suggested_reply__' ? 'Stop' : 'Read'}
                    </button>
                    <button
                      onClick={handleCopyReply}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-md"
                    >
                      <Copy className="w-3 h-3" /> {copiedReply ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleApplySuggestedReply}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-md"
                    >
                      <Copy className="w-3 h-3" /> Use Response
                    </button>
                  </div>
                </div>
                {currentCoaching?.id && (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => submitFeedback('helpful')}
                        disabled={feedbackSubmitting || feedbackFor.rating === 'not_helpful'}
                        title="Helpful — keep suggesting responses like this"
                        className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-60 ${
                          feedbackFor.rating === 'helpful'
                            ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300'
                            : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {feedbackFor.rating === 'helpful' ? 'Marked Helpful' : 'Helpful'}
                      </button>
                      <button
                        onClick={() => submitFeedback('not_helpful')}
                        disabled={feedbackSubmitting || feedbackFor.rating === 'helpful'}
                        title="Not helpful — coaching will adapt"
                        className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-60 ${
                          feedbackFor.rating === 'not_helpful'
                            ? 'bg-rose-600/20 border-rose-500/60 text-rose-300'
                            : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-rose-500/50 hover:text-rose-300'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        {feedbackFor.rating === 'not_helpful' ? 'Needs Improvement' : 'Needs Improvement'}
                      </button>
                    </div>
                    {feedbackFor.rating && (
                      <span className="text-[10px] text-slate-500 italic shrink-0">
                        Feedback recorded — future suggestions will adapt.
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {suggestedText()}
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
