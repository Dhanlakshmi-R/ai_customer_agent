import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Award, 
  Sparkles,
  FileBarChart,
  Gauge
} from 'lucide-react';
import { api } from '../services/api';
import { ReportItem, Session } from '../types';

export const ReportsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [report, setReport] = useState<ReportItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/session/list');
      setSessions(res.data);
      if (res.data.length > 0) {
        setSelectedSessionId(res.data[0].id);
        fetchReport(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchReport = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/report/${sessionId}`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedSessionId) return;
    window.open(`http://localhost:8000/api/v1/report/${selectedSessionId}/pdf`, '_blank');
  };

  return (
    <div className="ui-page p-5 md:p-8 space-y-7 min-h-screen">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="ui-eyebrow text-[11px] uppercase tracking-[.16em] font-semibold flex items-center gap-1.5">
            <FileBarChart className="w-3 h-3" /> Post-interaction intelligence
          </p>
          <h1 className="ui-header-title page-heading text-2xl md:text-3xl font-bold mt-1">Post-Interaction Performance Report</h1>
          <p className="ui-subtext text-xs mt-2">Detailed coaching report, resolution quality score, and sentiment timeline export.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              fetchReport(e.target.value);
            }}
            className="ui-select w-auto"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session #{s.id.slice(0, 8)} ({s.mode} - {s.persona})
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadPdf}
            disabled={!selectedSessionId}
            className="ui-btn ui-btn-primary px-4 py-2.5"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ui-card p-12 rounded-2xl flex items-center justify-center ui-subtext text-xs gap-3">
          <Sparkles className="w-4 h-4 animate-pulse" />
          Generating post-interaction summary report...
        </div>
      ) : !report ? (
        <div className="ui-card p-12 rounded-2xl text-center ui-subtext text-xs">
          Select a session above to generate post-interaction report.
        </div>
      ) : (
        <div className="space-y-6">

          {/* Resolution Quality Score Banner */}
          <div className="ui-card p-6 rounded-2xl relative overflow-hidden flex items-center justify-between gap-6">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand)]/8 via-transparent to-transparent pointer-events-none" />
            <div className="space-y-1 relative">
              <span className="ui-stat-label text-xs font-semibold uppercase tracking-wider">Overall Resolution Score</span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--success)' }}>{report.resolution_score}/100</span>
                <span className="ui-eyebrow text-xs font-medium flex items-center gap-1">
                  <Award className="w-4 h-4" /> High Quality Benchmark
                </span>
              </div>
              <p className="ui-table-cell text-xs max-w-2xl mt-2 leading-relaxed">{report.summary}</p>
            </div>
            <div className="hidden md:flex items-center gap-2 relative shrink-0">
              <span className="ui-icon-tile w-14 h-14 rounded-2xl">
                <Gauge className="w-7 h-7" style={{ color: 'var(--success)' }} />
              </span>
            </div>
          </div>

          {/* Strengths & Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="ui-card p-6 rounded-2xl space-y-3">
              <h3 className="ui-header-title text-sm font-bold flex items-center gap-2" style={{ color: 'var(--success)' }}>
                <CheckCircle2 className="w-4 h-4" /> Demonstrated Agent Strengths
              </h3>
              <ul className="space-y-2 text-xs">
                {report.strengths.map((str, idx) => (
                  <li key={idx} className="ui-card-raised flex items-start gap-3 p-3 rounded-xl border-[var(--border-subtle)]">
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: 'var(--success)' }} />
                    <span className="ui-table-cell">{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ui-card p-6 rounded-2xl space-y-3">
              <h3 className="ui-header-title text-sm font-bold flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                <AlertCircle className="w-4 h-4" /> Areas for Growth & Improvement
              </h3>
              <ul className="space-y-2 text-xs">
                {report.weaknesses.map((w, idx) => (
                  <li key={idx} className="ui-card-raised flex items-start gap-3 p-3 rounded-xl border-[var(--border-subtle)]">
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: 'var(--warning)' }} />
                    <span className="ui-table-cell">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Personalized Coaching Recommendations */}
          <div className="ui-card p-6 rounded-2xl space-y-4">
            <h3 className="ui-header-title text-sm font-bold flex items-center gap-2">
              <span className="ui-icon-tile"><Sparkles className="w-4 h-4" /></span>
              Actionable Coaching Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.coaching_tips.map((tip, idx) => (
                <div key={idx} className="ui-card-raised p-4 rounded-xl border-[var(--border-subtle)] space-y-2 text-xs transition hover:translate-y-[-2px]">
                  <div className="flex items-center gap-2">
                    <span className="ui-chip ui-chip-indigo"><TrendingUp className="w-3 h-3" /> Tip #{idx + 1}</span>
                  </div>
                  <p className="ui-table-cell leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};