import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Play, 
  Sparkles,
  Sliders,
  Radio,
  LayoutGrid,
  MonitorPlay,
  Keyboard
} from 'lucide-react';
import { api } from '../services/api';
import { Session } from '../types';
import { useStore } from '../store/useStore';
import { TranscriptPicker, TranscriptDetail } from '../components/TranscriptPicker';

const MODE_META: Record<string, { icon: React.ElementType; hint: string }> = {
  simulator: { icon: MonitorPlay, hint: 'AI-driven simulated customer' },
  manual: { icon: Keyboard, hint: 'Type both sides of the conversation' },
  replay: { icon: LayoutGrid, hint: 'Replay a saved transcript' },
};

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { setActiveSession } = useStore();
  const navigate = useNavigate();
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptDetail | null>(null);

  // Form State
  const [mode, setMode] = useState<'simulator' | 'manual' | 'replay'>('simulator');
  const [product, setProduct] = useState('Cloud SaaS Platform');
  const [category, setCategory] = useState('Billing & Account');
  const [scenario, setScenario] = useState('Unrecognized Charge & Refund Request');
  const [persona, setPersona] = useState('Angry');
  const [difficulty, setDifficulty] = useState('medium');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/session/list');
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'replay') {
        if (!selectedTranscript) return;
        const res = await api.post('/session/create', {
          mode,
          product,
          category,
          scenario,
          persona,
          difficulty
        });
        setActiveSession(res.data);
        setShowModal(false);
        navigate(`/console?mode=replay&transcript=${encodeURIComponent(selectedTranscript.id)}`);
        return;
      }
      const scenarioToUse =
        mode === 'simulator' && selectedTranscript
          ? selectedTranscript.scenario_suggestion || selectedTranscript.title
          : scenario;
      const res = await api.post('/session/create', {
        mode,
        product,
        category,
        scenario: scenarioToUse,
        persona,
        difficulty
      });
      setActiveSession(res.data);
      setShowModal(false);
      navigate(`/console?mode=${mode}`);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await api.delete(`/session/${id}`);
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleOpenSession = async (session: Session) => {
    try {
      const res = await api.get(`/session/${session.id}`);
      setActiveSession(res.data);
      navigate('/console');
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  return (
    <div className="ui-page p-5 md:p-8 space-y-7 min-h-screen">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="ui-eyebrow text-[11px] uppercase tracking-[.16em] font-semibold flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Session management
          </p>
          <h1 className="ui-header-title page-heading text-2xl md:text-3xl font-bold mt-1">Coaching Sessions</h1>
          <p className="ui-subtext text-xs mt-2">Configure new simulation, manual coaching, or transcript replay sessions.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="ui-btn ui-btn-primary px-4 py-2.5">
          <Plus className="w-4 h-4" /> New Session Setup
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ui-card bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-enter">
            <div className="flex items-center justify-between">
              <h2 className="ui-header-title font-bold text-base flex items-center gap-2">
                <span className="ui-icon-tile"><Sliders className="w-4 h-4" /></span>
                Module 2: Session Configuration
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="ui-btn ui-btn-ghost w-8 h-8 p-0 rounded-lg"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="ui-label">Interaction Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['simulator', 'manual', 'replay'] as const).map((m) => {
                    const meta = MODE_META[m];
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`py-3 rounded-xl font-semibold transition border flex flex-col items-center gap-1.5 ${
                          mode === m
                            ? 'ui-btn-primary border-transparent shadow'
                            : 'ui-btn-ghost hover:translate-y-[-1px]'
                        }`}
                      >
                        <meta.icon className="w-4 h-4" />
                        {m} Mode
                      </button>
                    );
                  })}
                </div>
                <p className="ui-subtext text-[10px] mt-1.5">{MODE_META[mode].hint}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label">Product Context</label>
                  <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="ui-input" />
                </div>
                <div>
                  <label className="ui-label">Support Category</label>
                  <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="ui-input" />
                </div>
              </div>

              {mode === 'replay' ? (
                <div>
                  <label className="ui-label">Transcript for Replay *</label>
                  <TranscriptPicker
                    required
                    value={selectedTranscript?.id || null}
                    onChange={setSelectedTranscript}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="ui-label">Scenario Description</label>
                    <input type="text" value={scenario} onChange={(e) => setScenario(e.target.value)} className="ui-input" />
                  </div>
                  {mode === 'simulator' && (
                    <div>
                      <label className="ui-label">Optional — Seed from transcript</label>
                      <TranscriptPicker
                        value={selectedTranscript?.id || null}
                        onChange={(t) => {
                          setSelectedTranscript(t);
                          if (t) setScenario(t.scenario_suggestion || t.title);
                        }}
                        placeholder="Select a transcript to prefill the scenario..."
                      />
                      <p className="ui-subtext text-[10px] mt-1">
                        Transcripts carry no persona/product metadata, so only the scenario field is pre-filled.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label">Customer Persona</label>
                  <select value={persona} onChange={(e) => setPersona(e.target.value)} className="ui-select">
                    <option value="Friendly">Friendly</option>
                    <option value="Confused">Confused</option>
                    <option value="Angry">Angry</option>
                    <option value="Technical">Technical</option>
                    <option value="Business Customer">Business Customer</option>
                    <option value="Emotional">Emotional</option>
                  </select>
                </div>
                <div>
                  <label className="ui-label">Difficulty Level</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="ui-select">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button type="button" onClick={() => setShowModal(false)} className="ui-btn ui-btn-ghost px-4 py-2">
                  Cancel
                </button>
                <button type="submit" className="ui-btn ui-btn-primary px-5 py-2.5">
                  <Sparkles className="w-4 h-4" /> Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session List Table */}
      <div className="ui-card p-4 md:p-6 rounded-2xl space-y-4">
        <h2 className="ui-header-title text-sm font-bold flex items-center gap-2">
          <FileText className="w-4 h-4 ui-eyebrow" /> Active & Completed Coaching Sessions ({sessions.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="ui-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="ui-table-head border-b border-[var(--border-subtle)] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Session ID</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Product / Category</th>
                <th className="py-2.5 px-3">Persona</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {sessions.map((s) => (
                <tr key={s.id} className="ui-table-row transition">
                  <td className="py-3 px-3 font-mono font-semibold ui-eyebrow">#{s.id.slice(0, 8)}</td>
                  <td className="py-3 px-3">
                    <span className="ui-chip ui-chip-indigo">{s.mode}</span>
                  </td>
                  <td className="py-3 px-3 ui-table-cell">{s.product} ({s.category})</td>
                  <td className="py-3 px-3 font-semibold" style={{ color: 'var(--danger)' }}>{s.persona}</td>
                  <td className="py-3 px-3">
                    <span className="ui-chip ui-chip-emerald">{s.status}</span>
                  </td>
                  <td className="py-3 px-3 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenSession(s)}
                      className="ui-btn ui-btn-primary px-3 py-1.5"
                    >
                      <Play className="w-3 h-3" /> Resume
                    </button>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      className="ui-chip ui-chip-rose p-2 rounded-lg transition hover:brightness-110"
                      title="Delete Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};