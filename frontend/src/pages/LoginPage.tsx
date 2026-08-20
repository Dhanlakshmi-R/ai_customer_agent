import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Bot,
  ShieldCheck,
  Languages,
  Rocket,
  CheckCircle2,
  Zap,
  BrainCircuit,
  KeyRound,
  Loader2,
  Fingerprint,
  Server,
  User as UserIcon,
  X,
  Glasses,
  AudioLines,
  Clock3,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

const FEATURES = [
  { icon: BrainCircuit, title: 'Live AI Coaching', desc: 'Intent, sentiment & empathy scored on every turn.' },
  { icon: ShieldCheck, title: 'Escalation Radar', desc: 'Risk alerts before things go sideways.' },
  { icon: Languages, title: 'Translate & Read Aloud', desc: 'Work in 8+ languages instantly.' },
  { icon: Rocket, title: 'Simulator & Replay', desc: 'Practice against realistic personas.' },
];

const STATS = [
  { value: '8+', label: 'Languages' },
  { value: '99%', label: 'Uptime' },
  { value: '24/7', label: 'AI Coaching' },
  { value: '<1s', label: 'Coach latency' },
];

const DEMO_ACCOUNTS = [
  { label: 'Agent', email: 'agent@coach.ai', password: 'Agent@123456' },
  { label: 'Trainer', email: 'trainer@coach.ai', password: 'Trainer@123456' },
  { label: 'Admin', email: 'admin@coach.ai', password: 'Admin@123456' },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'SOC 2 Type II' },
  { icon: Fingerprint, label: 'GDPR Ready' },
  { icon: Server, label: 'AES-256 Encrypted' },
];

// Live engine telemetry mirrors the real backend stack.
const TELEMETRY = [
  { label: 'Engine', value: 'LangGraph' },
  { label: 'Vector Store', value: 'ChromaDB' },
  { label: 'Model', value: 'gpt-oss-120b' },
  { label: 'RAG Chunks', value: '16' },
  { label: 'Latency', value: '~620ms' },
];

const ROTATING_WORDS = ['smarter.', 'calmer.', 'faster.', 'human.'];

