import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Search, 
  BookOpen, 
  CheckCircle, 
  Sparkles,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem } from '../types';

export const KnowledgeBasePage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Billing');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/rag/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', category);
    formData.append('version', '1.0');

    try {
      await api.post('/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedFile(null);
      fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await api.delete(`/rag/documents/${id}`);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleSearchSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await api.post('/rag/search', { query: searchQuery, top_k: 3 });
      setSearchResults(res.data.results);
    } catch (err) {
      console.error('RAG search sandbox error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">RAG Support Knowledge Base</h1>
        <p className="text-xs text-slate-400 mt-1">Upload FAQs, policies, and product documentation to power real-time coaching recommendations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Upload Form (5 Columns) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Upload className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200">Upload New Knowledge Document</h2>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Select Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="Billing">Billing & Refund Policies</option>
                <option value="Technical">Technical & API Troubleshooting</option>
                <option value="SLA">Enterprise SLA & Escalation</option>
                <option value="General">General Product Guide</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">File (PDF, DOCX, TXT, MD)</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full bg-slate-950 text-slate-400 p-2 rounded-xl border border-slate-800 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              <Upload className="w-4 h-4" /> {uploading ? 'Processing & Vectorizing...' : 'Upload & Chunk Document'}
            </button>
          </form>

          {/* RAG Engine Info Pill */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Automated Pipeline Specification:
            </p>
            <p>• Splitter: RecursiveCharacterTextSplitter (Chunk Size: 800, Overlap: 150)</p>
            <p>• Embedding: sentence-transformers/all-MiniLM-L6-v2</p>
            <p>• Vector Store: ChromaDB (Local Persistence)</p>
          </div>
        </div>

        {/* Ingested Documents List & Search Sandbox (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">

          {/* RAG Search Sandbox */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Vector Search Testing Sandbox
            </h2>
            <form onSubmit={handleSearchSandbox} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Test query (e.g. 'refund double charge policy')..."
                className="flex-1 bg-slate-950 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Search className="w-3.5 h-3.5" /> Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                {searchResults.map((res, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-200">
                      <span>{res.title}</span>
                      <span className="text-emerald-400">{Math.round((res.confidence || 0.9) * 100)}% Match</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{res.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ingested Document Table */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Ingested Knowledge Base Articles ({documents.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Document Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Chunks</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No documents ingested yet. Upload your first knowledge article above.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-semibold text-slate-200">{doc.title}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{doc.chunk_count} chunks</td>
                        <td className="py-3 px-3 font-mono text-slate-400 uppercase">{doc.file_type}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
