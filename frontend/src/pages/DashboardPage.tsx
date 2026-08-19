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
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsSummary } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }} className="p-5 md:p-8 space-y-7 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[.16em] font-semibold text-indigo-400">Operations overview</p>
          <h1 className="page-heading text-2xl md:text-3xl font-bold text-slate-100 mt-1">Support intelligence, at a glance.</h1>
          <p className="text-xs text-slate-400 mt-2">Real-time oversight of support coaching metrics, sentiment trends and escalations.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
        >
          <Zap className="w-4 h-4" /> Refresh Analytics
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl glass-card space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Sessions</span>
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-100">{data ? data.total_sessions : '—'}</p>
          <span className="text-[10px] text-slate-500">across all sessions</span>
        </div>

        <div className="p-5 rounded-2xl glass-card space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Empathy Score</span>
            <HeartHandshake className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-100">{data ? `${data.avg_empathy_score}%` : '—'}</p>
          <span className="text-[10px] text-slate-500">across all analyzed turns</span>
        </div>

        <div className="p-5 rounded-2xl glass-card space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Tone & Grammar</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-100">{data ? `${data.avg_tone_score}% / ${data.avg_grammar_score}%` : '—'}</p>
          <span className="text-[10px] text-slate-500">across all analyzed turns</span>
        </div>

        <div className="p-5 rounded-2xl glass-card space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>RAG Knowledge Index</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-100">{data ? `${data.total_documents} Docs` : '—'}</p>
          <span className="text-[10px] text-slate-500">indexed in ChromaDB</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Escalation Risk Frequency Bar Chart */}
        <div className="p-5 md:p-6 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Escalation Risk Distribution</h2>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.escalation_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intent Breakdown Pie Chart */}
        <div className="p-5 md:p-6 rounded-2xl glass-card space-y-4">
          <h2 className="text-sm font-bold text-slate-200">Customer Intent Frequency</h2>
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
                >
                  {(data?.intent_breakdown || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="p-5 md:p-6 rounded-2xl glass-card space-y-4">
          <h2 className="text-sm font-bold text-slate-200">Overall Sentiment Ratio</h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.sentiment_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#6366f1" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
