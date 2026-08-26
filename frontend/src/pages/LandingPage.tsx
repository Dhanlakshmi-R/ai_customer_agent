import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  ShieldCheck,
  Fingerprint,
  Server,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  Loader2,
  Zap,
  X,
  Menu,
  Layers,
  Network,
  BrainCircuit,
  Database,
  Cpu,
  Users,
  Workflow,
  BarChart3,
  Sparkles,
  Search,
  Landmark,
  GraduationCap,
  Briefcase,
  PieChart,
  FlaskConical,
  Globe,
  Send,
  Terminal,
  User as UserIcon,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { PageBackground } from '../components/PageBackground';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
];

const FEATURES = [
  { icon: Layers, title: 'Multi-Agent Intelligence', desc: 'Coordinate multiple specialized AI agents to solve complex tasks with remarkable accuracy.' },
  { icon: Workflow, title: 'Intelligent Orchestration', desc: 'Automatically route every task to the most suitable agent across the network.' },
  { icon: Database, title: 'RAG-Powered Knowledge', desc: 'Retrieve trusted context from knowledge sources before generating any response.' },
  { icon: BrainCircuit, title: 'AI Decision Making', desc: 'Agents analyze signals, weigh options and make confident, explainable decisions.' },
  { icon: Users, title: 'Real-Time Collaboration', desc: 'Specialized agents work together as one coordinated, always-synced system.' },
  { icon: BarChart3, title: 'Analytics & Insights', desc: 'Track agent activity, performance and results through an intuitive dashboard.' },
];

const WORKFLOW = [
  { icon: UserIcon, title: 'User', sub: 'A request enters the platform' },
  { icon: Network, title: 'Orchestrator Agent', sub: 'Plans and delegates the task' },
  { icon: Layers, title: 'Specialized AI Agents', sub: 'Domain experts execute in parallel' },
  { icon: Database, title: 'RAG / Knowledge / Tools', sub: 'Ground truth is retrieved' },
  { icon: Cpu, title: 'AI Processing', sub: 'Signals are synthesized' },
  { icon: CheckCircle2, title: 'Intelligent Response', sub: 'A final answer is delivered' },
];

const STATS = [
  { value: 2.4, decimals: 1, suffix: 'x', title: 'Faster Processing', desc: 'Parallel agents cut resolution time dramatically.' },
  { value: 92, decimals: 0, suffix: '%', title: 'Intelligent Automation', desc: 'End-to-end autonomous task handling.' },
  { value: 0, decimals: 0, suffix: '∞', title: 'Scalable Architecture', desc: 'Spin up any number of specialized agents.' },
  { value: 99.9, decimals: 1, suffix: '%', title: 'Secure & Reliable', desc: 'Enterprise-grade encryption and uptime.' },
];

const APPLICATIONS = [
  { icon: Bot, title: 'Customer Support', desc: '24/7 intelligent ticket resolution.' },
  { icon: Landmark, title: 'Banking', desc: 'Fraud analysis and compliance help.' },
  { icon: GraduationCap, title: 'Education', desc: 'Personalized tutoring assistants.' },
  { icon: Briefcase, title: 'Business Automation', desc: 'Workflow and document automation.' },
  { icon: PieChart, title: 'Data Analysis', desc: 'Insights generated from raw data.' },
  { icon: FlaskConical, title: 'Intelligent Research', desc: 'Multi-source literature synthesis.' },
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

const DEMO_PIPELINE = ['Orchestrator', 'Intent Agent', 'Knowledge (RAG)', 'Response Agent'];

/* ------------------------------------------------------------------ */
/*  Count-up hook for the "Why Choose Us" stats                       */
/* ------------------------------------------------------------------ */

const useCountUp = (target: number, decimals = 0, duration = 1600) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(parseFloat((target * eased).toFixed(decimals)));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, decimals, duration]);

  return { ref, value };
};

