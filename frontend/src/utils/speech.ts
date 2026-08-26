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

/** Finds the closest local voice for English (falls back to any voice). */
function pickLocalVoice(): SpeechSynthesisVoice | undefined {
  const voices = refreshVoices();
  if (!voices.length) return undefined;
  return (
    voices.find((v) => normLang(v).startsWith('en')) ||
    voices[0]
  );
}

function speakLocal(text: string, voice?: SpeechSynthesisVoice): void {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = 'en';
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

async function playNetworkTts(text: string): Promise<boolean> {
  const chunks = splitText(text, NETWORK_TTS_MAX_CHARS);
  for (const chunk of chunks) {
    const ok = await playNetworkChunk(chunk, 'en');
    if (!ok) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let speechDoneCallback: (() => void) | null = null;

/** Speaks text aloud using English voice. */
export function speakText(text: string, onDone?: () => void): void {
  if (!text) return;
  stopSpeaking();
  speechDoneCallback = onDone || null;

  const voice = pickLocalVoice();
  if (voice) {
    speakLocal(text, voice);
    return;
  }
  playNetworkTts(text).then((ok) => {
    if (!ok) {
      speakLocal(text);
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
