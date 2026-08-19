import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export interface TranscriptOption {
  id: string;
  filename: string;
  title: string;
  turn_count: number;
  scenario_suggestion?: string;
}

export interface TranscriptDetail extends TranscriptOption {
  messages: Array<{ sender: 'customer' | 'agent'; content: string }>;
}

interface TranscriptPickerProps {
  value?: string | null;
  onChange: (transcript: TranscriptDetail | null) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const TranscriptPicker: React.FC<TranscriptPickerProps> = ({
  value,
  onChange,
  required = false,
  placeholder = 'Select a transcript...',
  disabled = false,
}) => {
  const [options, setOptions] = useState<TranscriptOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/chat/transcripts')
      .then((res) => {
        if (active) setOptions(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error('Failed to load transcripts:', err));
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = async (id: string) => {
    if (!id) {
      onChange(null);
      return;
    }
    setFetchingDetail(true);
    try {
      const res = await api.get(`/chat/transcripts/${encodeURIComponent(id)}`);
      onChange(res.data as TranscriptDetail);
    } catch (err) {
      console.error('Failed to load transcript detail:', err);
      onChange(null);
    } finally {
      setFetchingDetail(false);
    }
  };

  const selected = options.find((o) => o.id === value) || null;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          value={value || ''}
          disabled={disabled || loading}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-xs"
        >
          <option value="">{placeholder}</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.turn_count} turns)
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2 className="w-4 h-4 text-slate-500 animate-spin absolute right-3 top-3" />
        ) : (
          <FileText className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        )}
      </div>
      {selected && (
        <div className="flex items-start gap-1.5 px-2 text-[10px] text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            {selected.scenario_suggestion || `${selected.turn_count} turns available for replay.`}
          </span>
        </div>
      )}
      {fetchingDetail && (
        <p className="flex items-center gap-1.5 text-[10px] text-indigo-300">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading transcript content...
        </p>
      )}
      {required && !value && (
        <p className="text-[10px] text-rose-400">A transcript is required for Replay mode.</p>
      )}
    </div>
  );
};
