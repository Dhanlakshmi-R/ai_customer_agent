import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Search, 
  BookOpen, 
  Layers,
  Database,
  ScanSearch
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
    <div className="ui-page p-5 md:p-8 space-y-7 min-h-screen">
      {/* Top Title */}
      <div>
        <p className="ui-eyebrow text-[11px] uppercase tracking-[.16em] font-semibold flex items-center gap-1.5">
          <Database className="w-3 h-3" /> Retrieval pipeline
        </p>
        <h1 className="ui-header-title page-heading text-2xl md:text-3xl font-bold mt-1">RAG Support Knowledge Base</h1>
        <p className="ui-subtext text-xs mt-2">Upload FAQs, policies, and product documentation to power real-time coaching recommendations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Upload Form (5 Columns) */}
        <div className="lg:col-span-5 ui-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <span className="ui-icon-tile"><Upload className="w-4 h-4" /></span>
            <h2 className="ui-header-title text-sm font-bold">Upload New Knowledge Document</h2>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
            <div>
              <label className="ui-label">Select Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="ui-select"
              >
                <option value="Billing">Billing & Refund Policies</option>
                <option value="Technical">Technical & API Troubleshooting</option>
                <option value="SLA">Enterprise SLA & Escalation</option>
                <option value="General">General Product Guide</option>
              </select>
            </div>

            <div>
              <label className="ui-label">File (PDF, DOCX, TXT, MD)</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="ui-input ui-card-flat file:cursor-pointer file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand)] file:text-white hover:file:brightness-110"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="ui-btn ui-btn-primary w-full py-2.5"
            >
              <Upload className="w-4 h-4" /> {uploading ? 'Processing & Vectorizing...' : 'Upload & Chunk Document'}
            </button>
          </form>

          {/* RAG Engine Info Pill */}
          <div className="p-3.5 rounded-xl ui-card-raised border-[var(--border-subtle)] text-[11px] ui-subtext space-y-1.5">
            <p className="ui-table-cell font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 ui-eyebrow" /> Automated Pipeline Specification:
            </p>
            <p>• Splitter: RecursiveCharacterTextSplitter (Chunk Size: 800, Overlap: 150)</p>
            <p>• Embedding: sentence-transformers/all-MiniLM-L6-v2</p>
            <p>• Vector Store: ChromaDB (Local Persistence)</p>
          </div>
        </div>

        {/* Ingested Documents List & Search Sandbox (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">

          {/* RAG Search Sandbox */}
          <div className="ui-card p-5 rounded-2xl space-y-3">
            <h2 className="ui-header-title text-sm font-bold flex items-center gap-2">
              <span className="ui-icon-tile"><ScanSearch className="w-4 h-4" /></span>
              Vector Search Testing Sandbox
            </h2>
            <form onSubmit={handleSearchSandbox} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Test query (e.g. 'refund double charge policy')..."
                className="ui-input flex-1"
              />
              <button
                type="submit"
                disabled={searching}
                className="ui-btn ui-btn-primary px-4 py-2"
              >
                <Search className="w-3.5 h-3.5" /> Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                {searchResults.map((res, idx) => (
                  <div key={idx} className="p-3 rounded-xl ui-card-raised border-[var(--border-subtle)] text-xs space-y-1">
                    <div className="flex justify-between gap-3 font-semibold ui-header-title">
                      <span className="truncate">{res.title}</span>
                      <span className="text-[var(--success)] shrink-0">{Math.round((res.confidence || 0.9) * 100)}% Match</span>
                    </div>
                    <p className="ui-subtext text-[11px]">{res.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ingested Document Table */}
          <div className="ui-card p-4 md:p-6 rounded-2xl space-y-4">
            <h2 className="ui-header-title text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 ui-eyebrow" /> Ingested Knowledge Base Articles ({documents.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="ui-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="ui-table-head border-b border-[var(--border-subtle)] uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Document Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Chunks</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center ui-subtext">
                        No documents ingested yet. Upload your first knowledge article above.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="ui-table-row transition">
                        <td className="py-3 px-3 font-semibold ui-header-title flex items-center gap-2">
                          <FileText className="w-4 h-4 ui-subtext shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="ui-chip ui-chip-indigo">{doc.category}</span>
                        </td>
                        <td className="py-3 px-3 font-mono ui-subtext">{doc.chunk_count} chunks</td>
                        <td className="py-3 px-3 font-mono ui-subtext uppercase">{doc.file_type}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="ui-chip ui-chip-rose p-2 rounded-lg transition hover:brightness-110"
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