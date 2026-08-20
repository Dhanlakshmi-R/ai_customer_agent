import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { Activity, ShieldAlert, MessageSquare, HeartHandshake, Award, Zap, Bot, ArrowLeft, Radio } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { Message, Session } from '../types';

const RISK_COLOR: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#10b981' };
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
};

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
        const withMessages = list.filter((s: Session) => (s as any).message_count > 1);
        const pool = withMessages.length ? withMessages : list;
        const active = pool.find((s: Session) => s.status === 'active') || pool[0];
        if (active) loadSession(active);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, fetchSession]);

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

  const stats = [
    { label: 'Analyzed Turns', value: analyzed.length, hint: 'messages analyzed (all turns)', icon: MessageSquare, accent: 'text-indigo-400' },
    { label: 'Avg Empathy', value: `${avg('empathy_score')}%`, hint: 'across this session', icon: HeartHandshake, accent: 'text-purple-400' },
    { label: 'Avg Tone & Grammar', value: `${avg('tone_score')}% / ${avg('grammar_score')}%`, hint: 'current session', icon: Award, accent: 'text-emerald-400' },
    { label: 'Current Escalation Risk', value: lastRisk, hint: 'latest turn', icon: ShieldAlert, accent: 'text-rose-400', riskColor: RISK_COLOR[lastRisk] },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }} className="ui-page p-5 md:p-8 space-y-7 min-h-screen">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="ui-eyebrow text-[11px] uppercase tracking-[.16em] font-semibold flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Live session analysis
          </p>
          <h1 className="ui-header-title page-heading text-2xl md:text-3xl font-bold mt-1">Current session intelligence</h1>
          <p className="ui-subtext text-xs mt-2">
            Per-turn coaching analysis for the session in Live Coaching. Refreshes automatically while active.
          </p>
        </div>
        <button
          onClick={() => fetchSession(session?.id || activeSession?.id || '')}
          disabled={!session && !activeSession}
          className="ui-btn ui-btn-primary px-4 py-2.5 disabled:opacity-40 disabled:transform-none"
        >
          <Zap className="w-4 h-4" /> Refresh
        </button>
      </div>

      {!activeSession && !session && (
        <div className="ui-card p-10 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
          <span className="ui-icon-tile w-14 h-14 rounded-2xl">
            <Bot className="w-7 h-7" />
          </span>
          <p className="ui-subtext text-sm max-w-md">No active coaching session. Start or resume one from Live Coaching, or pick a session below.</p>
          <button onClick={() => navigate('/console')} className="ui-btn ui-btn-primary px-4 py-2.5">
            Go to Live Coaching
          </button>
          {sessions.length > 0 && (
            <div className="w-full max-w-xl mt-4">
              <p className="ui-stat-label text-xs font-semibold mb-2 text-left">Recent sessions:</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className="ui-table-row w-full flex items-center justify-between px-3 py-2 rounded-lg ui-card-flat text-left transition"
                  >
                    <span className="text-xs font-mono ui-eyebrow">#{s.id.slice(0, 8)}</span>
                    <span className="ui-chip ui-chip-rose">{s.persona}</span>
                    <span className="ui-subtext text-[10px]">{s.mode} • {s.status}</span>
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
            <button onClick={() => navigate(`/console?mode=${session.mode || 'simulator'}`)} className="ui-btn ui-btn-ghost px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Open in Live Coaching
            </button>
            <span className="ui-chip ui-chip-indigo">Mode: <strong className="uppercase">{session.mode}</strong></span>
            <span className="ui-chip ui-chip-rose">Persona: <strong>{session.persona}</strong></span>
            <span className="ui-chip">Scenario: <strong className="ui-stat-value">{session.scenario}</strong></span>
            <span className="ui-chip ui-chip-emerald">Status: <strong>{session.status}</strong></span>
          </div>

          {!analyzed.length ? (
            <div className="ui-card p-10 rounded-2xl text-center space-y-2">
              <Activity className="w-10 h-10 ui-subtext mx-auto" />
              <p className="ui-subtext text-sm">No turns analyzed yet. Analysis appears here as turns stream in Live Coaching.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {stats.map((s) => (
                  <div key={s.label} className="ui-card p-5 rounded-2xl space-y-3 group">
                    <div className="flex items-center justify-between">
                      <span className="ui-stat-label text-xs">{s.label}</span>
                      <span className="ui-icon-tile group-hover:scale-110 transition-transform">
                        <s.icon className="w-4 h-4" />
                      </span>
                    </div>
                    <p className="ui-stat-value text-2xl font-extrabold tracking-tight" style={s.riskColor ? { color: s.riskColor } : undefined}>
                      {s.value}
                    </p>
                    <span className="ui-subtext text-[10px]">{s.hint}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ui-card p-5 md:p-6 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold ui-header-title">Quality Score Journey (per turn)</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={turnData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="turn" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Line type="monotone" dataKey="tone" stroke="#6366f1" strokeWidth={2} name="Tone" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="grammar" stroke="#10b981" strokeWidth={2} name="Grammar" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="empathy" stroke="#a855f7" strokeWidth={2} name="Empathy" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="ui-card p-5 md:p-6 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold ui-header-title">Escalation Risk by Turn</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--surface-hover)' }} />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
                          {riskCounts.map((r) => <Cell key={r.name} fill={RISK_COLOR[r.name] || '#6366f1'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="ui-card p-5 rounded-2xl space-y-3">
                <h2 className="text-sm font-bold ui-header-title flex items-center gap-2">
                  <Activity className="w-4 h-4 ui-eyebrow" /> Turn-by-turn analysis
                </h2>
                <div className="space-y-2">
                  {analyzed.map((m: Message, i: number) => (
                    <div key={m.id} className="ui-card-flat flex items-start gap-3 p-3 rounded-xl transition">
                      <div className="w-8 h-8 rounded-full ui-chip-indigo flex items-center justify-center font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`ui-chip ${m.sender === 'agent' ? 'ui-chip-indigo' : 'ui-chip-rose'}`}>
                            {m.sender}
                          </span>
                          <span className="ui-subtext text-[10px]">Turn #{m.turn_index}</span>
                        </div>
                        <p className="ui-table-cell text-[11px] line-clamp-2">{m.content}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="ui-chip ui-chip-indigo">{m.analysis!.intent}</span>
                          <span className="ui-chip">{m.analysis!.sentiment}</span>
                          <span className="ui-chip" style={{ backgroundColor: RISK_COLOR[m.analysis!.escalation_risk] + '22', color: RISK_COLOR[m.analysis!.escalation_risk], borderColor: RISK_COLOR[m.analysis!.escalation_risk] + '44' }}>
                            {m.analysis!.escalation_risk} risk
                          </span>
                          <span className="ui-subtext text-[10px]">tone {Math.round(m.analysis!.tone_score)} • grammar {Math.round(m.analysis!.grammar_score)} • empathy {Math.round(m.analysis!.empathy_score)}</span>
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