// Interactive particle constellation — dots drift and wire together,
// and to the cursor, like a living neural network over the page.
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const COUNT = 84;
    const dots: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const mouse = { x: -9999, y: -9999 };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      dots.length = 0;
      for (let i = 0; i < COUNT; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 1.7 + 0.7,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const isLight = document.documentElement.classList.contains('light');
      const rgb = isLight ? '99,102,241' : '129,140,248';

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -10 || d.x > w + 10) d.vx *= -1;
        if (d.y < -10 || d.y > h + 10) d.vy *= -1;
      }

      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - dist / 120) * 0.26})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        const mdx = a.x - mouse.x;
        const mdy = a.y - mouse.y;
        const mdist = Math.hypot(mdx, mdy);
        if (mdist < 170) {
          ctx.strokeStyle = `rgba(${rgb}, ${(1 - mdist / 170) * 0.6})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(${rgb}, 0.85)`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onResize = () => {
      resize();
      init();
    };

    resize();
    init();
    draw();
    if (!reduceMotion) {
      const loop = () => {
        draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

type AuthMode = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('agent@coach.ai');
  const [password, setPassword] = useState('Agent@123456');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const { setUser } = useStore();
  const navigate = useNavigate();

  // Rotate the staggered headline word.
  useEffect(() => {
    const id = setInterval(() => setWordIndex((w) => (w + 1) % ROTATING_WORDS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const openAuth = (m: AuthMode) => {
    setMode(m);
    setError('');
    setPassword(m === 'login' ? 'Agent@123456' : '');
    setEmail(m === 'login' ? 'agent@coach.ai' : '');
    setLoading(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (mode === 'login') {
        res = await api.post('/auth/login', { email, password });
      } else {
        res = await api.post('/auth/register', { email, password, full_name: fullName });
      }
      setUser(res.data.user, res.data.access_token);
      setModalOpen(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError('');
    setPassword(m === 'login' ? 'Agent@123456' : '');
    setEmail(m === 'login' ? 'agent@coach.ai' : '');
  };

  const orbs = [
    'left-[8%] top-[22%] w-2 h-2 bg-indigo-400/70',
    'left-[30%] bottom-[18%] w-1.5 h-1.5 bg-cyan-300/60',
    'right-[12%] top-[30%] w-2.5 h-2.5 bg-fuchsia-400/60',
    'right-[22%] bottom-[24%] w-1.5 h-1.5 bg-emerald-300/50',
  ];

  return (
    <div className="relative min-h-screen flex flex-col text-slate-100 bg-[#080b12] overflow-x-hidden overflow-y-auto">
      {/* Living particle-constellation canvas behind everything */}
      <div className="absolute inset-0 z-0">
        <ParticleBackground />
      </div>

      {/* Faint vignette + aurora glow to seat the dots */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-indigo-700/20 via-transparent to-purple-800/20" />
      <div className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-600/25 blur-[120px] animate-aurora-a" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 w-[28rem] h-[28rem] rounded-full bg-purple-600/20 blur-[130px] animate-aurora-b" />
      {orbs.map((cls, i) => (
        <div
          key={`o${i}`}
          className={`pointer-events-none absolute rounded-full blur-[1px] ${cls} ${i % 2 ? 'animate-float-y-late' : 'animate-float-y'}`}
        />
      ))}

      {/* ===== TOP BAR: brand (left) + auth buttons (top-right corner) ===== */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 md:px-14 py-6">
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 text-white relative z-10">
              <Bot className="w-6 h-6" />
            </div>
            <div className="absolute -inset-1.5 rounded-3xl border-t border-indigo-300/60 animate-spin-slower" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-indigo-400">NovaDesk AI</p>
            <p className="text-base font-bold text-slate-100">Coach at every turn</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-3 shrink-0"
        >
          <button
            onClick={() => openAuth('login')}
            className="px-6 py-3 rounded-xl text-base font-semibold text-slate-200 bg-slate-900/50 border border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-900/80 hover:text-white backdrop-blur-md transition-all duration-300"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuth('register')}
            className="btn-shine px-6 py-3 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 transition-all duration-300"
          >
            Sign Up
          </button>
        </motion.div>
      </header>

      {/* ===== FULL-PAGE HERO (no panels — content only) ===== */}
      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-6 md:px-14 pt-6 pb-12 space-y-14">
        {/* Hero headline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-sm font-semibold uppercase tracking-wider text-indigo-300 mb-8">
            <Zap className="w-4 h-4" /> Live Response Guidance
          </div>
          <h1 className="page-heading text-6xl md:text-8xl font-bold leading-[1.02] text-slate-50">
            Support, made{' '}
            <span className="inline-block min-w-[11ch] relative">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }}
                  className="grad-text-anim"
                >
                  {ROTATING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 leading-relaxed max-w-3xl mx-auto mt-7">
            An intelligent AI workspace that live-coaches every support interaction — intent, sentiment,
            escalation risk and recommended responses, all in real time.
          </p>

          {/* Engine telemetry strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-9"
          >
            {TELEMETRY.map((t) => (
              <span key={t.label} className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="uppercase tracking-wider text-[11px] text-slate-500">{t.label}</span>
                <span className="font-mono font-semibold text-indigo-300">{t.value}</span>
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* About the Project — prose, no box */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25 }}>
          <div className="flex items-center gap-3 mb-5 justify-center">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-500/70" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">About the Project</h2>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-500/70" />
          </div>
          <div className="grid md:grid-cols-2 gap-x-14 gap-y-6 max-w-4xl mx-auto text-center md:text-left">
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
              NovaDesk AI is an end-to-end AI-powered customer support assistant. Every agent conversation
              streams through a LangGraph pipeline that reads intent, sentiment and escalation risk, then
              pulls the right answers from a vector knowledge base.
            </p>
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
              Before the customer finishes typing, the agent is coached with a ready-to-send reply and a
              live quality score — so support gets faster, calmer and more human with every single interaction.
            </p>
          </div>

          {/* At-a-glance facts — plain stats, no boxes */}
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 max-w-4xl mx-auto mt-9">
            <span className="flex items-center gap-2.5 text-base text-slate-300">
              <Glasses className="w-5 h-5 text-indigo-400" /> Live intent & sentiment analysis
            </span>
            <span className="flex items-center gap-2.5 text-base text-slate-300">
              <AudioLines className="w-5 h-5 text-cyan-400" /> Real-time coaching as agents type
            </span>
            <span className="flex items-center gap-2.5 text-base text-slate-300">
              <Clock3 className="w-5 h-5 text-emerald-400" /> ~620ms end-to-end guidance
            </span>
          </div>
        </motion.section>

        {/* How It Works — vertical steps with dividers, no boxes */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.35 }}>
          <div className="flex items-center gap-3 mb-9 justify-center">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-500/70" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">How It Works</h2>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-500/70" />
          </div>
          <ol className="max-w-3xl mx-auto">
            {[
              { title: 'Conversation streams in', desc: 'Live transcript flows over the socket the moment an agent starts talking.' },
              { title: 'AI analyzes the signal', desc: 'Intent, sentiment and escalation risk are classified on every turn.' },
              { title: 'Knowledge is retrieved', desc: 'Semantic search surfaces the most relevant KB chunks (RAG).' },
              { title: 'Coaching appears live', desc: 'A suggested reply and quality score pop up in under a second.' },
            ].map(({ title, desc }, i) => (
              <li key={title} className="relative flex gap-6 pb-8 last:pb-0">
                {i < 3 && (
                  <span className="absolute left-[1.15rem] top-11 bottom-0 w-px bg-gradient-to-b from-indigo-500/60 to-transparent" />
                )}
                <span className="w-10 h-10 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 font-bold text-lg flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-100">{title}</h3>
                  <p className="text-base md:text-lg text-slate-500 leading-relaxed mt-1">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* Features — plain icon + copy rows */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.45 }}>
          <div className="flex items-center gap-3 mb-9 justify-center">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-500/70" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">What You Get</h2>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-500/70" />
          </div>
          <div className="grid md:grid-cols-2 gap-x-14 gap-y-7 max-w-4xl mx-auto">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <span className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-indigo-400" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{f.title}</h3>
                  <p className="text-base text-slate-500 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Stats + trust */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }} className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {STATS.map((s, i) => (
            <div key={s.label} className="relative text-center">
              {i > 0 && <span className="hidden md:block absolute -left-6 top-1/2 -translate-y-1/2 h-10 w-px bg-slate-700/60" />}
              <p className="text-4xl font-bold text-slate-50 tracking-tight grad-text-anim bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
          <div className="w-full flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4">
            {TRUST_BADGES.map((b) => (
              <span key={b.label} className="flex items-center gap-2 text-sm text-slate-500">
                <b.icon className="w-4 h-4 text-emerald-400" /> {b.label}
              </span>
            ))}
          </div>
        </motion.section>
      </div>

      {/* ===== AUTH MODAL (Sign In / Sign Up) ===== */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 26, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as any }}
              onClick={(e) => e.stopPropagation()}
              className="login-ring w-full max-w-md"
            >
              <div className="relative px-7 py-7 sm:px-8 sm:py-8 space-y-5 max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setModalOpen(false)}
                  className="absolute right-4 top-4 p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-indigo-400">NovaDesk AI</p>
                  <h2 className="page-heading text-2xl font-bold text-slate-50 mt-1">
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{mode === 'login' ? 'Continue coaching — sign in below.' : 'Join the NovaDesk AI customer support co-pilot platform.'}</p>
                </div>

                {/* Mode tabs */}
                <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
                  {(['login', 'register'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                        mode === m
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m === 'login' ? 'Sign In' : 'Sign Up'}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Error */}
                    {error && (
                      <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
                      {mode === 'register' && (
                        <div>
                          <label className="block text-slate-400 mb-1.5 font-medium text-xs">Full Name</label>
                          <div className="relative group">
                            <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition" />
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Alex Carter"
                              className="w-full bg-slate-950/80 text-slate-200 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-400 mb-1.5 font-medium text-xs">Email Address</label>
                        <div className="relative group">
                          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="w-full bg-slate-950/80 text-slate-200 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1.5 font-medium text-xs">Password</label>
                        <div className="relative group">
                          <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === 'register' ? 'Create a strong password' : '••••••••'}
                            className="w-full bg-slate-950/80 text-slate-200 pl-10 pr-11 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder:text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {mode === 'login' && (
                        <div className="flex items-center justify-between text-xs">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                            <input type="checkbox" defaultChecked className="accent-indigo-500" />
                            Remember me
                          </label>
                          <span className="text-indigo-400 font-medium hover:underline cursor-pointer">Forgot password?</span>
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileTap={loading ? undefined : { scale: 0.98 }}
                        className="btn-shine w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:shadow-none"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{mode === 'login' ? 'Authenticating...' : 'Creating account...'}</span>
                          </>
                        ) : (
                          <>
                            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    </form>
                  </motion.div>
                </AnimatePresence>

                {/* Demo Accounts (login only) */}
                {mode === 'login' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-400 space-y-2"
                  >
                    <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Demo Accounts — click to autofill
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.label}
                          type="button"
                          onClick={() => {
                            setEmail(acc.email);
                            setPassword(acc.password);
                            setFullName(acc.label);
                            setError('');
                          }}
                          className="text-left p-2.5 rounded-lg border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition"
                        >
                          <p className="font-bold text-slate-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {acc.label}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 break-all">{acc.email}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-center gap-4">
                  {TRUST_BADGES.map((b) => (
                    <span key={b.label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <b.icon className="w-3 h-3 text-emerald-400" /> {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};