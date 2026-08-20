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
  LifeBuoy,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Live Coaching', path: '/console', icon: MessageSquareCode },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Sessions', path: '/sessions', icon: FileText },
      { label: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
      { label: 'Analytics', path: '/analytics', icon: BarChart3 },
      { label: 'Reports', path: '/reports', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings },
      { label: 'Profile', path: '/profile', icon: UserIcon },
    ],
  },
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
      <div className="absolute left-0 top-0 h-full w-80 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col animate-enter shadow-2xl">
        {/* Brand Header */}
        <div className="relative p-5 flex items-center justify-between border-b border-slate-800 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-purple-600/5 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-sm tracking-wide">NovaDesk AI</h1>
              <p className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Coach at every turn
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={close}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/20 to-indigo-500/5 text-indigo-300 shadow-sm border border-indigo-400/20'
                          : 'hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />
                        )}
                        <span
                          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-indigo-500/25 text-indigo-300'
                              : 'bg-slate-800/60 text-slate-400 group-hover:text-indigo-300'
                          }`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Support CTA */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-indigo-500/20 blur-2xl" />
            <LifeBuoy className="w-5 h-5 text-indigo-400 relative" />
            <p className="text-xs font-semibold text-slate-100 mt-2 relative">Need a hand?</p>
            <p className="text-[11px] text-slate-400 mt-0.5 relative leading-snug">
              Check the knowledge base for SOPs, refunds and troubleshooting guides.
            </p>
          </div>
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md ring-2 ring-indigo-500/30">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-100 truncate">{user?.full_name || 'Agent'}</p>
                <span className="text-[10px] text-indigo-400 font-medium capitalize">{user?.role || 'Support Agent'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};