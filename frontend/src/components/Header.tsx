import React, { useState } from 'react';
import { Search, Sun, Moon, Bell, PanelLeft, Command } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Header: React.FC = () => {
  const { theme, toggleTheme, user, setMobileNavOpen } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center hover:bg-indigo-500/25 transition"
          title="Open navigation"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <div className="relative w-44 sm:w-72 md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search knowledge, sessions, tickets..."
            className="w-full bg-slate-950/60 text-slate-200 pl-9 pr-12 py-2 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-indigo-400 transition shadow-inner shadow-black/5"
          />
          <span className="desktop-only absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <Command className="w-2.5 h-2.5" />K
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Real-time Status Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Orchestrator Active</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white transition border border-slate-700/50"
          title="Toggle Dark / Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white transition border border-slate-700/50 relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 text-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-slate-100">Live Coaching Alerts</span>
                <span className="text-[10px] text-indigo-400">2 New</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <p className="font-medium text-amber-300">Escalation Warning</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Session #4829 customer frustration score reached 0.85.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <p className="font-medium text-emerald-300">Knowledge Matched</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">RAG surfaced SLA Refund SOP (94% confidence match).</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Summary */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-200">{user?.full_name || 'Agent'}</p>
            <p className="text-[10px] text-indigo-400 capitalize">{user?.role || 'Support Agent'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};