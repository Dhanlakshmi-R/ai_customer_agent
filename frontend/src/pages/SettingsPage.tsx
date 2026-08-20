import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Sliders, CheckCircle, Server } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('sentence-transformers/all-MiniLM-L6-v2');
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  const [llmModel, setLlmModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setOpenaiKey(res.data.openai_api_key || '');
      setGeminiKey(res.data.gemini_api_key || '');
      setGroqKey(res.data.groq_api_key || '');
      setEmbeddingModel(res.data.embedding_model || 'sentence-transformers/all-MiniLM-L6-v2');
      setChunkSize(res.data.chunk_size || 800);
      setChunkOverlap(res.data.chunk_overlap || 150);
      setLlmModel(res.data.llm_model || 'gpt-4o');
      setTemperature(res.data.temperature || 0.7);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settings', {
        openai_api_key: openaiKey,
        gemini_api_key: geminiKey,
        groq_api_key: groqKey,
        embedding_model: embeddingModel,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        llm_model: llmModel,
        temperature: temperature
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  return (
    <div className="ui-page p-5 md:p-8 space-y-7 min-h-screen">
      <div>
        <p className="ui-eyebrow text-[11px] uppercase tracking-[.16em] font-semibold flex items-center gap-1.5">
          <SettingsIcon className="w-3 h-3" /> Runtime configuration
        </p>
        <h1 className="ui-header-title page-heading text-2xl md:text-3xl font-bold mt-1">System Settings & Configuration</h1>
        <p className="ui-subtext text-xs mt-2">Configure LLM providers, RAG chunking parameters, and vector embeddings.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl space-y-6 text-xs">
        {saved && (
          <div className="p-3.5 rounded-xl flex items-center gap-2" style={{ backgroundColor: 'var(--success)', color: '#fff' }}>
            <CheckCircle className="w-4 h-4" /> System settings updated successfully.
          </div>
        )}

        {/* LLM & API Keys */}
        <div className="ui-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <span className="ui-icon-tile"><Key className="w-4 h-4" /></span>
            <h2 className="ui-header-title text-sm font-bold">LLM Provider API Keys & Model</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ui-label">OpenAI API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="ui-input"
              />
            </div>
            <div>
              <label className="ui-label">Google Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="ui-input"
              />
            </div>
          </div>

          <div>
            <label className="ui-label">Groq API Key</label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="ui-input max-w-full md:max-w-[50%]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ui-label">LLM Model</label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="ui-select"
              >
                <option value="gpt-4o">GPT-4o / GPT-4.1 Compatible</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="llama-3.3-70b-versatile">Groq: Llama 3.3 70B Versatile</option>
                <option value="llama-3.1-8b-instant">Groq: Llama 3.1 8B Instant</option>
                <option value="llama3-70b-8192">Groq: Llama 3 70B</option>
                <option value="openai/gpt-oss-120b">Groq: OpenAI GPT-OSS 120B</option>
                <option value="openai/gpt-oss-20b">Groq: OpenAI GPT-OSS 20B</option>
                <option value="local-fallback">Offline Fallback Engine (Zero API Key)</option>
              </select>
            </div>
            <div>
              <label className="ui-label">Temperature: {temperature}</label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[var(--brand)] mt-2"
              />
            </div>
          </div>
        </div>

        {/* RAG Pipeline Settings */}
        <div className="ui-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <span className="ui-icon-tile"><Sliders className="w-4 h-4" /></span>
            <h2 className="ui-header-title text-sm font-bold">RAG Ingestion & Chunking Parameters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="ui-label">Embedding Model</label>
              <input
                type="text"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                className="ui-input"
              />
            </div>
            <div>
              <label className="ui-label">Chunk Size (Characters)</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value) || 800)}
                className="ui-input"
              />
            </div>
            <div>
              <label className="ui-label">Chunk Overlap (Characters)</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 150)}
                className="ui-input"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl ui-card-raised border-[var(--border-subtle)] flex items-start gap-3 text-[11px] ui-subtext">
            <span className="ui-icon-tile w-8 h-8 rounded-lg"><Server className="w-3.5 h-3.5" /></span>
            <p className="leading-relaxed">
              Preference: <span className="font-semibold ui-table-cell">ChromaDB (Local Persistence)</span> with
              <span className="font-semibold ui-table-cell"> sentence-transformers/all-MiniLM-L6-v2 </span>
              embeddings. Repository chunk default is 800 / 150 overlap but you can override it here.
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="ui-btn ui-btn-primary px-6 py-3"
        >
          <Save className="w-4 h-4" /> Save System Settings
        </button>
      </form>
    </div>
  );
};