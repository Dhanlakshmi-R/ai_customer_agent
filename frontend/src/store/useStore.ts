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
    set({ user: null, token: null, activeSession: null, messages: [], currentCoaching: null });
  },

  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
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
}));
