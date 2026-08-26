import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Bot, 
  Play, 
  Copy, 
  ShieldAlert,
  Zap,
  Wifi,
  WifiOff,
  RotateCcw,
  Square,
  AlertOctagon,
  Volume2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { speakText, stopSpeaking } from '../utils/speech';
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
  } = useStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const initialMode = requestedMode === 'manual' || requestedMode === 'replay' ? requestedMode : 'simulator';
  const [mode, setMode] = useState<'simulator' | 'manual' | 'replay'>(initialMode);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping] = useState(false);
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
      setSimSeedTranscript(null);
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

  const suggestedText = (): string => {
    return currentCoaching?.suggested_reply || '';
  };

  const handleApplySuggestedReply = () => {
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
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden ui-page animate-enter">
      <KnowledgeModal />

      {/* Top Console Mode Bar */}
      <div className="min-h-14 ui-panel-solid border-b border-[var(--border-subtle)] px-4 md:px-6 py-2 flex items-center justify-between text-xs gap-4 overflow-x-auto">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[var(--text-secondary)]">Interaction Mode:</span>
          <div className="flex bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border-subtle)]">
            {(['simulator', 'manual', 'replay'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition ${
                  mode === m
                    ? 'bg-[var(--brand)] text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m} Mode
              </button>
            ))}
          </div>

        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="ui-chip ui-chip-emerald">
              <Wifi className="w-3 h-3 animate-pulse" /> Real-time Socket Connected
            </span>
          ) : isReconnecting ? (
            <span className="ui-chip ui-chip-rose animate-pulse">
              <WifiOff className="w-3 h-3" /> Connection Lost — Reconnecting...
            </span>
          ) : (
            <span className="ui-chip ui-chip-amber">
              <WifiOff className="w-3 h-3" /> Connecting Socket...
            </span>
          )}

          {isProcessing && activeStage && (
            <span className="ui-chip ui-chip-indigo animate-pulse">
              <Sparkles className="w-3 h-3" /> Pipeline Stage: {activeStage}
            </span>
          )}

          {activeSession && (
            <div className="hidden xl:flex items-center gap-4 text-[var(--text-muted)] whitespace-nowrap border-l border-[var(--border-subtle)] pl-3">
              <span>Product: <strong className="text-[var(--text-primary)]">{activeSession.product}</strong></span>
              <span>Scenario: <strong className="text-[var(--text-primary)]">{activeSession.scenario}</strong></span>
              <span>Persona: <strong className="text-[var(--brand)] uppercase">{activeSession.persona}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* THREE PANEL LAYOUT */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-0 overflow-y-auto xl:overflow-hidden">

        {/* LEFT PANEL: Conversation Feed & Controls (4 Columns) */}
        <div className="xl:col-span-4 xl:border-r border-b xl:border-b-0 border-[var(--border-subtle)] flex flex-col min-h-[34rem] xl:min-h-0 ui-panel">
          <div className="p-3.5 ui-panel-solid flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--brand)]" />
              <h2 className="font-semibold text-xs text-[var(--text-primary)]">Live Support Feed</h2>
            </div>
            {mode === 'simulator' && (
              <button
                onClick={handleSimulatorNextTurn}
                disabled={loadingTurn || isProcessing}
                className="ui-btn ui-btn-primary px-2.5 py-1.5"
              >
                <Play className="w-3 h-3" /> Next Customer Turn
              </button>
            )}
          </div>

          {/* Replay Mode Transcript Selector */}
          {mode === 'replay' && (
            <div className="p-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-[var(--text-muted)]">Select Transcript for Replay:</label>
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
                  className="ui-select flex-1 !py-1.5"
                >
                  {transcripts.map(t => (
                    <option key={t.filename} value={t.filename}>{t.title}</option>
                  ))}
                </select>
                <button
                  onClick={handleReplayNextTurn}
                  disabled={isProcessing || isReplaying || !selectedTranscript || replayTurnIndex >= (selectedTranscript?.messages.length || 0)}
                  className="ui-btn ui-btn-primary px-2.5 py-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Next Turn
                </button>
                {isReplaying ? (
                  <button
                    onClick={handleStopAutoReplay}
                    className="ui-btn px-2.5 py-1.5 text-white" style={{ backgroundColor: 'var(--danger)' }}
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={handleStartAutoReplay}
                    disabled={!selectedTranscript}
                    className="ui-btn px-2.5 py-1.5 text-white disabled:opacity-50" style={{ backgroundColor: 'var(--info)' }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Auto
                  </button>
                )}
              </div>
              {replayError && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ui-card-raised text-[11px] text-[var(--danger)]">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>{replayError}</span>
                </div>
              )}
            </div>
          )}

          {/* Simulator Mode Seed Selector */}
          {mode === 'simulator' && (
            <div className="p-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)]">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">Optional — Seed scenario from transcript:</label>
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
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-faint)] space-y-2">
                <Bot className="w-10 h-10 text-[var(--text-faint)] animate-bounce" />
                <p className="text-xs">No messages yet. {mode === 'simulator' ? 'Click "Next Customer Turn" to start.' : 'Paste a customer message below.'}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'customer' && (
                    <div className="w-7 h-7 rounded-full ui-card-raised text-[var(--danger)] flex items-center justify-center font-bold text-xs shrink-0" style={{ background: 'color-mix(in srgb, var(--danger) 18%, transparent)' }}>
                      C
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                      msg.sender === 'agent'
                        ? 'text-white rounded-br-none' 
                        : 'ui-card-raised rounded-bl-none'
                    }`}
                    style={msg.sender === 'agent' ? { background: 'linear-gradient(135deg, var(--brand), var(--brand-strong))' } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 border-b pb-1 text-[10px] opacity-75" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span className="font-semibold capitalize">{msg.sender}</span>
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => handleReadAloud(msg.id, msg.content)}
                          title={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud'}
                          className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition ${
                            speakingMsgId === msg.id
                              ? 'text-white' 
                              : msg.sender === 'agent'
                              ? 'bg-white/20 hover:bg-white/30 text-white'
                              : 'ui-card-raised text-[var(--text-secondary)]'
                          }`}
                          style={speakingMsgId === msg.id ? { backgroundColor: 'var(--success)' } : undefined}
                        >
                          <Volume2 className="w-3 h-3" />
                          {speakingMsgId === msg.id ? 'Stop' : 'Read'}
                        </button>
                        <span>Turn #{msg.turn_index}</span>
                      </span>
                    </div>
                    <p>{msg.content}</p>
                  </div>
                  {msg.sender === 'agent' && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0" style={{ background: 'color-mix(in srgb, var(--brand) 18%, transparent)', color: 'var(--brand)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)' }}>
                      A
                    </div>
                  )}
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs italic pl-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span>Customer is typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Panel */}
          <div className="p-3 border-t border-[var(--border-subtle)] ui-panel-solid space-y-2">
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
              className="ui-textarea resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-faint)]">Press Enter to send</span>
              {mode === 'manual' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendAgentResponse}
                    disabled={!inputText.trim()}
                    className="ui-btn ui-btn-primary px-3 py-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Agent Reply
                  </button>
                  <button
                    onClick={handleManualAnalyze}
                    disabled={!inputText.trim() || loadingTurn}
                    className="ui-btn px-3 py-1.5 text-white disabled:opacity-50" style={{ backgroundColor: 'var(--success)' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Analyze Customer
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSendAgentResponse}
                  disabled={!inputText.trim()}
                  className="ui-btn ui-btn-primary px-3.5 py-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send Reply
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Real-Time Coaching Dashboard (5 Columns) */}
        <div className="xl:col-span-5 xl:border-r border-b xl:border-b-0 border-[var(--border-subtle)] flex flex-col p-4 overflow-y-auto space-y-4 ui-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--brand)]" />
              <h2 className="font-bold text-sm text-[var(--text-primary)]">Real-Time Coaching Feed</h2>
            </div>
            <span className="ui-chip ui-chip-indigo">LangGraph Engine Active</span>
          </div>

          {!currentCoaching ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-faint)] border border-dashed border-[var(--border-subtle)] rounded-2xl">
              <Zap className="w-8 h-8 text-[var(--text-faint)] mb-2 animate-pulse" />
              <p className="text-xs">Awaiting customer message to calculate live intent, sentiment, empathy scores & recommendations.</p>
            </div>
          ) : (
            <>
              {/* Escalation Risk Alert Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                currentCoaching.escalation_risk === 'Critical' || currentCoaching.escalation_risk === 'High'
                  ? 'border-[color-mix(in_srgb,var(--danger)_30%,transparent)]'
                  : currentCoaching.escalation_risk === 'Medium'
                  ? 'border-[color-mix(in_srgb,var(--warning)_30%,transparent)]'
                  : 'border-[color-mix(in_srgb,var(--success)_30%,transparent)]'
              }`}
                style={{
                  background: currentCoaching.escalation_risk === 'Critical' || currentCoaching.escalation_risk === 'High'
                    ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
                    : currentCoaching.escalation_risk === 'Medium'
                    ? 'color-mix(in srgb, var(--warning) 12%, transparent)'
                    : 'color-mix(in srgb, var(--success) 12%, transparent)',
                  color: currentCoaching.escalation_risk === 'Critical' || currentCoaching.escalation_risk === 'High'
                    ? 'var(--danger)'
                    : currentCoaching.escalation_risk === 'Medium'
                    ? 'var(--warning)'
                    : 'var(--success)'
                }}>
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold uppercase tracking-wider">Escalation Risk: {currentCoaching.escalation_risk}</span>
                    <span className="text-[10px] opacity-80">Frustration: {Math.round(currentCoaching.frustration * 100)}%</span>
                  </div>
                  <p className="text-[11px] opacity-90">{currentCoaching.reasoning || "Customer frustration triggers escalation advisory."}</p>
                </div>
              </div>

              {/* Intent & Sentiment Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 ui-card rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Detected Intent</span>
                  <p className="font-bold text-xs text-[var(--brand)]">{currentCoaching.intent}</p>
                </div>
                <div className="p-3 ui-card rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Customer Emotion</span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs text-[var(--danger)]">{currentCoaching.emotion}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded ui-card-raised text-[var(--text-secondary)]">{currentCoaching.sentiment}</span>
                  </div>
                </div>
              </div>

              {/* Quality Score Metrics */}
              <div className="p-4 ui-card rounded-2xl space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Response Evaluation Metrics</h3>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[var(--text-muted)]">Grammar & Quality</span>
                      <span className="font-semibold text-[var(--success)]">{currentCoaching.grammar_score}%</span>
                    </div>
                    <div className="h-1.5 ui-progress-track">
                      <div className="h-full rounded-full" style={{ width: `${currentCoaching.grammar_score}%`, background: 'var(--success)' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[var(--text-muted)]">Tone & Professionalism</span>
                      <span className="font-semibold text-[var(--brand)]">{currentCoaching.tone_score}%</span>
                    </div>
                    <div className="h-1.5 ui-progress-track">
                      <div className="h-full rounded-full" style={{ width: `${currentCoaching.tone_score}%`, background: 'var(--brand)' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[var(--text-muted)]">Empathy Score</span>
                      <span className="font-semibold text-[var(--info)]">{currentCoaching.empathy_score}%</span>
                    </div>
                    <div className="h-1.5 ui-progress-track">
                      <div className="h-full rounded-full" style={{ width: `${currentCoaching.empathy_score}%`, background: 'var(--info)' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Response Box */}
              <div className="p-4 rounded-2xl ui-card border-[color-mix(in_srgb,var(--brand)_35%,transparent)] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-[var(--brand)] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Recommended Response
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentCoaching?.suggested_reply) handleReadAloud('__suggested_reply__', suggestedText());
                      }}
                      title={speakingMsgId === '__suggested_reply__' ? 'Stop reading' : 'Read aloud'}
                      className={`ui-btn px-2.5 py-1 text-white transition ${
                        speakingMsgId === '__suggested_reply__' ? '' : 'ui-btn-ghost text-[var(--text-primary)]'
                      }`}
                      style={speakingMsgId === '__suggested_reply__' ? { backgroundColor: 'var(--success)' } : undefined}
                    >
                      <Volume2 className="w-3 h-3" /> {speakingMsgId === '__suggested_reply__' ? 'Stop' : 'Read'}
                    </button>
                    <button
                      onClick={handleCopyReply}
                      className="ui-btn ui-btn-ghost px-2.5 py-1 text-[var(--text-primary)]"
                    >
                      <Copy className="w-3 h-3" /> {copiedReply ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleApplySuggestedReply}
                      className="ui-btn ui-btn-primary px-2.5 py-1"
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
                            ? 'border-[color-mix(in_srgb,var(--success)_60%,transparent)] text-[var(--success)]'
                            : 'ui-card-raised text-[var(--text-secondary)] hover:text-[var(--success)]'
                        }`}
                        style={feedbackFor.rating === 'helpful' ? { background: 'color-mix(in srgb, var(--success) 18%, transparent)' } : undefined}
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
                            ? 'border-[color-mix(in_srgb,var(--danger)_60%,transparent)] text-[var(--danger)]'
                            : 'ui-card-raised text-[var(--text-secondary)] hover:text-[var(--danger)]'
                        }`}
                        style={feedbackFor.rating === 'not_helpful' ? { background: 'color-mix(in srgb, var(--danger) 18%, transparent)' } : undefined}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        {feedbackFor.rating === 'not_helpful' ? 'Needs Improvement' : 'Needs Improvement'}
                      </button>
                    </div>
                    {feedbackFor.rating && (
                      <span className="text-[10px] text-[var(--text-faint)] italic shrink-0">
                        Feedback recorded — future suggestions will adapt.
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-[var(--text-primary)] ui-card-raised p-3 rounded-xl">
                  {suggestedText()}
                </p>
                <div className="text-[11px] text-[var(--text-muted)] space-y-1">
                  <p className="font-medium text-[var(--text-secondary)]">Reasoning:</p>
                  <p>{currentCoaching.reasoning}</p>
                </div>
              </div>

              {/* Improvement Tips */}
              {currentCoaching.improvement_tips && currentCoaching.improvement_tips.length > 0 && (
                <div className="p-3.5 ui-card rounded-xl space-y-2 text-xs">
                  <span className="font-semibold text-[var(--text-secondary)]">Coaching Guidance & Tips</span>
                  <ul className="space-y-1 text-[var(--text-muted)] text-[11px]">
                    {currentCoaching.improvement_tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand)] shrink-0 mt-0.5" />
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
        <div className="xl:col-span-3 flex flex-col p-4 overflow-y-auto space-y-4 ui-panel">
          <div className="flex items-center justify-between ui-panel-solid rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--brand)]" />
              <h2 className="font-semibold text-xs text-[var(--text-primary)]">RAG Knowledge Base</h2>
            </div>
            <span className="text-[10px] text-[var(--text-faint)]">ChromaDB</span>
          </div>

          {!currentCoaching || !currentCoaching.knowledge_citations || currentCoaching.knowledge_citations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-faint)] text-xs">
              <BookOpen className="w-8 h-8 text-[var(--text-faint)] mb-2" />
              <p>Relevant FAQs, troubleshooting steps, and policy documents will surface here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentCoaching.knowledge_citations.map((doc, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedCitation(doc)}
                  className="p-3.5 ui-card-raised hover:!border-[color-mix(in_srgb,var(--brand)_45%,transparent)] cursor-pointer transition space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--brand)] transition line-clamp-2">
                      {doc.title}
                    </h4>
                    <span className="ui-chip ui-chip-emerald shrink-0">
                      {Math.round((doc.confidence || 0.9) * 100)}% Match
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                    {doc.snippet}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-faint)] border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span>Source: {doc.source}</span>
                    <span className="text-[var(--brand)] font-medium">Click to view</span>
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