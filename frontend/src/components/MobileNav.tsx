import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareCode,
  BookOpen,
  BarChart3,
  FileText,
  Settings,
  User as UserIcon,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Live Coaching', path: '/console', icon: MessageSquareCode },
  { label: 'Sessions', path: '/sessions', icon: FileText },
  { label: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Profile', path: '/profile', icon: UserIcon },
];

export const MobileNav: React.FC = () => {
  const { user, logout, mobileNavOpen, setMobileNavOpen } = useStore();
  const navigate = useNavigate();

  const close = () => setMobileNavOpen(false);

  const handleLogout = () => {
    close();
    logout();
    navigate('/login');
  };

  if (!mobileNavOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Drawer */}
      <div className="absolute left-0 top-0 h-full w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col animate-enter shadow-2xl">
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-sm tracking-wide">Coach AI</h1>
              <p className="text-xs text-indigo-400 font-medium">Customer Support Pro</p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/20 shadow-sm'
                    : 'hover:bg-slate-800/60 hover:text-slate-100'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'Agent'}</p>
                <span className="inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                  {user?.role || 'agent'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};