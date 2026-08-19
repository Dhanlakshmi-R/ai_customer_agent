import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
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
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

const FEATURES = [
  { icon: BrainCircuit, title: 'Live AI Coaching', desc: 'Intent, sentiment & empathy on every turn.' },
  { icon: ShieldCheck, title: 'Escalation Radar', desc: 'Risk alerts before things go sideways.' },
  { icon: Languages, title: 'Translate & Read Aloud', desc: 'Work in 8+ languages instantly.' },
  { icon: Rocket, title: 'Simulator & Replay', desc: 'Practice against realistic personas.' },
];

const STATS = [
  { value: '8+', label: 'Languages' },
  { value: '99%', label: 'Uptime' },
  { value: '24/7', label: 'AI Coaching' },
];

const DEMO_ACCOUNTS = [
  { label: 'Agent', email: 'agent@coach.ai', password: 'Agent@123456' },
  { label: 'Trainer', email: 'trainer@coach.ai', password: 'Trainer@123456' },
  { label: 'Admin', email: 'admin@coach.ai', password: 'Admin@123456' },
];

// Rotating visual showing a live coaching turn with animated badges.
const LIVE_TURNS = [
  { msg: '“Why was I charged twice this month?”', badge: 'Intent: Billing & Refund', tone: 'text-emerald-400', int: 'Billing & Refund' },
  { msg: '“This is ridiculous, I want this fixed NOW!”', badge: 'Frustration: High', tone: 'text-rose-400', int: 'Escalation Risk' },
  { msg: '“OK that helps. How do I see the invoice?”', badge: 'Sentiment improving', tone: 'text-indigo-400', int: 'Knowledge: RAG' },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('agent@coach.ai');
  const [password, setPassword] = useState('Agent@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const { setUser } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setTurnIndex((i) => (i + 1) % LIVE_TURNS.length), 4200);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      setUser(res.data.user, res.data.access_token);
      navigate('/console');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-slate-100 bg-[#080b12]">
      {/* ===== LEFT: Animated Brand Panel ===== */}
      <div className="relative flex-1 hidden lg:flex flex-col justify-between overflow-hidden bg-[#0b0f1c] px-12 py-10 border-r border-slate-800/70">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-700/35 via-[#0b0f1c] to-purple-800/25" />
        <div className="pointer-events-none absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-indigo-600/35 blur-[110px] animate-pulse-slow" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 w-[26rem] h-[26rem] rounded-full bg-purple-600/30 blur-[120px] animate-pulse-slower" />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.07) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at 20% 30%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 20% 30%, black 20%, transparent 70%)',
          }}
        />

        {/* Brand Header */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 text-white">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-indigo-400">Coach AI</p>
            <p className="text-sm font-bold text-slate-100">Customer Support Coaching</p>
          </div>
        </motion.div>

        {/* Live Coaching Visual */}
        <div className="relative space-y-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <h1 className="page-heading text-5xl font-bold leading-[1.05] text-slate-50">
              Support, made{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                smarter.
              </span>
            </h1>
            <p className="text-[15px] text-slate-400 leading-relaxed max-w-md mt-4">
              An intelligent AI workspace that live-coaches every support interaction — intent, sentiment,
              escalation risk and recommended responses, all in real time.
            </p>
          </motion.div>

          {/* Live coaching feed simulation */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/60 backdrop-blur-md p-4 space-y-3 shadow-2xl shadow-indigo-950/50"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-indigo-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Coaching Feed
              </span>
              <span className="text-[9px] text-slate-500">LangGraph Engine</span>
            </div>

            {/* Customer message */}
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-rose-950 border border-rose-800/50 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">C</div>
              <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl rounded-tl-none px-3 py-2 text-xs text-slate-200">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={turnIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                  >
                    {LIVE_TURNS[turnIndex].msg}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Animated badge */}
            <AnimatePresence mode="wait">
              <motion.div
                key={turnIndex}
                initial={{ opacity: 0, x: -10, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1.5 pl-8"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className={`text-[10px] font-semibold ${LIVE_TURNS[turnIndex].tone}`}>
                  {LIVE_TURNS[turnIndex].badge}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Suggested reply skeleton */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="pl-8"
            >
              <div className="rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/25 px-3 py-2.5 text-[11px] text-slate-300">
                <span className="font-semibold text-indigo-300">Suggested reply:</span> “I'm so sorry for the
                confusion — let me review those charges right away and get this resolved.”
              </div>
            </motion.div>
          </motion.div>

          {/* Feature chips */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 max-w-lg">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="p-4 rounded-2xl border border-slate-700/60 bg-slate-900/50 space-y-2 hover:border-indigo-500/50 hover:bg-slate-900/80 transition"
              >
                <f.icon className="w-5 h-5 text-indigo-400" />
                <p className="text-[13px] font-semibold text-slate-200">{f.title}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Stats Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative flex items-center gap-10 pt-2"
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-slate-50">{s.value}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ===== RIGHT: Login Form Panel ===== */}
      <div className="relative flex-1 flex flex-col justify-center min-h-screen lg:min-h-0 bg-[#080b12] px-6 py-10 sm:px-10 lg:px-16 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-[24rem] h-[24rem] rounded-full bg-indigo-600/18 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[20rem] h-[20rem] rounded-full bg-cyan-500/10 blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as any }}
          className="relative z-10 w-full max-w-md mx-auto space-y-6"
        >
          {/* Mobile Brand */}
          <div className="lg:hidden flex items-center gap-3 animate-fade-up">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
              <Bot className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="page-heading text-xl font-bold text-slate-100">Coach AI</h1>
              <p className="text-[11px] text-slate-400">Customer Support Coaching Workspace</p>
            </div>
          </div>

          {/* Header */}
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-1.5">
            <motion.div variants={item} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              <Zap className="w-3 h-3" /> Welcome Back
            </motion.div>
            <motion.h2 variants={item} className="page-heading text-3xl font-bold text-slate-50">
              Sign in to your workspace
            </motion.h2>
            <motion.p variants={item} className="text-sm text-slate-400">
              Enter your credentials to continue coaching.
            </motion.p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            variants={container}
            initial="hidden"
            animate="show"
            onSubmit={handleLogin}
            className="space-y-4 text-sm"
          >
            <motion.div variants={item}>
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
            </motion.div>

            <motion.div variants={item}>
              <label className="block text-slate-400 mb-1.5 font-medium text-xs">Password</label>
              <div className="relative group">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </motion.div>

            <motion.div variants={item} className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                <input type="checkbox" defaultChecked className="accent-indigo-500" />
                Remember me
              </label>
              <span className="text-indigo-400 font-medium hover:underline cursor-pointer">Forgot password?</span>
            </motion.div>

            <motion.button
              variants={item}
              type="submit"
              disabled={loading}
              whileTap={loading ? undefined : { scale: 0.98 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Demo Accounts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-400 space-y-2.5"
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
                    setError('');
                  }}
                  className="text-left p-2.5 rounded-lg border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition"
                >
                  <p className="font-bold text-slate-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {acc.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 break-all">{acc.email}</p>
                  <p className="text-[10px] text-slate-500 mono">••••••••</p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Register link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="flex items-center justify-center gap-2 text-xs text-slate-400"
          >
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
              Create one free
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};