const StatCard: React.FC<{ stat: (typeof STATS)[number] }> = ({ stat }) => {
  const { ref, value } = useCountUp(stat.value, stat.decimals);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="text-center"
    >
      <div
        ref={ref}
        className="text-5xl md:text-6xl font-bold tracking-tight grad-text-anim bg-clip-text text-transparent"
      >
        {stat.value === 0 && '∞'}
        {stat.value !== 0 && value.toFixed(stat.decimals)}
        <span className="text-3xl md:text-4xl">{stat.suffix}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-slate-100">{stat.title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-[220px] mx-auto leading-relaxed">{stat.desc}</p>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Orchestrator visual for the hero section                          */
/* ------------------------------------------------------------------ */
/*  Hero live-activity console (replaces the orchestrator nodes)      */
/* ------------------------------------------------------------------ */

const HERO_LOG = [
  { icon: Network, tone: 'text-indigo-300', text: 'Orchestrator Agent → task accepted, plan ready' },
  { icon: Search, tone: 'text-cyan-300', text: 'Intent Agent → classified: Billing & Refund (0.12s)' },
  { icon: Database, tone: 'text-emerald-300', text: 'Knowledge Agent → retrieved 4 RAG chunks (590ms)' },
  { icon: Cpu, tone: 'text-amber-300', text: 'Tool Agent → payment method + policy verified' },
  { icon: BrainCircuit, tone: 'text-fuchsia-300', text: 'Response Agent → draft ready · quality 94/100' },
];

const HERO_CHIPS = [
  { label: 'RAG · 590ms', pos: 'left-[-6%] top-[16%]', delay: '0s' },
  { label: 'gpt-oss-120b', pos: 'right-[-4%] top-[8%]', delay: '0.8s' },
  { label: '94% accuracy', pos: 'left-[-4%] bottom-[20%]', delay: '1.4s' },
  { label: '24/7 agents', pos: 'right-[-2%] bottom-[10%]', delay: '2s' },
];

const HeroConsole: React.FC = () => {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((l) => l + 1), 1800);
    return () => clearInterval(id);
  }, []);

  // Rolling window of the 3 most recent log lines — wraps forever so the
  // orchestration sequence keeps looping continuously.
  const n = HERO_LOG.length;
  const idx = line % n;
  const visible = [
    HERO_LOG[(idx - 2 + n) % n],
    HERO_LOG[(idx - 1 + n) % n],
    HERO_LOG[idx],
  ];

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* glowing console card */}
      <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md overflow-hidden shadow-2xl shadow-indigo-950/50">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-300" /> agent-orchestrator · live
          </span>
        </div>

        {/* rolling log */}
        <div className="px-6 py-6 space-y-3 min-h-[260px]">
          <AnimatePresence mode="popLayout">
            {visible.map((entry) => (
              <motion.div
                key={entry.text}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.35 }}
                className="flex items-start gap-3"
              >
                <span className={`w-7 h-7 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${entry.tone}`}>
                  <entry.icon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <span className={`text-[13px] font-medium ${entry.tone}`}>{entry.text.split(' → ')[0]}</span>
                  <span className="text-[13px] text-slate-400"> → {entry.text.split(' → ')[1]}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex items-center gap-1.5 pt-1 text-slate-500">
            <span className="animate-caret text-indigo-300 font-bold">▍</span>
            <span className="text-[11px] font-mono">synthesizing final response…</span>
          </div>
        </div>

        {/* footer stats */}
        <div className="grid grid-cols-3 divide-x divide-white/8 border-t border-white/8 bg-black/20">
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-slate-50">4</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Agents active</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-300">590ms</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Avg latency</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-indigo-300">94%</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Reply quality</p>
          </div>
        </div>
      </div>

      {/* floating accent chips */}
      {HERO_CHIPS.map((c) => (
        <div
          key={c.label}
          className={`absolute ${c.pos} animate-float-y px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md text-xs font-medium text-slate-200 shadow-lg shadow-indigo-950/40`}
          style={{ animationDelay: c.delay }}
        >
          {c.label}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Auth modal (Sign In / Sign Up)                                    */
/* ------------------------------------------------------------------ */

type AuthMode = 'login' | 'register';

const AuthModal: React.FC<{
  open: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, initialMode, onClose, onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('agent@coach.ai');
  const [password, setPassword] = useState('Agent@123456');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError('');
      setLoading(false);
      setShowPassword(false);
      setEmail(initialMode === 'login' ? 'agent@coach.ai' : '');
      setPassword(initialMode === 'login' ? 'Agent@123456' : '');
    }
  }, [open, initialMode]);

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
      onSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot reach the server. The backend may be starting up — please wait a moment and try again.');
      } else {
        setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError('');
    setPassword('');
    if (m === 'login') setEmail('agent@coach.ai');
    else setEmail('');
  };

  const inputCls =
    'w-full bg-slate-950/80 text-slate-200 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder:text-slate-600';
  const labelCls = 'block text-slate-400 mb-1.5 font-medium text-xs';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 26, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="login-ring w-full max-w-md"
            style={{ overflow: 'visible' }}
          >
            <div className="relative px-7 py-7 sm:px-8 sm:py-8 space-y-5 max-h-[90vh] overflow-y-auto">
              <button
                onClick={onClose}
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
                <p className="text-xs text-slate-400 mt-1">{mode === 'login' ? 'Continue coaching — sign in below.' : 'Join the NovaDesk AI platform.'}</p>
              </div>

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
                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
                    {mode === 'register' && (
                      <div>
                        <label className={labelCls}>Full Name</label>
                        <div className="relative group">
                          <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Alex Carter"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className={labelCls}>Email Address</label>
                      <div className="relative group">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Password</label>
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
  );
};

/* ------------------------------------------------------------------ */
/*  Interactive demo response generator (pure client-side)            */
/* ------------------------------------------------------------------ */

const getDemoResponse = (raw: string): { intent: string; agent: string; reply: string } => {
  const t = raw.toLowerCase();
  if (t.includes('refund') || t.includes('billing') || t.includes('charge') || t.includes('payment')) {
    return {
      intent: 'Billing & Refund',
      agent: 'Intent Agent → Knowledge (RAG) → Response Agent',
      reply:
        "I've located the duplicate charge and initiated a refund to your original payment method, expected within 5-7 business days. I also removed the recurring hold so it won't happen again — want me to email you a confirmation?",
    };
  }
  if (t.includes('login') || t.includes('password') || t.includes('reset') || t.includes('error') || t.includes('access')) {
    return {
      intent: 'Account & Access',
      agent: 'Intent Agent → Tool Agent → Response Agent',
      reply:
        'Your account is verified and the session has been renewed — a secure reset link is on its way to your inbox. If the problem persists, I can escalate this to a live specialist right away.',
    };
  }
  if (t.includes('track') || t.includes('order') || t.includes('ship') || t.includes('delivery')) {
    return {
      intent: 'Order & Shipping',
      agent: 'Intent Agent → Tool Agent → Knowledge (RAG)',
      reply:
        'Your order shipped 2 days ago and is currently in transit with an expected delivery of tomorrow by 6 PM. I will keep this thread updated the moment the courier scans the package.',
    };
  }
  return {
    intent: 'General Inquiry',
    agent: 'Orchestrator → Intent Agent → Response Agent',
    reply:
      'Thanks for reaching out! I analyzed your query, retrieved the most relevant knowledge-base articles, and drafted a response we can refine together. Ask me anything else and multiple agents will collaborate to help you.',
  };
};

/* ------------------------------------------------------------------ */
/*  Landing page                                                      */
/* ------------------------------------------------------------------ */

export const LandingPage: React.FC = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const [demoInput, setDemoInput] = useState('');
  const [demoPhase, setDemoPhase] = useState<'idle' | 'routing' | 'done'>('idle');
  const [routeStep, setRouteStep] = useState(0);
  const [demoResult, setDemoResult] = useState<{ intent: string; agent: string; reply: string } | null>(null);

  const openAuth = (m: AuthMode) => {
    setAuthMode(m);
    setMenuOpen(false);
    setAuthOpen(true);
  };

  const runDemo = () => {
    const text = demoInput.trim() || 'Customer wants to know about their pending refund status.';
    setDemoPhase('routing');
    setRouteStep(0);
    setDemoResult(null);
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      setRouteStep(step);
      if (step >= DEMO_PIPELINE.length) {
        clearInterval(id);
        setTimeout(() => {
          setDemoResult(getDemoResponse(text));
          setDemoPhase('done');
        }, 450);
      }
    }, 650);
  };

  const sampleTasks = [
    'Customer is asking about a refund',
    'User cannot reset their password',
    'Where is my order shipment?',
  ];

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  return (
    <div id="home" className="relative min-h-screen text-slate-100 bg-[#070a12] overflow-x-hidden scroll-smooth">
      {/* Global particle/aurora background (shared with the whole app) */}
      <PageBackground />

      {/* ================= NAVBAR ================= */}
      <header className="relative z-40 sticky top-0 backdrop-blur-xl bg-[#070a12]/70 border-b border-white/5">
        <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-16 md:h-18 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="#home" onClick={scrollTo('home')} className="flex items-center gap-3 shrink-0">
            <div className="relative w-10 h-10 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 text-white relative z-10">
                <Bot className="w-5 h-5" />
              </div>
              <div className="absolute -inset-1 rounded-2xl border-t border-indigo-300/60 animate-spin-slower" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-50 leading-none">NovaDesk AI</p>
              <p className="text-[10px] text-slate-500 mt-1 tracking-wide">Intelligent Multi-Agent Platform</p>
            </div>
          </a>

          {/* Center links (desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={scrollTo(l.href.slice(1))}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => openAuth('login')}
              className="hidden sm:inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-white/5 border border-white/15 hover:border-indigo-400/50 hover:bg-white/10 hover:text-white transition-all duration-300"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('register')}
              className="btn-shine hidden sm:inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all duration-300"
            >
              Sign Up
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:text-white transition"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-white/5 bg-[#070a12]/95 backdrop-blur-xl"
            >
              <div className="px-6 py-4 space-y-1">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={scrollTo(l.href.slice(1))}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 transition"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-2.5 pt-3">
                  <button
                    onClick={() => openAuth('login')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-white/5 border border-white/15 hover:text-white transition"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuth('register')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/30 transition"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-16 md:pt-24 pb-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left column */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-400/25 text-[11px] font-bold tracking-[.18em] text-indigo-300">
            <Zap className="w-3.5 h-3.5" /> POWERED BY MULTI-AGENT AI
          </span>

          <h1 className="page-heading mt-6 text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.03] text-slate-50">
            Intelligent Agents.
            <br />
            <span className="grad-text-anim bg-clip-text text-transparent">One Powerful Platform.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-400 leading-relaxed max-w-xl">
            NovaDesk AI coordinates multiple specialized AI agents through a central orchestrator — each task is
            understood, routed and solved by the right expert, end to end, in real time.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              onClick={() => openAuth('register')}
              className="btn-shine group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all duration-300"
            >
              Get Started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={scrollTo('features')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-slate-200 bg-white/5 border border-white/15 hover:border-indigo-400/50 hover:bg-white/10 hover:text-white transition-all duration-300"
            >
              Explore Features
            </button>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            <span className="text-slate-400 font-medium">Multi-Agent AI</span>
            <span className="mx-2 text-slate-600">•</span>
            <span className="text-slate-400 font-medium">RAG</span>
            <span className="mx-2 text-slate-600">•</span>
            <span className="text-slate-400 font-medium">LLM</span>
            <span className="mx-2 text-slate-600">•</span>
            <span className="text-slate-400 font-medium">Intelligent Automation</span>
          </p>
        </motion.div>

        {/* Right column — orchestrator visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative">
            <HeroConsole />
          </div>
        </motion.div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold tracking-[.18em] text-indigo-300 uppercase">
            <Layers className="w-3.5 h-3.5" /> Features
          </span>
          <h2 className="page-heading mt-5 text-4xl md:text-5xl font-bold text-slate-50">
            Everything You Need for <span className="grad-text-anim bg-clip-text text-transparent">Intelligent Automation</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            Six core capabilities engineered to work together as one coordinated system.
          </p>
        </motion.div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7 hover:border-indigo-400/40 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-indigo-950/60 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-indigo-400/25 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110">
                <f.icon className="w-6 h-6 text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold tracking-[.18em] text-indigo-300 uppercase">
            <Workflow className="w-3.5 h-3.5" /> Pipeline
          </span>
          <h2 className="page-heading mt-5 text-4xl md:text-5xl font-bold text-slate-50">
            How Our <span className="grad-text-anim bg-clip-text text-transparent">AI Works</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            From a single user request to a final intelligent response — watch the orchestration flow.
          </p>
        </motion.div>

        <div className="mt-14 max-w-3xl mx-auto">
          {WORKFLOW.map((step, i) => {
            const isLast = i === WORKFLOW.length - 1;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative flex gap-6"
              >
                {!isLast && (
                  <span className="absolute left-[1.45rem] top-14 bottom-0 w-px bg-gradient-to-b from-indigo-500/60 via-violet-500/30 to-transparent" />
                )}
                <div
                  className={`relative w-12 h-12 shrink-0 rounded-2xl border flex items-center justify-center ${
                    i === 0
                      ? 'border-slate-400/40 bg-slate-700/30 text-slate-100'
                      : i === 5
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-indigo-400/40 bg-indigo-500/15 text-indigo-300'
                  }`}
                >
                  <step.icon className="w-6 h-6" />
                  <span className="absolute -inset-1 rounded-2xl border-t border-indigo-300/40 animate-spin-slower" style={{ animationDuration: `${6 + i}s` }} />
                </div>
                <div className="pt-2 pb-10">
                  <h3 className="text-lg md:text-xl font-semibold text-slate-100">
                    <span className="inline-block mr-2 text-xs font-bold text-indigo-400/80 uppercase tracking-wider">Step {i + 1}</span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm md:text-base text-slate-500">{step.sub}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ================= WHY CHOOSE US ================= */}
      <section id="why-us" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold tracking-[.18em] text-indigo-300 uppercase">
            <BarChart3 className="w-3.5 h-3.5" /> Why Choose Us
          </span>
          <h2 className="page-heading mt-5 text-4xl md:text-5xl font-bold text-slate-50">
            Built to <span className="grad-text-anim bg-clip-text text-transparent">Outperform</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <StatCard key={s.title} stat={s} />
          ))}
        </div>
      </section>

      {/* ================= INTERACTIVE DEMO ================= */}
      <section id="demo" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold tracking-[.18em] text-indigo-300 uppercase">
            <BrainCircuit className="w-3.5 h-3.5" /> Live Demo
          </span>
          <h2 className="page-heading mt-5 text-4xl md:text-5xl font-bold text-slate-50">
            Try the <span className="grad-text-anim bg-clip-text text-transparent">Multi-Agent Workspace</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            Enter a task and watch how the platform routes it between specialized agents — no backend required.
          </p>
        </motion.div>

        <div className="mt-14 max-w-4xl mx-auto rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md overflow-hidden shadow-2xl shadow-indigo-950/40">
          {/* Console header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 bg-white/[0.02]">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-3 text-xs text-slate-500 font-mono">nova-agent workspace — live routing</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8">
            {/* Input side */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Ask the AI to analyze a task
              </label>
              <textarea
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                rows={4}
                placeholder="Customer wants to know about their pending refund status..."
                className="w-full bg-slate-950/60 text-slate-200 px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder:text-slate-600 resize-none text-sm"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {sampleTasks.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setDemoInput(s);
                      setDemoResult(null);
                      setDemoPhase('idle');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-white/5 border border-white/10 hover:border-indigo-400/40 hover:text-white transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={runDemo}
                disabled={demoPhase === 'routing'}
                className="btn-shine mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-lg shadow-indigo-600/30 transition-all duration-300 disabled:opacity-50 disabled:shadow-none"
              >
                {demoPhase === 'routing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Routing across agents...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Analyze with Agents
                  </>
                )}
              </button>
            </div>

            {/* Output side */}
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Agent Routing</p>
              <div className="space-y-2">
                {DEMO_PIPELINE.map((stage, i) => {
                  const active = demoPhase === 'routing' && routeStep >= i + 1;
                  const done = demoPhase === 'done';
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-300 ${
                        done
                          ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                          : active
                            ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-200'
                            : 'border-white/8 bg-white/[0.02] text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          done ? 'bg-emerald-400' : active ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'
                        }`}
                      />
                      <span className="font-medium">{stage}</span>
                      {active && <span className="ml-auto text-[10px] text-indigo-300/80 font-mono">processing…</span>}
                      {done && <span className="ml-auto text-[10px] text-emerald-300/80 font-mono">done</span>}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {demoResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 to-purple-500/10 p-4"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> {demoResult.intent}
                    </div>
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{demoResult.reply}</p>
                    <p className="mt-3 text-[10px] text-slate-500 font-mono">path: {demoResult.agent}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold tracking-[.18em] text-indigo-300 uppercase">
            <Globe className="w-3.5 h-3.5" /> About
          </span>
          <h2 className="page-heading mt-5 text-4xl md:text-5xl font-bold text-slate-50">
            Purpose, <span className="grad-text-anim bg-clip-text text-transparent">Architecture &amp; Impact</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid lg:grid-cols-3 gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 space-y-5 text-lg text-slate-400 leading-relaxed"
          >
            <p>
              <span className="text-slate-200 font-semibold">NovaDesk AI</span> is a student-built platform that
              demonstrates the power of multi-agent architectures. Instead of one model doing everything, the
              system uses a central orchestration agent that plans a task and delegates it to specialized
              agents — each trained and optimized for a narrow domain.
            </p>
            <p>
              Specialized agents consult a <span className="text-slate-200 font-medium">RAG knowledge base</span>,
              call external tools, and feed their results back to the orchestrator, which synthesizes a final,
              coherent, intelligent response. The result is faster processing, better accuracy, and a system
              that scales by simply adding more agents.
            </p>
            <p className="text-base text-slate-500">
              Real-world applications span customer support, banking, education, business automation, data
              analysis and intelligent research — anywhere complex tasks can be broken into parallel, solvable parts.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {APPLICATIONS.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 text-center hover:border-indigo-400/40 transition-all duration-300"
              >
                <span className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/25 flex items-center justify-center">
                  <a.icon className="w-5 h-5 text-indigo-300" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-100">{a.title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent p-10 md:p-16 text-center overflow-hidden"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-indigo-500/20 blur-[120px]" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-indigo-400/30 text-[11px] font-bold tracking-[.18em] text-indigo-300 uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Ready when you are
            </span>
            <h2 className="page-heading mt-6 text-4xl md:text-6xl font-bold text-slate-50">
              Ready to Experience <span className="grad-text-anim bg-clip-text text-transparent">Intelligent AI?</span>
            </h2>
            <p className="mt-4 text-lg md:text-xl text-slate-400">
              Start your journey with a smarter multi-agent platform.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => openAuth('register')}
                className="btn-shine group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all duration-300"
              >
                Get Started
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => openAuth('login')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-slate-200 bg-white/5 border border-white/15 hover:border-indigo-400/50 hover:text-white transition-all duration-300"
              >
                Sign In
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="relative z-10 border-t border-white/5 bg-black/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="#home" onClick={scrollTo('home')} className="flex items-center gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white relative z-10">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-t border-indigo-300/60 animate-spin-slower" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-50 leading-none">NovaDesk AI</p>
                <p className="text-[10px] text-slate-500 mt-1">Coach at every turn</p>
              </div>
            </a>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">
              An AI-powered multi-agent platform that orchestrates specialized agents to solve complex tasks
              with speed, accuracy and intelligent automation.
            </p>
            <div className="mt-5 flex items-center gap-4">
              {TRUST_BADGES.map((b) => (
                <span key={b.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <b.icon className="w-3.5 h-3.5 text-emerald-400" /> {b.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Quick Links</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#home" onClick={scrollTo('home')} className="text-slate-400 hover:text-indigo-300 transition">
                  Home
                </a>
              </li>
              {NAV_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} onClick={scrollTo(l.href.slice(1))} className="text-slate-400 hover:text-indigo-300 transition">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <button onClick={() => openAuth('login')} className="text-slate-400 hover:text-indigo-300 transition">Sign In</button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Platform</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {['Multi-Agent Intelligence', 'Intelligent Orchestration', 'RAG-Powered Knowledge', 'AI Decision Making', 'Analytics & Insights'].map((f) => (
                <li key={f} className="text-slate-400">{f}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Contact</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>dhanlaxmi291@gmail.com</li>
              <li>Built for academic demonstration</li>
              <li>Multi-Agent AI · RAG · LLM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 py-6 px-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} NovaDesk AI — Intelligent Multi-Agent Platform. All rights reserved.
        </div>
      </footer>

      {/* Auth modal */}
      <AuthModal open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </div>
  );
};