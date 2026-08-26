import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import {
  ShieldAlert,
  MessageSquare,
  BookOpen,
  Award,
  HeartHandshake,
  Zap,
  TrendingUp,
  Radio,
  Sparkles,
  BarChart3,
  Shield
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsSummary } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
};
const GRID_STROKE = 'var(--border-subtle)';
const AXIS_STROKE = 'var(--text-faint)';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/summary');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics summary:', err);
    }
  };

  const stats = [
    {
      label: 'Total Sessions',
      value: data ? String(data.total_sessions) : '—',
      hint: 'across all sessions',
      icon: MessageSquare,
      tone: 'ui-icon-tile',
      accent: 'text-indigo-400',
    },
    {
      label: 'Active Sessions',
      value: data ? String(data.active_sessions ?? 0) : '—',
      hint: 'currently running',
      icon: TrendingUp,
      tone: 'ui-icon-tile',
      accent: 'text-cyan-400',
    },
    {
      label: 'Total Messages',
      value: data ? String(data.total_messages ?? 0) : '—',
      hint: 'across all sessions',
      icon: BookOpen,
      tone: 'ui-icon-tile',
      accent: 'text-rose-400',
    },
    {
      label: 'Total Analyses',
      value: data ? String(data.total_analyses ?? 0) : '—',
      hint: 'coaching turns scored',
      icon: BarChart3,
      tone: 'ui-icon-tile',
      accent: 'text-blue-400',
    },
    {
      label: 'Avg Empathy Score',
      value: data ? `${data.avg_empathy_score}%` : '—',
      hint: 'across all analyzed turns',
      icon: HeartHandshake,
      tone: 'ui-icon-tile',
      accent: 'text-purple-400',
    },
    {
      label: 'Avg Tone & Grammar',
      value: data ? `${data.avg_tone_score}% / ${data.avg_grammar_score}%` : '—',
      hint: 'across all analyzed turns',
      icon: Award,
      tone: 'ui-icon-tile',
      accent: 'text-emerald-400',
    },
    {
      label: 'Avg Confidence',
      value: data ? `${data.avg_confidence_score ?? 0}%` : '—',
      hint: 'analysis confidence',
      icon: Shield,
      tone: 'ui-icon-tile',
      accent: 'text-amber-400',
    },
    {
      label: 'RAG Knowledge Index',
      value: data ? `${data.total_documents} Docs` : '—',
      hint: 'indexed in ChromaDB',
      icon: BookOpen,
      tone: 'ui-icon-tile',
      accent: 'text-amber-400',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }} className="ui-page p-5 md:p-8 space-y-7 min-h-screen">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="ui-eyebrow text-[11px] uppercase tracking-[.16em] font-semibold flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Operations overview
          </p>
          <h1 className="ui-header-title page-heading text-2xl md:text-3xl font-bold mt-1">
            Support intelligence, at a glance.
          </h1>
          <p className="ui-subtext text-xs mt-2">Real-time oversight of coaching metrics, sentiment trends and escalations.</p>
        </div>
        <button onClick={fetchAnalytics} className="ui-btn ui-btn-primary px-4 py-2.5">
          <Zap className="w-4 h-4" /> Refresh Analytics
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="ui-card p-5 rounded-2xl space-y-3 group">
            <div className="flex items-center justify-between">
              <span className="ui-stat-label text-xs">{s.label}</span>
              <span className="ui-icon-tile group-hover:scale-110 transition-transform">
                <s.icon className="w-4 h-4" />
              </span>
            </div>
            <p className="ui-stat-value text-2xl font-extrabold tracking-tight">{s.value}</p>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="ui-subtext text-[10px]">{s.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Escalation Risk Frequency Bar Chart */}
        <div className="ui-card p-5 md:p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold ui-header-title">Escalation Risk Distribution</h2>
            <span className="ui-icon-tile">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.escalation_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS_STROKE} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={AXIS_STROKE} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--surface-hover)' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intent Breakdown Pie Chart */}
        <div className="ui-card p-5 md:p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold ui-header-title">Customer Intent Frequency</h2>
            <span className="ui-icon-tile">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.intent_breakdown || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry: any) => `${entry.name || ''} ${((entry.percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(data?.intent_breakdown || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="ui-card p-5 md:p-6 rounded-2xl space-y-4 lg:col-span-2">
          <h2 className="text-sm font-bold ui-header-title">Overall Sentiment Ratio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.sentiment_distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={84}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#6366f1" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {(data?.sentiment_distribution || []).map((d) => {
                const color = d.name === 'Positive' ? '#10b981' : d.name === 'Negative' ? '#ef4444' : '#6366f1';
                const total = (data?.sentiment_distribution || []).reduce((a, b) => a + (b.value || 0), 0) || 1;
                const pct = Math.round(((d.value || 0) / total) * 100);
                return (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="ui-subtext flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                        {d.name}
                      </span>
                      <span className="ui-stat-label font-semibold">{pct}%</span>
                    </div>
                    <div className="ui-progress-track h-1.5">
                      <div className="ui-progress-fill h-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};