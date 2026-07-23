import React from 'react';
import { X, BookOpen, ExternalLink, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export const KnowledgeModal: React.FC = () => {
  const { selectedCitation, setSelectedCitation } = useStore();

  if (!selectedCitation) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={() => setSelectedCitation(null)}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">{selectedCitation.title}</h3>
            <span className="text-xs text-indigo-400 font-medium">{selectedCitation.source} • {selectedCitation.category || 'Support Article'}</span>
          </div>
        </div>

        <div className="space-y-4 my-6">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm leading-relaxed text-slate-300">
            {selectedCitation.snippet}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>RAG Vector Match Confidence: <strong className="text-emerald-400">{Math.round((selectedCitation.confidence || 0.9) * 100)}%</strong></span>
            </div>
            <span>ID: {selectedCitation.chunk_id || 'kb_chunk_1'}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            onClick={() => setSelectedCitation(null)}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
