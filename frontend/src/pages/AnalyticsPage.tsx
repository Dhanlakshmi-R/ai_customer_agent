import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { Activity, ShieldAlert, MessageSquare, HeartHandshake, Award, Zap, Bot, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { Message, Session } from '../types';

const RISK_COLOR: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#10b981' };

export const AnalyticsPage: React.FC = () => {
  const { activeSession, setActiveSession } = useStore();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSession = useCallback(async (sessionId: string) => {
    try {
      const res = await api.get(`/session/${sessionId}`);
      setSession(res.data);
    } catch (err) {
      console.error('Failed to fetch session analysis:', err);
    }
  }, []);

  useEffect(() => {
    if (activeSession?.id) {
      setSession(null);
      fetchSession(activeSession.id);
    } else {
      api.get('/session/list').then((res) => {
        const list = res.data || [];
        setSessions(list);
        // Prefer the most meaningful active session (real conversation) instead of
        // auto-created one-message stubs that bubble to the top of the list.
        const withMessages = list.filter((s: Session) => (s as any).message_count > 1);
        const pool = withMessages.length ? withMessages : list;
        const active = pool.find((s: Session) => s.status === 'active') || pool[0];
        if (active) loadSession(active);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, fetchSession]);

  // Live poll while the session is active so the analysis updates as turns stream in.
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const t = setInterval(() => fetchSession(session.id), 5000);
    return () => clearInterval(t);
  }, [session, fetchSession]);

  const analyzed = (session?.messages || []).filter((m: Message) => m.analysis);

  const turnData = analyzed.map((m: Message, i: number) => ({
    turn: i + 1,
    tone: Math.round(m.analysis!.tone_score),
    grammar: Math.round(m.analysis!.grammar_score),
    empathy: Math.round(m.analysis!.empathy_score),
    risk: m.analysis!.escalation_risk,
  }));

  const riskCounts = (['Critical', 'High', 'Medium', 'Low'] as const).map((r) => ({
    name: r,
    count: analyzed.filter((m: Message) => m.analysis!.escalation_risk === r).length,
  }));

  const avg = (k: 'tone_score' | 'grammar_score' | 'empathy_score') => {
    if (!analyzed.length) return 0;
    return Math.round(analyzed.reduce((s: number, m: Message) => s + (m.analysis![k] || 0), 0) / analyzed.length);
  };
  const lastRisk = analyzed.length ? analyzed[analyzed.length - 1].analysis!.escalation_risk : '—';

  const loadSession = (s: Session) => {
    setActiveSession(s);
    setSessions([]);
    setSession(null);
    fetchSession(s.id);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }} className="p-5 md:p-8 space-y-7 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[.16em] font-semibold text-indigo-400">Live session analysis</p>
          <h1 className="page-heading text-2xl md:text-3xl font-bold text-slate-100 mt-1">Current session intelligence</h1>
          <p className="text-xs text-slate-400 mt-2">
            Per-turn coaching analysis for the session being coached in Live Coaching. Refreshes automatically while active.
          </p>
        </div>
        <button
          onClick={() => fetchSession(session?.id || activeSession?.id || '')}
          disabled={!session && !activeSession}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20 disabled:opacity-40"
        >
          <Zap className="w-4 h-4" /> Refresh
        </button>
      </div>

      {!activeSession && !session && (
        <div className="p-10 rounded-2xl glass-card flex flex-col items-center justify-center text-center space-y-4">
          <Bot className="w-12 h-12 text-slate-700" />
          <p className="text-sm text-slate-400 max-w-md">No active coaching session. Start or resume one from Live Coaching, or pick a session below.</p>
          <div className="flex gap-2">
            <button onClick={() => navigate('/console')} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
              Go to Live Coaching
            </button>
          </div>
          {sessions.length > 0 && (
            <div className="w-full max-w-xl mt-4">
              <p className="text-xs font-semibold text-slate-300 mb-2 text-left">Recent sessions:</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition"
                  >
                    <span className="text-xs font-mono text-indigo-400">#{s.id.slice(0, 8)}</span>
                    <span className="text-[10px] uppercase font-bold text-rose-400">{s.persona}</span>
                    <span className="text-[10px] text-slate-400">{s.mode} • {s.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {session && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate(`/console?mode=${session.mode || 'simulator'}`)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Open in Live Coaching
            </button>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300">
              Mode: <strong className="text-indigo-300 uppercase">{session.mode}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300">
              Persona: <strong className="text-rose-400">{session.persona}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300">
              Scenario: <strong className="text-slate-200">{session.scenario}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300">
              Status: <strong className="text-emerald-400">{session.status}</strong>
            </span>
          </div>

          {!analyzed.length ? (
            <div className="p-10 rounded-2xl glass-card text-center space-y-2">
              <Activity className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-sm text-slate-400">No turns analyzed yet. Analysis appears here as turns stream in Live Coaching.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="p-5 rounded-2xl glass-card space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Analyzed Turns</span>
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-100">{analyzed.length}</p>
                  <span className="text-[10px] text-slate-500">messages analyzed (all turns)</span>
                </div>
                <div className="p-5 rounded-2xl glass-card space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Avg Empathy</span>
                    <HeartHandshake className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-100">{avg('empathy_score')}%</p>
                  <span className="text-[10px] text-purple-400">across this session</span>
                </div>
                <div className="p-5 rounded-2xl glass-card space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Avg Tone & Grammar</span>
                    <Award className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-100">{avg('tone_score')}% / {avg('grammar_score')}%</p>
                  <span className="text-[10px] text-emerald-400">current session</span>
                </div>
                <div className="p-5 rounded-2xl glass-card space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Current Escalation Risk</span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-extrabold" style={{ color: RISK_COLOR[lastRisk] || '#94a3b8' }}>{lastRisk}</p>
                  <span className="text-[10px] text-slate-500">latest turn</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 md:p-6 rounded-2xl glass-card space-y-4">
                  <h2 className="text-sm font-bold text-slate-200">Quality Score Journey (per turn)</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={turnData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="turn" stroke="#64748b" fontSize={11} />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Line type="monotone" dataKey="tone" stroke="#6366f1" strokeWidth={2} name="Tone" />
                        <Line type="monotone" dataKey="grammar" stroke="#10b981" strokeWidth={2} name="Grammar" />
                        <Line type="monotone" dataKey="empathy" stroke="#a855f7" strokeWidth={2} name="Empathy" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-5 md:p-6 rounded-2xl glass-card space-y-4">
                  <h2 className="text-sm font-bold text-slate-200">Escalation Risk by Turn</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {riskCounts.map((r) => <Cell key={r.name} fill={RISK_COLOR[r.name] || '#6366f1'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl glass-card space-y-3">
                <h2 className="text-sm font-bold text-slate-200">Turn-by-turn analysis</h2>
                <div className="space-y-2">
                  {analyzed.map((m: Message, i: number) => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-800/50 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${m.sender === 'agent' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50' : 'bg-rose-950 text-rose-300 border border-rose-800/50'}`}>
                            {m.sender}
                          </span>
                          <span className="text-[10px] text-slate-500">Turn #{m.turn_index}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2">{m.content}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">{m.analysis!.intent}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">{m.analysis!.sentiment}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: RISK_COLOR[m.analysis!.escalation_risk] + '22', color: RISK_COLOR[m.analysis!.escalation_risk] }}>
                            {m.analysis!.escalation_risk} risk
                          </span>
                          <span className="text-[10px] text-slate-500">tone {Math.round(m.analysis!.tone_score)} • grammar {Math.round(m.analysis!.grammar_score)} • empathy {Math.round(m.analysis!.empathy_score)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  );
};
