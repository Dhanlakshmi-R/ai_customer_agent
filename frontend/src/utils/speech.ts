import { useStore } from '../store/useStore';

/** Languages for the per-message read-aloud reader (unique `id` keys). */
export const READER_LANGUAGES: { id: string; code: string; label: string; native: string; tts: string }[] = [
  { id: 'en', code: 'en-IN', label: 'English', native: 'English', tts: 'en' },
  { id: 'hinglish', code: 'en-IN', label: 'Hinglish', native: 'Hinglish', tts: 'hi' },
  { id: 'hi', code: 'hi-IN', label: 'Hindi', native: 'हिन्दी', tts: 'hi' },
  { id: 'kn', code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ', tts: 'kn' },
  { id: 'te', code: 'te-IN', label: 'Telugu', native: 'తెలుగు', tts: 'te' },
  { id: 'ta', code: 'ta-IN', label: 'Tamil', native: 'தமிழ்', tts: 'ta' },
  { id: 'mr', code: 'mr-IN', label: 'Marathi', native: 'मराठी', tts: 'mr' },
  { id: 'bn', code: 'bn-IN', label: 'Bengali', native: 'বাংলা', tts: 'bn' },
];

/** Resolves the display label for a stored reader id. */
export function readerLabel(id: string): string {
  return READER_LANGUAGES.find((l) => l.id === id)?.label || 'English';
}

// ---------------------------------------------------------------------------
// Local speechSynthesis (instant start, no network round-trip).
// ---------------------------------------------------------------------------

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  const current = window.speechSynthesis.getVoices();
  if (current.length) cachedVoices = current;
  return cachedVoices;
}

// Chrome/Firefox populate voices asynchronously; cache on `voiceschanged`.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

const normLang = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');

/** Finds the closest local voice for a TTS code (falls back to any voice). */
function pickLocalVoice(ttsCode: string): SpeechSynthesisVoice | undefined {
  const voices = refreshVoices();
  if (!voices.length) return undefined;
  const code = ttsCode.toLowerCase();
  return (
    voices.find((v) => normLang(v).startsWith(code)) ||
    voices.find((v) => normLang(v).startsWith(code.split('-')[0])) ||
    voices.find((v) => normLang(v).startsWith('en')) ||
    voices[0]
  );
}

function speakLocal(text: string, ttsCode: string, voice?: SpeechSynthesisVoice): void {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = ttsCode;
  }
  utter.rate = 0.98;

  const finish = () => {
    const cb = speechDoneCallback;
    speechDoneCallback = null;
    if (cb) cb();
  };
  utter.onend = finish;
  utter.onerror = finish;

  // Chrome bug: cancel() immediately before speak() can swallow the utterance.
  window.speechSynthesis.cancel();
  setTimeout(() => window.speechSynthesis.speak(utter), 60);
}

// ---------------------------------------------------------------------------
// Network TTS via Google translate_tts — used only when no local voice matches.
// Text is chunked so long messages are NOT truncated (Google caps ~200 chars).
// ---------------------------------------------------------------------------

const NETWORK_TTS_ENDPOINT = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=';
const NETWORK_TTS_MAX_CHARS = 200;

let audioQueue: HTMLAudioElement[] = [];

function playNetworkChunk(text: string, ttsCode: string): Promise<boolean> {
  return new Promise((resolve) => {
    const el = new Audio();
    el.preload = 'auto';
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      el.onended = el.onerror = null;
      resolve(ok);
    };
    el.onended = () => finish(true);
    el.onerror = () => finish(false);
    el.src = `${NETWORK_TTS_ENDPOINT}${encodeURIComponent(ttsCode)}&q=${encodeURIComponent(text)}`;
    audioQueue.push(el);
    el.play().then(() => {
      // Playback began — success (end will resolve the promise for sequencing).
    }).catch(() => finish(false));
  });
}

function splitText(text: string, max: number): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function playNetworkTts(text: string, ttsCode: string): Promise<boolean> {
  const chunks = splitText(text, NETWORK_TTS_MAX_CHARS);
  for (const chunk of chunks) {
    const ok = await playNetworkChunk(chunk, ttsCode);
    if (!ok) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let speechDoneCallback: (() => void) | null = null;

/** Speaks text using the selected reader language. */
export function speakText(text: string, onDone?: () => void): void {
  if (!text) return;
  const { readerLang } = useStore.getState();
  const entry = READER_LANGUAGES.find((l) => l.id === readerLang);
  const ttsCode = (entry && entry.tts) || 'en';
  stopSpeaking();
  speechDoneCallback = onDone || null;

  // Local voice = instant start. Only fall back to network TTS when none matches.
  const voice = pickLocalVoice(ttsCode);
  if (voice) {
    speakLocal(text, ttsCode, voice);
    return;
  }
  playNetworkTts(text, ttsCode).then((ok) => {
    if (!ok) {
      // Network failed too — last-ditch local attempt with any voice.
      speakLocal(text, ttsCode);
      return;
    }
    const cb = speechDoneCallback;
    speechDoneCallback = null;
    if (cb) cb();
  });
}

/** Stops any ongoing speech. */
export function stopSpeaking(): void {
  audioQueue.forEach((el) => {
    try {
      el.pause();
      el.onended = el.onerror = null;
    } catch {
      /* ignore */
    }
  });
  audioQueue = [];
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
