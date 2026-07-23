import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Award, 
  Sparkles,
  ArrowRight
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
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Post-Interaction Performance Report</h1>
          <p className="text-xs text-slate-400 mt-1">Detailed coaching report, resolution quality score, and sentiment timeline export.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              fetchReport(e.target.value);
            }}
            className="bg-slate-900 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session #{s.id.slice(0, 8)} ({s.mode} - {s.persona})
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
          Generating post-interaction summary report...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-slate-500 text-xs">Select a session above to generate post-interaction report.</div>
      ) : (
        <div className="space-y-6">

          {/* Resolution Quality Score Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Resolution Score</span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-emerald-400">{report.resolution_score}/100</span>
                <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                  <Award className="w-4 h-4" /> High Quality Benchmark
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl mt-2 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          {/* Strengths & Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Demonstrated Agent Strengths
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Areas for Growth & Improvement
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Personalized Coaching Recommendations */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Actionable Coaching Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.coaching_tips.map((tip, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <span>Tip #{idx + 1}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
