import { create } from 'zustand';
import { User, Session, Message, CoachingAnalysis, DocumentItem } from '../types';

interface AppState {
  // Auth State
  user: User | null;
  token: string | null;
  setUser: (user: User | null, token: string | null) => void;
  logout: () => void;

  // Session & Console State
  activeSession: Session | null;
  setActiveSession: (session: Session | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (msg: Message) => void;

  // Live Coaching Analysis State
  currentCoaching: CoachingAnalysis | null;
  setCurrentCoaching: (coaching: CoachingAnalysis | null) => void;

  // Theme State
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Reader Language Preference (for message read-aloud / TTS)
  readerLang: string;
  setReaderLang: (lang: string) => void;

  // Mobile navigation drawer (visible below the md breakpoint)
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // Persistent translation cache keyed by `${lang}:${id}` (id = message id or `suggested:<text>`)
  translations: Record<string, string>;
  setTranslations: (map: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;

  // Selected Knowledge Article Modal
  selectedCitation: any | null;
  setSelectedCitation: (citation: any | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: JSON.parse(localStorage.getItem('coach_user') || 'null'),
  token: localStorage.getItem('coach_token') || null,
  setUser: (user, token) => {
    if (user && token) {
      localStorage.setItem('coach_user', JSON.stringify(user));
      localStorage.setItem('coach_token', token);
    } else {
      localStorage.removeItem('coach_user');
      localStorage.removeItem('coach_token');
    }
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('coach_user');
    localStorage.removeItem('coach_token');
    localStorage.removeItem('coach_active_session');
    set({ user: null, token: null, activeSession: null, messages: [], currentCoaching: null });
  },

  activeSession: JSON.parse(localStorage.getItem('coach_active_session') || 'null'),
  setActiveSession: (session) => {
    if (session) {
      localStorage.setItem('coach_active_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('coach_active_session');
    }
    set({ activeSession: session });
  },
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  currentCoaching: null,
  setCurrentCoaching: (coaching) => set({ currentCoaching: coaching }),

  theme: (localStorage.getItem('coach_theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('coach_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    return { theme: nextTheme };
  }),

  selectedCitation: null,
  setSelectedCitation: (citation) => set({ selectedCitation: citation }),

  readerLang: localStorage.getItem('coach_reader_lang') || 'en',
  setReaderLang: (lang) => {
    localStorage.setItem('coach_reader_lang', lang);
    set({ readerLang: lang });
  },

  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  translations: JSON.parse(localStorage.getItem('coach_translations') || '{}'),
  setTranslations: (map) => set((state) => {
    const incoming = typeof map === 'function' ? map(state.translations) : map;
    const next = { ...state.translations, ...incoming };
    try {
      localStorage.setItem('coach_translations', JSON.stringify(next));
    } catch {
      /* storage full / unavailable — cache stays in memory */
    }
    return { translations: next };
  }),
}));
