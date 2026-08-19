import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Play, 
  Bot, 
  User as UserIcon, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { Session } from '../types';
import { useStore } from '../store/useStore';
import { TranscriptPicker, TranscriptDetail } from '../components/TranscriptPicker';

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
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Coaching Sessions</h1>
          <p className="text-xs text-slate-400 mt-1">Configure new simulation, manual coaching, or transcript replay sessions.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> New Session Setup
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" /> Module 2: Session Configuration
            </h2>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Interaction Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['simulator', 'manual', 'replay'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`py-2 rounded-xl capitalize font-semibold transition border ${
                        mode === m
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m} Mode
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Product Context</label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Support Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {mode === 'replay' ? (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Transcript for Replay *</label>
                  <TranscriptPicker
                    required
                    value={selectedTranscript?.id || null}
                    onChange={setSelectedTranscript}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Scenario Description</label>
                    <input
                      type="text"
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {mode === 'simulator' && (
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Optional — Seed from transcript</label>
                      <TranscriptPicker
                        value={selectedTranscript?.id || null}
                        onChange={(t) => {
                          setSelectedTranscript(t);
                          if (t) setScenario(t.scenario_suggestion || t.title);
                        }}
                        placeholder="Select a transcript to prefill the scenario..."
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Transcripts carry no persona/product metadata, so only the scenario field is pre-filled.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Customer Persona</label>
                  <select
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Friendly">Friendly</option>
                    <option value="Confused">Confused</option>
                    <option value="Angry">Angry</option>
                    <option value="Technical">Technical</option>
                    <option value="Business Customer">Business Customer</option>
                    <option value="Emotional">Emotional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session List Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" /> Active & Completed Coaching Sessions ({sessions.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Session ID</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Product / Category</th>
                <th className="py-2.5 px-3">Persona</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono font-semibold text-indigo-400">#{s.id.slice(0, 8)}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                      {s.mode}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{s.product} ({s.category})</td>
                  <td className="py-3 px-3 font-semibold text-rose-400">{s.persona}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenSession(s)}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3" /> Resume
                    </button>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      className="p-1.5 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
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
